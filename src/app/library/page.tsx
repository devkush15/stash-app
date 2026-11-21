import { Library } from "@/components/library";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { libraryParams, PAGE_SIZE } from "@/lib/links";
import { keywordSearch } from "@/lib/search";
export const dynamic = "force-dynamic";
export const metadata = { title: "Library" };
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireUser();
  const { q, platform, page } = libraryParams(await searchParams);
  let items: import("@/lib/database.types").SavedItem[] = [];
  let error = false;
  try {
    const all = await db().list(user.id, platform);
    items = q ? keywordSearch(all, q) : all;
  } catch {
    error = true;
  }
  return (
    <Library
      items={items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
      email={user.username}
      total={items.length}
      q={q}
      platform={platform}
      page={page}
      error={error}
    />
  );
}
