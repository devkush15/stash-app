import type { SavedItem } from "./database.types";
import { keywordSearch } from "./search";
export type ViewOptions = {
  q: string;
  tags: string[];
  platform: string;
  category: string;
  sort: string;
};
export function filterLibrary(items: SavedItem[], options: ViewOptions) {
  const filtered = items.filter(
    (item) =>
      (options.platform === "all" || item.platform === options.platform) &&
      (!options.tags.length ||
        options.tags.some((tag) => item.tags.includes(tag))) &&
      (!options.category ||
        (options.category === "Uncategorized"
          ? !item.category
          : item.category === options.category)),
  );
  const results = options.q ? keywordSearch(filtered, options.q) : filtered;
  return [...results].sort((a, b) =>
    options.sort === "title"
      ? (a.title || a.original_url).localeCompare(b.title || b.original_url)
      : options.sort === "oldest"
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at),
  );
}
export function groupLibrary(items: SavedItem[], view: string) {
  if (view === "all") return [["All links", items]] as [string, SavedItem[]][];
  const groups = new Map<string, SavedItem[]>();
  for (const item of items) {
    const labels =
      view === "tags"
        ? item.tags.length
          ? [...new Set(item.tags)]
          : ["Uncategorized"]
        : [item.category || "Uncategorized"];
    for (const label of labels)
      groups.set(label, [...(groups.get(label) || []), item]);
  }
  return [...groups].sort((a, b) => a[0].localeCompare(b[0]));
}
