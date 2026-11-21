import { db } from "@/lib/db";
import { isAiConfigured } from "@/lib/env";
import { organize } from "@/lib/ai";
import { extractContent } from "@/lib/extract";
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
      const content = await extractContent(item.original_url, item.platform);
      const metadata = {
        title: item.title || content.title,
        description: content.description,
        source_text: content.text,
        metadata_level: content.level,
      };
      await store.update(user.id, id, metadata);
      if (content.level === "none")
        return json({
          item: await store.update(user.id, id, {
            ...metadata,
            processing_status: "limited",
            indexing_note:
              "Content could not be accessed. The original link is saved.",
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
        item: await store.update(user.id, id, {
          ...metadata,
          ...organized,
          title: item.title || organized.title,
          ai_processed_at: new Date().toISOString(),
          processing_status: content.level === "metadata" ? "limited" : "ready",
          indexing_note:
            content.level === "metadata"
              ? "Only public metadata was available. Full content was not analyzed."
              : null,
        }),
      });
    } catch {
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
