import Link from "next/link";
import { Library } from "../../src/components/library";
import type { SavedItem, Platform } from "../../src/lib/database.types";

// Loaded only by scripts/test-ui.mjs through an ignored, temporary dev route.
// No fixture route or fixture content exists in a production build.
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const mode = (await searchParams).data || "demo";
  const worst = mode === "worst";
  const base = (
    index: number,
    title: string | null,
    url: string,
    platform: Platform,
  ): SavedItem => ({
    id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
    user_id: "22222222-2222-4222-8222-222222222222",
    original_url: url,
    normalized_url: url,
    platform,
    title,
    description: null,
    processing_status: "saved",
    created_at: "2026-11-20T12:00:00Z",
    updated_at: "2026-11-20T12:00:00Z",
    search_document: `${title || ""} ${url}`,
  });
  const demo = [
    base(1, "A useful reference", "https://example.com/reference", "website"),
    base(
      2,
      "An idea for later",
      "https://www.youtube.com/watch?v=abcdefghijk",
      "youtube",
    ),
    base(3, "Worth keeping", "https://instagram.com/p/example", "instagram"),
  ];
  const stress = [
    base(
      1,
      "A practical guide to designing accessible, multilingual interfaces for small screens and complex products — with examples, implementation notes, and careful attention to the details that are easy to miss.".slice(
        0,
        200,
      ),
      "https://example.com/articles/accessibility-and-internationalization",
      "website",
    ),
    base(
      2,
      null,
      "https://example.com/workspaces/northwind-industries/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved",
      "youtube",
    ),
    base(3, "J", "https://example.com/j", "instagram"),
    base(
      4,
      "日本語のインターフェース設計とアクセシビリティの実践",
      "https://example.com/japanese",
      "website",
    ),
    base(
      5,
      "نور الهدى عبد الرحمن — ملاحظات حول تصميم الواجهات",
      "https://example.com/arabic",
      "x",
    ),
    base(
      6,
      "👩🏽‍💻 Đặng Thị Ngọc Hân: notes & examples <b>literal text</b>",
      "https://example.com/notes",
      "whatsapp",
    ),
  ];
  const items =
    mode === "empty"
      ? []
      : mode === "one"
        ? demo.slice(0, 1)
        : worst
          ? stress
          : demo;
  return (
    <>
      <Library
        email={
          worst
            ? "bartholomew.fitzgerald@northwind-industries-holdings.example.com"
            : "you@example.com"
        }
        items={items}
        total={items.length}
        q=""
        platform="all"
        page={1}
      />
      <nav
        aria-label="Test data"
        style={{
          position: "fixed",
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 4,
          padding: 5,
          background: "#e9e9e9",
          borderRadius: 8,
          zIndex: 70,
          fontSize: 12,
        }}
      >
        {["demo", "worst", "empty", "one"].map((data) => (
          <Link
            href={`?data=${data}`}
            key={data}
            style={{
              padding: "8px 10px",
              background: mode === data ? "white" : "transparent",
              borderRadius: 5,
              whiteSpace: "nowrap",
            }}
          >
            {data === "demo"
              ? "Demo data"
              : data === "worst"
                ? "Worst case"
                : data}
          </Link>
        ))}
      </nav>
    </>
  );
}
