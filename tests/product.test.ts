import { describe, it, expect } from "vitest";
import { filterLibrary, groupLibrary } from "../src/lib/library-view";
import { retrieveEvidence, validatedClaims } from "../src/lib/ask";
import type { SavedItem } from "../src/lib/database.types";
const one = {
  id: "one",
  title: "Seed funding guide",
  original_url: "https://example.org/seed",
  tags: ["funding", "startups"],
  category: "Finance",
  platform: "website",
  user_note: "Seed funding supports early product development.",
  source_text: "Available public text about seed funding.",
  metadata_level: "text",
  summary: null,
  description: null,
  created_at: "2026-11-20T10:00:00Z",
} as SavedItem;
const two = {
  ...one,
  id: "two",
  title: "Pricing notes",
  tags: ["pricing"],
  category: null,
  user_note: "Starter costs $12 monthly. Annual plans save 20%.",
  source_text: null,
  metadata_level: "none",
  created_at: "2026-11-21T10:00:00Z",
} as SavedItem;
describe("Library organization", () => {
  const options = {
    q: "",
    tags: [],
    platform: "all",
    category: "",
    sort: "newest",
  };
  it("keeps All Links unique and repeats references only in explicit tag groups", () => {
    expect(
      groupLibrary([one, two], "all")[0][1].map((item) => item.id),
    ).toEqual(["one", "two"]);
    const groups = groupLibrary([one, two], "tags");
    expect(groups.find(([key]) => key === "funding")?.[1][0].id).toBe("one");
    expect(groups.find(([key]) => key === "startups")?.[1][0].id).toBe("one");
    expect(groupLibrary([two], "categories")[0][0]).toBe("Uncategorized");
  });
  it("uses OR for multiple tags, with independent source/category/search filters", () => {
    expect(
      filterLibrary([one, two], { ...options, tags: ["funding", "pricing"] }),
    ).toHaveLength(2);
    expect(
      filterLibrary([one, two], { ...options, category: "Finance", q: "seed" }),
    ).toEqual([one]);
    expect(
      filterLibrary([one, two], { ...options, category: "Uncategorized" }),
    ).toEqual([two]);
    expect(
      filterLibrary([one, two], { ...options, platform: "youtube" }),
    ).toEqual([]);
  });
  it("sorts newest, oldest and title predictably", () => {
    expect(filterLibrary([one, two], options)[0].id).toBe("two");
    expect(filterLibrary([one, two], { ...options, q: "example" })[0].id).toBe(
      "two",
    );
    expect(
      filterLibrary([one, two], { ...options, sort: "oldest" })[0].id,
    ).toBe("one");
    expect(filterLibrary([one, two], { ...options, sort: "title" })[0].id).toBe(
      "two",
    );
  });
});
describe("Grounded Ask answers", () => {
  const evidence = retrieveEvidence([one, two], "Summarize my pricing notes");
  it("retrieves personal notes before constructing the answer", () =>
    expect(evidence[0].id).toBe("two"));
  it("accepts only exact evidence from a supplied source and distinguishes notes", () => {
    expect(
      validatedClaims(
        {
          claims: [
            {
              text: "The starter costs $12 a month.",
              sourceId: "two",
              field: "notes",
              quote: "Starter costs $12 monthly.",
            },
          ],
        },
        evidence,
      ),
    ).toHaveLength(1);
  });
  it("rejects foreign/fabricated IDs, invented quotes and unseen media summaries", () => {
    expect(
      validatedClaims(
        {
          claims: [
            {
              text: "Leak",
              sourceId: "another-owner",
              field: "notes",
              quote: "Starter costs $12 monthly.",
            },
            {
              text: "Invented",
              sourceId: "two",
              field: "notes",
              quote: "The price is $999.",
            },
            {
              text: "Unseen video",
              sourceId: "two",
              field: "summary",
              quote: "full video details",
            },
          ],
        },
        evidence,
      ),
    ).toEqual([]);
  });
  it("rejects malformed responses and bounds retrieval payload", () => {
    expect(() =>
      validatedClaims({ answer: "uncited answer" }, evidence),
    ).toThrow();
    const many = Array.from({ length: 40 }, (_, i) => ({
      ...one,
      id: String(i),
      user_note: "A useful saved note. ".repeat(100),
      source_text: "Public pricing details. ".repeat(400),
    }));
    expect(
      Buffer.byteLength(JSON.stringify(retrieveEvidence(many, "pricing"))),
    ).toBeLessThanOrEqual(19500);
  });
});
