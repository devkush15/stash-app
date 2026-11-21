import type { Platform } from "./database.types";

export const MAX_URL_LENGTH = 2048;
export const MAX_TITLE_LENGTH = 200;
export const PAGE_SIZE = 24;
export const sources: { value: Platform | "all"; label: string }[] = [
  { value: "all", label: "All links" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X / Twitter" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "website", label: "Websites" },
];

function matchesHost(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function detectPlatform(host: string): Platform {
  host = host.toLowerCase();
  if (["youtube.com", "youtu.be", "youtube-nocookie.com"].some((d) => matchesHost(host, d))) return "youtube";
  if (matchesHost(host, "instagram.com")) return "instagram";
  if (["x.com", "twitter.com"].some((d) => matchesHost(host, d))) return "x";
  if (["whatsapp.com", "wa.me"].some((d) => matchesHost(host, d))) return "whatsapp";
  return "website";
}

export function parseLink(input: unknown) {
  if (typeof input !== "string" || input.trim().length > MAX_URL_LENGTH) throw new Error("Use a URL with 2,048 characters or fewer.");
  const original = input.trim();
  if (!/^https?:\/\//i.test(original) || /[\s\\\u0000-\u001f\u007f]/.test(original)) throw new Error("Enter a complete http:// or https:// URL.");
  let url: URL;
  try { url = new URL(original); } catch { throw new Error("That URL doesn’t look right. Check it and try again."); }
  if (url.username || url.password) throw new Error("Use a link without an embedded username or password.");
  if (!url.hostname || (!url.hostname.includes(".") && !url.hostname.includes(":"))) throw new Error("Enter a complete website address.");

  // Remove only known tracking parameters. Keep meaningful query values, path case,
  // trailing slashes and fragments: they can identify distinct content (e.g. SPAs).
  // This never fetches or resolves the supplied URL.
  const normalized = new URL(url.href);
  for (const key of [...normalized.searchParams.keys()]) {
    if (/^utm_/i.test(key) || /^(fbclid|gclid|igshid|igsh)$/i.test(key)) normalized.searchParams.delete(key);
  }
  normalized.searchParams.sort();
  // Common YouTube sharing URLs should deduplicate with their watch-page URL.
  if (matchesHost(normalized.hostname, "youtu.be") && /^\/[\w-]{11}$/.test(normalized.pathname)) {
    const id = normalized.pathname.slice(1);
    normalized.hostname = "www.youtube.com";
    normalized.pathname = "/watch";
    normalized.searchParams.set("v", id);
    normalized.searchParams.sort();
  }
  if (normalized.href.length > MAX_URL_LENGTH) throw new Error("That URL is too long after normalization.");
  return { original_url: url.href, normalized_url: normalized.href, platform: detectPlatform(url.hostname) };
}

export function displayUrl(input: string) {
  try { const url = new URL(input); return `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}${url.search}${url.hash}`; }
  catch { return input; }
}

export function linkTitle(item: { title: string | null; original_url: string }) {
  return item.title?.trim() || displayUrl(item.original_url);
}

export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function libraryParams(params: Record<string, string | string[] | undefined>) {
  const single = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
  const q = single(params.q).trim().slice(0, 200);
  const source = single(params.source);
  const platform = sources.some((s) => s.value === source) ? source as Platform | "all" : "all";
  const rawPage = Number(single(params.page));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10000) : 1;
  return { q, platform, page };
}

export function libraryHref(q: string, platform: string, page = 1) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (platform !== "all") params.set("source", platform);
  if (page > 1) params.set("page", String(page));
  return `/library${params.size ? `?${params}` : ""}`;
}
