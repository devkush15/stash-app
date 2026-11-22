import { db } from "@/lib/db";
import { answerFromEvidence, retrieveEvidence } from "@/lib/ask";
import { keywordSearch } from "@/lib/search";
import { isAiConfigured } from "@/lib/env";
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
    const question =
      typeof body.question === "string" ? body.question.trim() : "";
    if (!question || question.length > 500)
      throw new HttpError(400, "Ask a question with 1–500 characters.");
    const items = await db().list(user.id);
    if (!items.length)
      return json({
        mode: "empty",
        claims: [],
        sources: [],
        note: "Save a link or add a note before asking Stash.",
      });
    const matches = keywordSearch(items, question).slice(0, 6);
    const fallback = (note: string) =>
      json({ mode: "sources", claims: [], sources: matches, note });
    if (!isAiConfigured())
      return fallback("AI is unavailable. Here are matching saved sources.");
    if (!(await db().aiQuota(user.id, "search")))
      return fallback(
        "Daily Ask limit reached. Library search is still available.",
      );
    try {
      const evidence = retrieveEvidence(items, question);
      const claims = await answerFromEvidence(question, evidence);
      const ids = new Set(claims.map((claim) => claim.sourceId));
      const sources = items.filter((item) => ids.has(item.id));
      return json({
        mode: "answer",
        claims,
        sources,
        note: claims.length
          ? "Based on your saved text and notes. Unavailable media contents are not included."
          : "I couldn’t find enough saved information to answer that. Try a different question or add a note.",
      });
    } catch {
      return fallback(
        "AI is unavailable right now. Your matching saved sources are still here.",
      );
    }
  } catch (error) {
    return apiError(error);
  }
}
