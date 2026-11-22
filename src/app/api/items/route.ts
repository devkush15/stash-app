import { db } from "@/lib/db";
import {
  parseLink,
  MAX_TITLE_LENGTH,
  MAX_NOTE_LENGTH,
  sources,
} from "@/lib/links";
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
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const tags = body.tags === undefined ? [] : body.tags;
    if (
      !Array.isArray(tags) ||
      tags.length > 8 ||
      !tags.every(
        (t) =>
          typeof t === "string" && t.trim().length > 0 && t.trim().length <= 40,
      )
    )
      throw new HttpError(400, "Choose up to 8 tags of 40 characters each.");
    const selectedTags = [
      ...new Set(tags.map((t: string) => t.trim().toLowerCase())),
    ] as string[];
    if (note.length > MAX_NOTE_LENGTH)
      throw new HttpError(
        400,
        "Keep the description to 1,000 characters or fewer.",
      );
    if (title.length > MAX_TITLE_LENGTH)
      throw new HttpError(400, "Keep the title to 200 characters or fewer.");
    const existing = await db().list(user.id);
    if (
      existing.some(
        (item) =>
          parseLink(item.original_url).normalized_url === link.normalized_url,
      )
    )
      throw new HttpError(409, "This link is already in your Stash.");
    if (existing.length >= 500)
      throw new HttpError(
        400,
        "This prototype supports up to 500 links per account.",
      );
    try {
      return json(
        {
          item: await db().save(
            user.id,
            link,
            title || null,
            note || null,
            selectedTags,
          ),
        },
        201,
      );
    } catch (error) {
      if (String(error).includes("UNIQUE"))
        throw new HttpError(409, "This link is already in your Stash.");
      throw error;
    }
  } catch (error) {
    return apiError(error);
  }
}
