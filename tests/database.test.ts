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
  it("blocks unchanged inaccessible re-analysis and enables it only after a changed description", async () => {
    const saved = await store.save(
      alice,
      {
        original_url: "https://www.instagram.com/reel/missing/",
        normalized_url: "https://www.instagram.com/reel/missing/",
        platform: "instagram",
      },
      null,
    );
    await store.update(alice, saved.id, {
      processing_status: "limited",
      indexing_note: "Content unavailable",
    });
    expect(await store.claimIndex(alice, saved.id)).toBeNull();
    expect(
      await store.edit(bob, saved.id, {
        title: "Stolen",
        note: "Stolen",
        tags: [],
      }),
    ).toBeNull();
    const edited = await store.edit(alice, saved.id, {
      title: "My recipe",
      note: "Tomato pasta with basil",
      tags: ["weeknight"],
    });
    expect(edited?.reanalyze).toBe(true);
    expect(edited?.item.title_edited).toBe(1);
    expect(edited?.item.tags_edited).toBe(1);
    expect((await store.get(alice, saved.id))?.user_note).toBe(
      "Tomato pasta with basil",
    );
    expect(await store.claimIndex(alice, saved.id)).not.toBeNull();
    await expect(
      store.edit(alice, saved.id, { title: "Busy", note: "Changed", tags: [] }),
    ).rejects.toThrow("ANALYSIS_BUSY");
    await store.update(alice, saved.id, {
      processing_status: "limited",
      ai_processed_at: new Date().toISOString(),
    });
    const titleOnly = await store.edit(alice, saved.id, {
      title: "Updated title",
      note: "Tomato pasta with basil",
      tags: ["weeknight"],
    });
    expect(titleOnly?.reanalyze).toBe(false);
    expect(await store.claimIndex(alice, saved.id)).toBeNull();
    await store.delete(alice, saved.id);
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
  it("keeps legacy WhatsApp links under Websites after removing that source segment", async () => {
    const saved = await store.save(
      alice,
      {
        original_url: "https://wa.me/12345",
        normalized_url: "https://wa.me/12345",
        platform: "whatsapp",
      },
      null,
    );
    expect(saved.platform).toBe("website");
    expect(
      (await store.list(alice, "website")).some(
        (item) => item.id === saved.id && item.platform === "website",
      ),
    ).toBe(true);
    await store.delete(alice, saved.id);
  });
  it("persists private custom tags and tag selections made while saving", async () => {
    expect(await store.addTag(alice, "pitch deck")).toContain("pitch deck");
    expect(await store.tagCatalog(bob)).not.toContain("pitch deck");
    const saved = await store.save(
      alice,
      {
        original_url: "https://example.com/pitch",
        normalized_url: "https://example.com/pitch",
        platform: "website",
      },
      null,
      null,
      ["pitch deck"],
    );
    expect(saved.tags).toEqual(["pitch deck"]);
    expect(saved.tags_edited).toBe(1);
    expect(await new Store(client).tagCatalog(alice)).toContain("pitch deck");
    expect(await new Store(client).customTags(alice)).toContain("pitch deck");
    expect(await store.customTags(bob)).not.toContain("pitch deck");
    await store.delete(alice, saved.id);
  });
  it("renames, merges and removes only this user's tags without deleting links or notes", async () => {
    await store.addTag(alice, "old tag");
    await store.addTag(alice, "new tag");
    const link = {
      original_url: "https://example.com/tag-change",
      normalized_url: "https://example.com/tag-change",
      platform: "website",
    };
    const own = await store.save(alice, link, null, "My retained note", [
      "old tag",
      "new tag",
    ]);
    const other = await store.save(bob, link, null, null, ["old tag"]);
    expect((await store.changeTag(alice, "old tag", "new tag")).affected).toBe(
      1,
    );
    expect((await store.get(alice, own.id))?.tags).toEqual(["new tag"]);
    expect((await store.get(bob, other.id))?.tags).toEqual(["old tag"]);
    await store.changeTag(alice, "new tag", null);
    expect((await store.get(alice, own.id))?.tags).toEqual([]);
    expect((await store.get(alice, own.id))?.user_note).toBe(
      "My retained note",
    );
    await store.update(
      alice,
      own.id,
      { tags: ["old tag"], title: "AI title" },
      true,
    );
    expect((await store.get(alice, own.id))?.tags).toEqual([]);
    await store.delete(alice, own.id);
    await store.delete(bob, other.id);
  });
  it("shows only user-created tags in navigation and persists user renames of AI labels", async () => {
    const saved = await store.save(
      alice,
      {
        original_url: "https://example.com/ai-label",
        normalized_url: "https://example.com/ai-label",
        platform: "website",
      },
      null,
    );
    await store.update(alice, saved.id, { tags: ["generated label"] });
    expect(await store.tagCatalog(alice)).toContain("generated label");
    expect(await store.customTags(alice)).not.toContain("generated label");
    await store.changeTag(alice, "generated label", "my research");
    expect(await new Store(client).customTags(alice)).toContain("my research");
    expect(await store.customTags(bob)).not.toContain("my research");
    await store.changeTag(alice, "my research", null);
    expect(await store.customTags(alice)).not.toContain("my research");
    expect(await store.get(alice, saved.id)).not.toBeNull();
    await store.delete(alice, saved.id);
  });
  it("preserves manually assigned tags from earlier captures in private navigation", async () => {
    const saved = await store.save(
      alice,
      {
        original_url: "https://example.com/legacy-manual-tag",
        normalized_url: "https://example.com/legacy-manual-tag",
        platform: "website",
      },
      null,
      null,
      ["my existing collection"],
    );
    expect(await new Store(client).customTags(alice)).toContain(
      "my existing collection",
    );
    expect(await store.customTags(bob)).not.toContain("my existing collection");
    await store.delete(alice, saved.id);
  });
});

it("upgrades existing saved links once without losing their original URLs or custom titles", async () => {
  const legacy = createClient({ url: `file:${join(directory, "legacy.db")}` });
  try {
    await legacy.batch(
      [
        "CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT UNIQUE,password_hash TEXT)",
        "INSERT INTO users VALUES('owner','legacy','hash')",
        `CREATE TABLE saved_items(id TEXT PRIMARY KEY,user_id TEXT,original_url TEXT,normalized_url TEXT,platform TEXT,title TEXT,description TEXT,summary TEXT,category TEXT,tags TEXT DEFAULT '[]',source_text TEXT,metadata_level TEXT DEFAULT 'none',indexing_note TEXT,processing_status TEXT DEFAULT 'limited',processing_started_at TEXT,ai_processed_at TEXT,created_at TEXT,updated_at TEXT,UNIQUE(user_id,normalized_url))`,
        "INSERT INTO saved_items(id,user_id,original_url,normalized_url,platform,title) VALUES('legacy','owner','https://instagram.com/reels/abc/?igsh=old','https://instagram.com/reels/abc/','instagram','My original title')",
      ],
      "write",
    );
    const upgraded = new Store(legacy);
    const item = await upgraded.get("owner", "legacy");
    expect(item?.original_url).toContain("igsh=old");
    expect(item?.title).toBe("My original title");
    expect(item?.user_note).toBeNull();
    expect(item?.title_edited).toBe(1);
    expect(item?.processing_status).toBe("pending");
    await upgraded.update("owner", "legacy", { processing_status: "limited" });
    expect(
      (await new Store(legacy).get("owner", "legacy"))?.processing_status,
    ).toBe("limited");
  } finally {
    legacy.close();
  }
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
