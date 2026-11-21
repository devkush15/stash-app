import { db } from "@/lib/db";
import { parseLink, MAX_TITLE_LENGTH, sources } from "@/lib/links";
import {
  apiError,
  apiUser,
  HttpError,
  json,
  readJson,
  sameOrigin,
} from "@/lib/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await apiUser(request);
    const source = new URL(request.url).searchParams.get("source") || "all";
    if (!sources.some((s) => s.value === source))
      throw new HttpError(400, "Invalid source.");
    return json({ items: await db().list(user.id, source) });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await apiUser(request),
      body = await readJson(request);
    let link;
    try {
      link = parseLink(body.url);
    } catch (error) {
      throw new HttpError(
        400,
        error instanceof Error ? error.message : "Enter a valid URL.",
      );
    }
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length > MAX_TITLE_LENGTH)
      throw new HttpError(400, "Keep the title to 200 characters or fewer.");
    if ((await db().list(user.id)).length >= 500)
      throw new HttpError(
        400,
        "This prototype supports up to 500 links per account.",
      );
    try {
      return json({ item: await db().save(user.id, link, title || null) }, 201);
    } catch (error) {
      if (String(error).includes("UNIQUE"))
        throw new HttpError(409, "This link is already in your Stash.");
      throw error;
    }
  } catch (error) {
    return apiError(error);
  }
}
