import { db } from "@/lib/db";
import { isAiConfigured } from "@/lib/env";
import { originalLink } from "@/lib/links";
import { organize } from "@/lib/ai";
import { extractContent, type Extracted } from "@/lib/extract";
import { apiError, apiUser, HttpError, json, sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const user = await apiUser(request),
      { id } = await params,
      store = db();
    const owned = await store.get(user.id, id);
    if (!owned) throw new HttpError(404, "This link could not be found.");
    const item = await store.claimIndex(user.id, id);
    if (!item) return json({ item: owned });
    try {
      const publicContent: Extracted =
        item.metadata_level !== "none"
          ? {
              title: item.title_edited ? null : item.title,
              description: item.description,
              text: item.source_text || "",
              level: item.metadata_level,
            }
          : item.indexing_note && item.user_note
            ? { title: null, description: null, text: "", level: "none" }
            : await extractContent(originalLink(item), item.platform);
      const content: Extracted = {
        ...publicContent,
        title: item.title_edited ? item.title : publicContent.title,
        userNote: item.user_note || undefined,
        level:
          publicContent.level === "none" && item.user_note
            ? "metadata"
            : publicContent.level,
      };
      const metadata = {
        title: item.title_edited ? item.title : publicContent.title,
        description: publicContent.description,
        source_text: publicContent.text,
        metadata_level: publicContent.level,
      };
      await store.update(user.id, id, metadata);
      if (content.level === "none")
        return json({
          item: await store.update(user.id, id, {
            ...metadata,
            processing_status: "limited",
            indexing_note:
              "Content could not be accessed. Add a note to organize this link.",
          }),
        });
      if (!isAiConfigured())
        return json({
          item: await store.update(user.id, id, {
            ...metadata,
            processing_status: "deferred",
            indexing_note: "Public metadata saved. AI is not configured yet.",
          }),
        });
      if (!(await store.aiQuota(user.id, "save")))
        return json({
          item: await store.update(user.id, id, {
            ...metadata,
            processing_status: "deferred",
            indexing_note:
              "Daily AI limit reached. Metadata and link are saved.",
          }),
        });
      const organized = await organize(content);
      return json({
        item: await store.update(
          user.id,
          id,
          {
            ...metadata,
            ...organized,
            title: item.title_edited ? item.title : organized.title,
            tags: item.tags_edited ? item.tags : organized.tags,
            ai_processed_at: new Date().toISOString(),
            processing_status:
              content.level === "metadata" ? "limited" : "ready",
            indexing_note:
              content.level === "metadata"
                ? item.user_note
                  ? "Organized using your description and available metadata. Full content was not analyzed."
                  : "Only public metadata was available. Full content was not analyzed."
                : null,
          },
          true,
        ),
      });
    } catch (error) {
      const known = [
        "AI free capacity exhausted",
        "AI provider unavailable",
        "No AI response",
        "Invalid AI organization",
        "Invalid summary",
        "Invalid AI response",
        "AI input is too large",
      ];
      console.warn(
        "Link analysis failed:",
        error instanceof Error && known.includes(error.message)
          ? error.message
          : error instanceof Error
            ? error.name
            : "Unknown error",
      );
      return json({
        item: await store.update(user.id, id, {
          processing_status: "failed",
          indexing_note:
            "Analysis is unavailable. Your original link is saved; try again later.",
        }),
      });
    }
  } catch (error) {
    return apiError(error);
  }
}
