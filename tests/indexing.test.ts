import { describe, it, expect } from "vitest";
import {
  fetchableUrl,
  publicAddress,
  parseHtml,
  parseInstagramHtml,
} from "../src/lib/extract";
import { organizationResult, rankedResults } from "../src/lib/ai";
import { keywordSearch } from "../src/lib/search";
import type { SavedItem } from "../src/lib/database.types";
const base = {
  id: "saved-one",
  title: "Tomato pasta recipe",
  tags: ["cooking", "pasta"],
  category: "Recipes",
  summary: "Cook spaghetti with tomato sauce.",
  description: null,
  source_text: null,
  original_url: "https://example.com/pasta",
} as SavedItem;
describe("Bounded public extraction", () => {
  it("reads Instagram public metadata without indexing the page shell or pretending to view video", () => {
    const data = parseInstagramHtml(
      '<meta property="og:title" content="Creator on Instagram: &quot;Tomato pasta&quot;"><meta property="og:description" content="A caption excerpt about tomato pasta"><body>Login navigation and video player text</body>',
    );
    expect(data).toEqual({
      title: "Tomato pasta",
      description: "A caption excerpt about tomato pasta",
      text: "",
      level: "metadata",
    });
    expect(
      parseInstagramHtml(
        "<title>Instagram</title><body>Lots of login shell text</body>",
      ).level,
    ).toBe("none");
    expect(
      parseInstagramHtml(
        '<meta property="og:title" content="Instagram"><meta property="og:description" content="Log in to see photos and videos">',
      ).level,
    ).toBe("none");
  });
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "0.0.0.0",
    "224.0.0.1",
  ])("rejects private/reserved address %s", (address) =>
    expect(publicAddress(address)).toBe(false),
  );
  it("permits publicly routed addresses", () =>
    expect(publicAddress("1.1.1.1")).toBe(true));
  it.each([
    "http://localhost/",
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://2130706433/",
    "https://example.com:8443/",
    "https://user:pass@example.com/",
    "file:///etc/passwd",
    "https://service.internal/",
  ])("rejects fetch destination %s", (url) =>
    expect(() => fetchableUrl(url)).toThrow(),
  );
  it("extracts public title/text and strips scripts/forms/navigation", () => {
    const result = parseHtml(
      '<html><title>Pasta guide</title><meta name="description" content="Simple pasta"><body><nav>Ignore navigation</nav><article>' +
        "Cook pasta with tomatoes. ".repeat(20) +
        "</article><script>secret script</script><form>Password</form></body></html>",
    );
    expect(result.title).toBe("Pasta guide");
    expect(result.level).toBe("text");
    expect(result.text).not.toMatch(/script|Password|navigation/);
  });
  it("does not index challenge or login pages as content", () =>
    expect(
      parseHtml(
        "<title>Just a moment...</title><body>Verify you are human</body>",
      ).level,
    ).toBe("none"));
});
describe("Honest organization and search", () => {
  it("never accepts a summary of unseen video contents", () => {
    const result = organizationResult(
      {
        title: "Video title",
        category: "Cooking",
        tags: ["pasta"],
        summary: "Invented full video summary",
      },
      {
        title: "Video title",
        description: "By author",
        text: "",
        level: "metadata",
      },
    );
    expect(result.summary).toBeNull();
  });
  it("rejects malformed AI output", () =>
    expect(() =>
      organizationResult(
        { title: 7 },
        { title: null, description: null, text: "", level: "text" },
      ),
    ).toThrow());
  it("filters fabricated and repeated IDs from AI search output", () => {
    expect(
      rankedResults(
        {
          matches: [
            { id: "another-users-id", score: 1 },
            { id: "saved-one", score: 0.9 },
            { id: "saved-one", score: 0.8 },
          ],
        },
        [base],
      ),
    ).toEqual([base]);
  });
  it("finds natural query keywords in stored metadata with no AI", () => {
    expect(keywordSearch([base], "Find the pasta recipe I saved.")).toEqual([
      base,
    ]);
    expect(keywordSearch([base], "That article about AI startups")).toEqual([]);
  });
  it("searches user descriptions even when the original content is inaccessible", () => {
    expect(
      keywordSearch(
        [
          {
            ...base,
            title: "Instagram Reel",
            summary: null,
            tags: [],
            category: null,
            source_text: null,
            user_note: "A quick tomato pasta recipe with basil",
          },
        ],
        "Find the basil recipe I saved.",
      ),
    ).toHaveLength(1);
  });
});
