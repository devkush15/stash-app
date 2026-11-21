import { createHash } from "node:crypto";
import { currentUser } from "./auth";
import { db } from "./db";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  console.error(
    "Request failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return json(
    { error: "Couldn’t complete this request. Please try again." },
    503,
  );
}
export function sameOrigin(request: Request) {
  try {
    const origin = request.headers.get("origin"),
      host = request.headers.get("host") || new URL(request.url).host;
    if (
      !origin ||
      new URL(origin).host !== host ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new Error();
  } catch {
    throw new HttpError(403, "Open Stash to make this request.");
  }
}
export async function readJson(
  request: Request,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Send JSON content.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 5000) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
}
export async function apiUser(request: Request) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in again.");
  await rateLimit(request, "api:" + user.id, 120, 60000);
  return user;
}
export async function rateLimit(
  request: Request,
  prefix: string,
  cap: number,
  ms: number,
) {
  const ip = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for") || "unknown"
    : "development";
  const key = prefix + ":" + createHash("sha256").update(ip).digest("hex");
  if (!(await db().limit(key, cap, ms)))
    throw new HttpError(429, "Too many requests. Please try again later.");
}
