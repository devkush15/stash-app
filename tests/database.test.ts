import { createClient } from "@libsql/client";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { Store } from "../src/lib/store";
import { hashPassword, verifyPassword, tokenHash } from "../src/lib/passwords";
const directory = mkdtempSync(join(tmpdir(), "stash-db-test-"));
const url = `file:${join(directory, "test.db")}`;
let client = createClient({ url }),
  store = new Store(client);
let alice: string, bob: string, itemId: string;
beforeAll(async () => {
  alice = (await store.register("alice", "test-hash")).id;
  bob = (await store.register("bob", "test-hash")).id;
});
afterAll(() => {
  client.close();
  rmSync(directory, { recursive: true, force: true });
});
describe.sequential("Private persistent SQLite libraries", () => {
  it("prevents duplicate usernames regardless of case", async () => {
    await expect(store.register("ALICE", "hash")).rejects.toThrow(/UNIQUE/);
  });
  it("stores URLs and rejects duplicates only within an account", async () => {
    const link = {
      original_url: "https://example.org/recipe",
      normalized_url: "https://example.org/recipe",
      platform: "website",
    };
    const item = await store.save(alice, link, "Pasta");
    itemId = item.id;
    await expect(store.save(alice, link, null)).rejects.toThrow(/UNIQUE/);
    await expect(store.save(bob, link, null)).resolves.toBeDefined();
  });
  it("persists after closing and reopening the database", async () => {
    client.close();
    client = createClient({ url });
    store = new Store(client);
    expect((await store.get(alice, itemId))?.title).toBe("Pasta");
  });
  it("never reads, updates or deletes another user’s link by ID", async () => {
    expect(await store.get(bob, itemId)).toBeNull();
    expect(await store.update(bob, itemId, { title: "Stolen" })).toBeNull();
    expect(await store.delete(bob, itemId)).toBe(false);
    expect((await store.get(alice, itemId))?.title).toBe("Pasta");
  });
  it("stores AI metadata and prevents overlapping analysis", async () => {
    expect(await store.claimIndex(alice, itemId)).not.toBeNull();
    expect(await store.claimIndex(alice, itemId)).toBeNull();
    await store.update(alice, itemId, {
      summary: "A tomato pasta recipe.",
      category: "Recipes",
      tags: ["pasta", "cooking"],
      processing_status: "ready",
      ai_processed_at: new Date().toISOString(),
    });
    expect((await store.get(alice, itemId))?.tags).toEqual([
      "pasta",
      "cooking",
    ]);
    expect(await store.claimIndex(alice, itemId)).toBeNull();
  });
  it("verifies session expiry and server-side revocation", async () => {
    await store.createSession(
      alice,
      tokenHash("secret"),
      new Date(Date.now() + 60000).toISOString(),
    );
    expect((await store.session(tokenHash("secret")))?.id).toBe(alice);
    expect(await store.session("wrong")).toBeNull();
    await store.logout(tokenHash("secret"));
    expect(await store.session(tokenHash("secret"))).toBeNull();
    await store.createSession(alice, "expired", "2000-01-01T00:00:00.000Z");
    expect(await store.session("expired")).toBeNull();
  });
  it("enforces daily AI limits independently from keyword reads", async () => {
    for (let i = 0; i < 5; i++)
      expect(await store.aiQuota(alice, "save")).toBe(true);
    expect(await store.aiQuota(alice, "save")).toBe(false);
    expect((await store.list(alice)).length).toBe(1);
    for (let i = 0; i < 20; i++)
      expect(await store.aiQuota(alice, "search")).toBe(true);
    expect(await store.aiQuota(alice, "search")).toBe(false);
  });
  it("enforces the shared AI ceiling atomically", async () => {
    await client.execute(
      "INSERT INTO usage_counts(name,bucket,count) VALUES('ai:global',?,50) ON CONFLICT(name,bucket) DO UPDATE SET count=50",
      [new Date().toISOString().slice(0, 10)],
    );
    expect(await store.aiQuota(bob, "search")).toBe(false);
  });
  it("enforces basic persistent rate limiting", async () => {
    expect(await store.limit("login-test", 1, 60000)).toBe(true);
    expect(await store.limit("login-test", 1, 60000)).toBe(false);
  });
  it("deletes owned links persistently", async () => {
    expect(await store.delete(alice, itemId)).toBe(true);
    expect(await store.get(alice, itemId)).toBeNull();
  });
});
it("hashes passwords with independent salts and verifies securely", async () => {
  const a = await hashPassword("a-strong-password"),
    b = await hashPassword("a-strong-password");
  expect(a).not.toBe(b);
  expect(a).not.toContain("a-strong-password");
  expect(await verifyPassword("a-strong-password", a)).toBe(true);
  expect(await verifyPassword("wrong-password", a)).toBe(false);
  expect(await verifyPassword("x", "invalid")).toBe(false);
});
