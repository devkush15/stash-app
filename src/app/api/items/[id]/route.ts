import { db } from "@/lib/db";
import { apiError, apiUser, HttpError, json, sameOrigin } from "@/lib/http";
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
