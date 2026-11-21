// Small, idempotent SQLite schema; used by the app, setup command and tests.
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS saved_items (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL, normalized_url TEXT NOT NULL, platform TEXT NOT NULL,
    title TEXT, description TEXT, summary TEXT, category TEXT, tags TEXT NOT NULL DEFAULT '[]',
    source_text TEXT, metadata_level TEXT NOT NULL DEFAULT 'none', indexing_note TEXT,
    processing_status TEXT NOT NULL DEFAULT 'pending', processing_started_at TEXT, ai_processed_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(user_id,normalized_url)
  )`,
  `CREATE INDEX IF NOT EXISTS items_owner_created_idx ON saved_items(user_id,created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS usage_counts (name TEXT NOT NULL,bucket TEXT NOT NULL,count INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(name,bucket))`,
];
