import { describe, expect, it } from "vitest";
import {
  detectPlatform,
  displayUrl,
  escapeLike,
  libraryHref,
  libraryParams,
  linkTitle,
  parseLink,
} from "../src/lib/links";

describe("URL validation and normalization", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,hello",
    "file:///etc/passwd",
    "ftp://example.com",
    "example.com",
    "https://",
    "https://exa mple.com",
    "https://user:password@example.com",
    "https://example.com\\@evil.com",
    "https://example.com/\nfoo",
    "https://localhost",
  ])("rejects %s", (url) => expect(() => parseLink(url)).toThrow());
  it("rejects missing and excessively long input", () => {
    expect(() => parseLink(null)).toThrow();
    expect(() =>
      parseLink(`https://example.com/${"a".repeat(2048)}`),
    ).toThrow();
  });
  it("canonicalizes host and default port, removes tracking, and preserves the original destination", () => {
    const link = parseLink(
      " HTTPS://EXAMPLE.COM:443/article?utm_source=feed&b=2&a=1#section ",
    );
    expect(link.normalized_url).toBe(
      "https://example.com/article?a=1&b=2#section",
    );
    expect(link.original_url).toContain("utm_source=feed");
  });
  it("deduplicates query parameter order", () =>
    expect(parseLink("https://example.com/?b=2&a=1").normalized_url).toBe(
      parseLink("https://example.com/?a=1&b=2").normalized_url,
    ));
  it("preserves meaningful fragments, paths, query values, and slashes", () => {
    expect(
      parseLink("https://example.com/Article/?id=20#/view/1").normalized_url,
    ).toBe("https://example.com/Article/?id=20#/view/1");
  });
  it("accepts international addresses safely", () =>
    expect(parseLink("https://例え.jp/日本").original_url).toMatch(
      /^https:\/\/xn--/,
    ));
  it("deduplicates YouTube short links", () =>
    expect(parseLink("https://youtu.be/dQw4w9WgXcQ").normalized_url).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ));
  it.each([
    ["www.youtube.com", "youtube"],
    ["m.youtube.com", "youtube"],
    ["youtu.be", "youtube"],
    ["instagram.com", "instagram"],
    ["mobile.twitter.com", "x"],
    ["x.com", "x"],
    ["wa.me", "website"],
    ["web.whatsapp.com", "website"],
    ["youtube.com.evil.test", "website"],
    ["notinstagram.com", "website"],
  ])("detects %s without spoofable substring checks", (host, platform) =>
    expect(detectPlatform(host)).toBe(platform),
  );
});

describe("Search and pagination", () => {
  it("defaults to tag sections and preserves an explicit ungrouped view", () => {
    expect(libraryParams({}).view).toBe("tags");
    expect(libraryHref("", "all", 1, [], { view: "all" })).toBe(
      "/library?view=all",
    );
    expect(libraryParams({ view: "all" }).view).toBe("all");
    expect(libraryHref("", "all", 1, [], { view: "tags" })).toBe("/library");
  });
  it("escapes SQL pattern characters as literal search text", () =>
    expect(escapeLike("100%_\\done,(title)='x'")).toBe(
      "100\\%\\_\\\\done,(title)='x'",
    ));
  it("validates page and source query parameters", () => {
    expect(
      libraryParams({ page: "-1", source: "unknown", q: "  saved  " }),
    ).toMatchObject({ page: 1, platform: "all", q: "saved", tag: "" });
    expect(libraryParams({ page: "Infinity", q: ["one", "two"] }).page).toBe(1);
    expect(libraryParams({ page: "1.5" }).page).toBe(1);
    expect(libraryParams({ q: "a".repeat(201) }).q).toHaveLength(200);
  });
  it("preserves search/filter in pagination links", () =>
    expect(libraryHref("a & b", "youtube", 2)).toBe(
      "/library?q=a+%26+b&source=youtube&page=2",
    ));
  it("uses only supplied titles and URLs for display", () => {
    expect(
      linkTitle({ title: null, original_url: "https://www.example.com/notes" }),
    ).toBe("example.com");
    expect(displayUrl("https://example.com/?id=1#page")).toBe(
      "example.com?id=1#page",
    );
    expect(
      linkTitle({ title: "My title", original_url: "https://example.com" }),
    ).toBe("My title");
  });
});

describe("Instagram permalinks", () => {
  it.each([
    "https://instagram.com/reels/DgBKi6_oSbx/?utm_source=ig_web_copy_link&igsh=abc#tracking",
    "http://m.instagram.com/reel/DgBKi6_oSbx",
    "https://www.instagram.com/food.recipes.daily/reel/DgBKi6_oSbx/",
  ])("canonicalizes %s without losing its shortcode", (url) => {
    const link = parseLink(url);
    expect(link.normalized_url).toBe(
      "https://www.instagram.com/reel/DgBKi6_oSbx/",
    );
    expect(link.original_url).toBe(link.normalized_url);
  });
  it("uses compact post and Reel fallbacks, including old tracked saves", () => {
    expect(
      linkTitle({
        title: null,
        original_url: "https://www.instagram.com/p/abc/?utm_source=test",
      }),
    ).toBe("Instagram post");
    expect(
      linkTitle({
        title: "https://www.instagram.com/reels/abc/?igsh=long",
        original_url: "https://www.instagram.com/reels/abc/?igsh=long",
      }),
    ).toBe("Instagram Reel");
    expect(
      linkTitle({
        title: "My pasta idea",
        original_url: "https://www.instagram.com/reel/abc/",
      }),
    ).toBe("My pasta idea");
  });
});
