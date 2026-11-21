import { cookies } from "next/headers";
import { beginSession, SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, tokenHash, verifyPassword } from "@/lib/passwords";
import {
  apiError,
  HttpError,
  json,
  rateLimit,
  readJson,
  sameOrigin,
} from "@/lib/http";

export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    sameOrigin(request);
    const { action } = await params;
    if (action === "logout") {
      const store = await cookies(),
        token = store.get(SESSION_COOKIE)?.value;
      if (token) await db().logout(tokenHash(token));
      store.delete(SESSION_COOKIE);
      return json({ success: true });
    }
    if (action !== "login" && action !== "register")
      throw new HttpError(404, "Not found.");
    await rateLimit(
      request,
      "auth:" + action,
      action === "register" ? 10 : 30,
      3600000,
    );
    const body = await readJson(request);
    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-z0-9_.-]{3,30}$/.test(username))
      throw new HttpError(
        400,
        "Use 3–30 letters, numbers, dots, dashes, or underscores.",
      );
    if (password.length < 8 || password.length > 128)
      throw new HttpError(400, "Use a password with 8–128 characters.");
    let user;
    if (action === "register") {
      try {
        user = await db().register(username, await hashPassword(password));
      } catch (error) {
        if (String(error).includes("UNIQUE"))
          throw new HttpError(409, "That username is taken.");
        throw error;
      }
    } else {
      const found = await db().findUser(username);
      // Perform the same expensive password operation for unknown usernames.
      const valid = found
        ? await verifyPassword(password, found.password_hash)
        : (await hashPassword(password), false);
      if (!valid || !found)
        throw new HttpError(401, "Username or password is incorrect.");
      user = found;
    }
    await beginSession(user.id);
    return json(
      { user: { id: user.id, username: user.username } },
      action === "register" ? 201 : 200,
    );
  } catch (error) {
    return apiError(error);
  }
}
