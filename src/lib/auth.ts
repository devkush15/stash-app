import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { tokenHash } from "./passwords";
export const SESSION_COOKIE = "stash_session";
export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return db().session(tokenHash(token));
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return { user };
}
export async function beginSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 86400000);
  await db().createSession(userId, tokenHash(token), expires.toISOString());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}
