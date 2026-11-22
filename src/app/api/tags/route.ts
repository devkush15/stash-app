import { db } from "@/lib/db";
import {
  apiError,
  apiUser,
  HttpError,
  json,
  readJson,
  sameOrigin,
} from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await apiUser(request),
      body = await readJson(request);
    const tag =
      typeof body.tag === "string"
        ? body.tag.trim().toLowerCase().replace(/\s+/g, " ")
        : "";
    if (!tag || tag.length > 40)
      throw new HttpError(400, "Use a tag with 1–40 characters.");
    try {
      return json({ tags: await db().addTag(user.id, tag) });
    } catch (error) {
      if (String(error).includes("TAG_LIMIT"))
        throw new HttpError(400, "You can create up to 32 custom tags.");
      throw error;
    }
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  return change(request, false);
}
export async function DELETE(request: Request) {
  return change(request, true);
}
async function change(request: Request, remove: boolean) {
  try {
    sameOrigin(request);
    const user = await apiUser(request),
      body = await readJson(request);
    const from =
      typeof body.from === "string" ? body.from.trim().toLowerCase() : "";
    const to = remove
      ? null
      : typeof body.to === "string"
        ? body.to.trim().toLowerCase().replace(/\s+/g, " ")
        : "";
    if (!from || from.length > 40 || (!remove && (!to || to.length > 40)))
      throw new HttpError(400, "Use a tag with 1–40 characters.");
    const result = await db().changeTag(user.id, from, to);
    return json({ ...result, tags: await db().tagCatalog(user.id) });
  } catch (error) {
    return apiError(error);
  }
}
