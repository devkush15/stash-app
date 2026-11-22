import type { Client } from "@libsql/client";
// Small, idempotent SQLite schema; used by the app, setup command and tests.
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, custom_tags TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS saved_items (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL, normalized_url TEXT NOT NULL, platform TEXT NOT NULL,
    title TEXT, description TEXT, user_note TEXT, title_edited INTEGER NOT NULL DEFAULT 0,
    tags_edited INTEGER NOT NULL DEFAULT 0, summary TEXT, category TEXT, tags TEXT NOT NULL DEFAULT '[]',
    source_text TEXT, metadata_level TEXT NOT NULL DEFAULT 'none', indexing_note TEXT,
    processing_status TEXT NOT NULL DEFAULT 'pending', processing_started_at TEXT, ai_processed_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(user_id,normalized_url)
  )`,
  `CREATE INDEX IF NOT EXISTS items_owner_created_idx ON saved_items(user_id,created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS usage_counts (name TEXT NOT NULL,bucket TEXT NOT NULL,count INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(name,bucket))`,
];

export async function ensureSchema(client: Client) {
  await client.batch([...SCHEMA], "write");
  const tx = await client.transaction("write");
  try {
    const userColumns = (await tx.execute("PRAGMA table_info(users)")).rows;
    if (!userColumns.some((row) => row.name === "custom_tags"))
      await tx.execute(
        "ALTER TABLE users ADD COLUMN custom_tags TEXT NOT NULL DEFAULT '[]'",
      );
    const columns = new Set(
      (await tx.execute("PRAGMA table_info(saved_items)")).rows.map((row) =>
        String(row.name),
      ),
    );
    for (const [name, definition] of Object.entries({
      user_note: "TEXT",
      // Keep existing custom titles while upgrading the original prototype.
      title_edited: "INTEGER NOT NULL DEFAULT 1",
      tags_edited: "INTEGER NOT NULL DEFAULT 0",
    })) {
      if (!columns.has(name))
        await tx.execute(
          `ALTER TABLE saved_items ADD COLUMN ${name} ${definition}`,
        );
    }
    if (!columns.has("user_note")) {
      // One new attempt with the corrected extractor; never repeated on refresh.
      await tx.execute(
        "UPDATE saved_items SET processing_status='pending',ai_processed_at=NULL,metadata_level='none',description=NULL,source_text=NULL,indexing_note=NULL,title_edited=CASE WHEN title IS NULL OR lower(title) IN ('instagram','instagram post','instagram reel') THEN 0 ELSE title_edited END WHERE platform='instagram'",
      );
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}
