import "server-only";
import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { Store } from "./store";
let instance: Store | undefined;
export function db() {
  if (instance) return instance;
  const url = process.env.TURSO_DATABASE_URL;
  if (
    process.env.VERCEL &&
    (!url || !/^libsql:\/\//.test(url) || !process.env.TURSO_AUTH_TOKEN)
  )
    throw new Error("Hosted database is not configured");
  if (!process.env.VERCEL) mkdirSync(".data", { recursive: true });
  instance = new Store(
    createClient({
      url: url || "file:.data/stash.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
  );
  return instance;
}
