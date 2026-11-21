import { redirect } from "next/navigation";
import { Library } from "@/components/library";
import { requireUser } from "@/lib/auth";
import { escapeLike, libraryHref, libraryParams, PAGE_SIZE } from "@/lib/links";

export const dynamic = "force-dynamic";
export const metadata = { title: "Library" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, supabase } = await requireUser();
  const { q, platform, page } = libraryParams(await searchParams);
  let query = supabase
    .from("saved_items")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (q) query = query.ilike("search_document", `%${escapeLike(q)}%`);
  if (platform !== "all") query = query.eq("platform", platform);
  const { data, error, count } = await query.range(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE - 1,
  );
  if (error) console.error("Library query failed", { code: error.code });
  if (!error && page > 1 && !data?.length)
    redirect(
      libraryHref(
        q,
        platform,
        Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
      ),
    );
  return (
    <Library
      items={data ?? []}
      email={user.email ?? "Your account"}
      total={count ?? 0}
      q={q}
      platform={platform}
      page={page}
      error={Boolean(error)}
    />
  );
}
