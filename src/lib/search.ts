import type { SavedItem } from "./database.types";
const stop = new Set(
  "a an and are as at be by can could find for from give i in is it me my of on please saved show some that the these this to video videos want was with you about article articles link links".split(
    " ",
  ),
);
const normalize = (text: string) => text.toLowerCase().normalize("NFKC");
export function queryTerms(query: string) {
  return [...new Set(normalize(query).match(/[\p{L}\p{N}]{2,}/gu) || [])]
    .filter((t) => !stop.has(t))
    .slice(0, 16);
}
export function keywordSearch(items: SavedItem[], query: string) {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  return items
    .map((item) => {
      const title = normalize(item.title || ""),
        tags = normalize(item.tags.join(" ") + " " + (item.category || ""));
      const body = normalize(
        (item.summary || "") +
          " " +
          (item.description || "") +
          " " +
          (item.user_note || "") +
          " " +
          (item.source_text || "") +
          " " +
          item.original_url,
      );
      const score = terms.reduce(
        (sum, t) =>
          sum +
          (title.includes(t) ? 5 : 0) +
          (tags.includes(t) ? 4 : 0) +
          (body.includes(t) ? 1 : 0),
        0,
      );
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}
