import { AskStash } from "@/components/ask-stash";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export const metadata = { title: "Ask Stash" };
export default async function AskPage() {
  const { user } = await requireUser();
  const items = await db().list(user.id);
  const tags = await db().tagCatalog(user.id, items);
  return (
    <AskStash email={user.username} tags={tags} hasContent={items.length > 0} />
  );
}
