import { AskStash } from "@/components/ask-stash";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export const metadata = { title: "Ask Stash" };
export default async function AskPage() {
  const { user } = await requireUser();
  const items = await db().list(user.id);
  const customTags = await db().customTags(user.id, items);
  const tags = await db().tagCatalog(user.id, items, customTags);
  return (
    <AskStash
      email={user.username}
      tags={tags}
      customTags={customTags}
      hasContent={items.length > 0}
    />
  );
}
