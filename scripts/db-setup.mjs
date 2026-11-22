import { createClient } from "@libsql/client";
import { ensureSchema } from "../src/lib/schema.ts";
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN)
  throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local.");
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
await ensureSchema(client);
client.close();
console.log("Stash SQLite schema is ready.");
