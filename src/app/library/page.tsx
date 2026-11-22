import { Library } from "@/components/library";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { libraryParams, PAGE_SIZE } from "@/lib/links";
import { filterLibrary } from "@/lib/library-view";
import type { SavedItem } from "@/lib/database.types";
export const dynamic = "force-dynamic";
export const metadata = { title: "Library" };
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireUser();
  const params = libraryParams(await searchParams);
  let items: SavedItem[] = [],
    tags: string[] = [],
    customTags: string[] = [],
    categories: string[] = [],
    error = false;
  try {
    const all = await db().list(user.id);
    customTags = await db().customTags(user.id, all);
    tags = await db().tagCatalog(user.id, all, customTags);
    categories = [
      ...new Set(
        all
          .map((item) => item.category)
          .filter((value): value is string => Boolean(value)),
      ),
    ].sort();
    items = filterLibrary(all, params);
  } catch {
    error = true;
  }
  return (
    <Library
      items={items.slice(
        (params.page - 1) * PAGE_SIZE,
        params.page * PAGE_SIZE,
      )}
      email={user.username}
      total={items.length}
      {...params}
      selectedTags={params.tags}
      tags={tags}
      customTags={customTags}
      categories={categories}
      error={error}
    />
  );
}
