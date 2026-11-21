import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

// Real Postgres execution in WASM: the auth schema below emulates only Supabase's
// auth.uid() boundary. This verifies SQL/RLS, not hosted Auth or the Data API.
const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
let aliceItem: string;

async function asUser(id: string) {
  await db.exec("reset role; set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
}
async function insert(url: string, owner: string, title = "A useful article") {
  return db.query<{ id: string }>("insert into public.saved_items (user_id, original_url, normalized_url, platform, title) values ($1, $2, $2, 'website', $3) returning id", [owner, url, title]);
}

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;
    insert into auth.users values ('${alice}'), ('${bob}');`);
  for (const file of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
});
afterAll(async () => { await db.close(); });

describe.sequential("Owner RLS and persisted schema", () => {
  it("lets Alice save and read a real URL with saved status", async () => {
    await asUser(alice);
    const result = await insert("https://example.org/rls-test", alice);
    aliceItem = result.rows[0].id;
    const { rows } = await db.query<{ processing_status: string }>("select * from public.saved_items");
    expect(rows).toHaveLength(1);
    expect(rows[0].processing_status).toBe("saved");
  });
  it("blocks inserts attributed to another user", async () => {
    await asUser(alice);
    await expect(insert("https://example.org/spoof", bob)).rejects.toThrow(/row-level security/i);
  });
  it("enforces owner-scoped duplicate prevention at database level", async () => {
    await asUser(alice);
    await expect(insert("https://example.org/rls-test", alice)).rejects.toThrow(/unique constraint/i);
    await asUser(bob);
    await expect(insert("https://example.org/rls-test", bob)).resolves.toBeDefined();
  });
  it("hides Alice's row from Bob including direct ID lookup", async () => {
    await asUser(bob);
    expect((await db.query("select * from public.saved_items where id = $1", [aliceItem])).rows).toEqual([]);
    const own = await db.query<{ user_id: string }>("select user_id from public.saved_items");
    expect(own.rows).toHaveLength(1);
    expect(own.rows[0].user_id).toBe(bob);
  });
  it("prevents Bob updating or deleting Alice's row", async () => {
    await asUser(bob);
    expect((await db.query("update public.saved_items set title = 'Stolen' where id = $1 returning id", [aliceItem])).rows).toEqual([]);
    expect((await db.query("delete from public.saved_items where id = $1 returning id", [aliceItem])).rows).toEqual([]);
  });
  it("prevents owner reassignment via direct update", async () => {
    await asUser(alice);
    await expect(db.query("update public.saved_items set user_id = $1 where id = $2", [bob, aliceItem])).rejects.toThrow(/row-level security/i);
  });
  it("searches generated title and URL text, respecting RLS", async () => {
    await asUser(alice);
    expect((await db.query("select id from public.saved_items where search_document ilike '%useful%' ")).rows).toHaveLength(1);
    expect((await db.query("select id from public.saved_items where search_document ilike '%rls-test%' ")).rows).toHaveLength(1);
    expect((await db.query("select id from public.saved_items where search_document ilike '%missing%' ")).rows).toHaveLength(0);
  });
  it("enforces URL, title, and processing state constraints", async () => {
    await asUser(alice);
    await expect(insert("javascript:alert(1)", alice)).rejects.toThrow(/check constraint/);
    await expect(insert("https://example.org/long-title", alice, "x".repeat(201))).rejects.toThrow(/check constraint/);
    await expect(db.query("update public.saved_items set processing_status = 'made_up' where id = $1", [aliceItem])).rejects.toThrow(/check constraint/);
  });
  it("updates owned items and generated search text", async () => {
    await asUser(alice);
    const result = await db.query<{ search_document: string }>("update public.saved_items set title = 'New title' where id = $1 returning search_document", [aliceItem]);
    expect(result.rows[0].search_document).toContain("New title");
  });
  it("denies anonymous direct read/write access", async () => {
    await db.exec("reset role; set role anon;");
    await expect(db.query("select * from public.saved_items")).rejects.toThrow(/permission denied/);
    await expect(insert("https://example.org/anonymous", alice)).rejects.toThrow(/permission denied/);
  });
  it("lets the owner delete and verifies deletion persists", async () => {
    await asUser(alice);
    expect((await db.query("delete from public.saved_items where id = $1 returning id", [aliceItem])).rows).toHaveLength(1);
    expect((await db.query("select * from public.saved_items where id = $1", [aliceItem])).rows).toEqual([]);
  });
});
