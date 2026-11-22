import { db } from "@/lib/db";
import {
  apiError,
  apiUser,
  HttpError,
  json,
  sameOrigin,
  readJson,
} from "@/lib/http";
import { MAX_NOTE_LENGTH, MAX_TITLE_LENGTH } from "@/lib/links";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const user = await apiUser(request),
      { id } = await params,
      body = await readJson(request);
    if (
      typeof body.title !== "string" ||
      typeof body.note !== "string" ||
      !Array.isArray(body.tags) ||
      !body.tags.every((t) => typeof t === "string")
    )
      throw new HttpError(400, "Enter a title, description, and tags.");
    const title = body.title.trim(),
      note = body.note.trim();
    const tags = [
      ...new Set(
        body.tags
          .map((tag: string) => tag.trim().toLowerCase())
          .filter(Boolean),
      ),
    ] as string[];
    if (
      title.length > MAX_TITLE_LENGTH ||
      note.length > MAX_NOTE_LENGTH ||
      tags.length > 8 ||
      tags.some((t) => t.length > 40)
    )
      throw new HttpError(
        400,
        "Use a title up to 200 characters, a description up to 1,000, and up to 8 tags of 40 characters.",
      );
    let result;
    try {
      result = await db().edit(user.id, id, {
        title: title || null,
        note: note || null,
        tags,
      });
    } catch (error) {
      if (String(error).includes("ANALYSIS_BUSY"))
        throw new HttpError(
          409,
          "Analysis is finishing. Try editing again in a moment.",
        );
      throw error;
    }
    if (!result) throw new HttpError(404, "This link could not be found.");
    return json(result);
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const user = await apiUser(request);
    const { id } = await params;
    if (!(await db().delete(user.id, id)))
      throw new HttpError(404, "This link could not be found.");
    return json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
