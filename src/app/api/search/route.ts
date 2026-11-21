import { db } from "@/lib/db";
import { semanticSearch } from "@/lib/ai";
import { isAiConfigured } from "@/lib/env";
import { keywordSearch } from "@/lib/search";
import { sources } from "@/lib/links";
import {
  apiError,
  apiUser,
  HttpError,
  json,
  readJson,
  sameOrigin,
} from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 40;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await apiUser(request),
      body = await readJson(request);
    const query = typeof body.q === "string" ? body.q.trim().slice(0, 200) : "",
      platform = typeof body.source === "string" ? body.source : "all";
    if (!query || !sources.some((s) => s.value === platform))
      throw new HttpError(400, "Enter a search query.");
    const all = await db().list(user.id, platform),
      keyword = keywordSearch(all, query);
    let note = "Keyword results";
    if (!all.length) return json({ items: [], mode: "keyword", note });
    if (body.mode !== "keyword" && isAiConfigured()) {
      if (await db().aiQuota(user.id, "search")) {
        try {
          const candidates = [
            ...keyword,
            ...all.filter((i) => !keyword.some((k) => k.id === i.id)),
          ];
          return json({
            items: await semanticSearch(query, candidates),
            mode: "ai",
            note: "AI search",
          });
        } catch {
          note = "Keyword results · AI is unavailable right now";
        }
      } else note = "Keyword results · Daily AI limit reached";
    } else if (!isAiConfigured())
      note = "Keyword results · AI is not configured";
    return json({ items: keyword, mode: "keyword", note });
  } catch (error) {
    return apiError(error);
  }
}
