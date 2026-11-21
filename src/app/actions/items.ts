"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { MAX_TITLE_LENGTH, parseLink } from "@/lib/links";
import type { ActionResult } from "@/lib/action-state";

export async function saveLink(form: FormData): Promise<ActionResult> {
  let link: ReturnType<typeof parseLink>;
  try {
    link = parseLink(form.get("url"));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Enter a valid URL.",
    };
  }
  const title = String(form.get("title") ?? "").trim();
  if (title.length > MAX_TITLE_LENGTH)
    return { error: "Keep the title to 200 characters or fewer." };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("saved_items")
    .insert({ ...link, user_id: user.id, title: title || null });
  if (error) {
    if (error.code === "23505")
      return { error: "This link is already in your Stash." };
    console.error("Save failed", { code: error.code });
    return { error: "Couldn’t save this link. Please try again." };
  }
  revalidatePath("/library");
  return { success: true };
}

export async function deleteLink(id: string): Promise<ActionResult> {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id))
    return { error: "This link could not be found." };
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("saved_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error) return { error: "Couldn’t delete this link. Please try again." };
  if (!data?.length)
    return { error: "This link was already deleted. Refresh your library." };
  revalidatePath("/library");
  return { success: true };
}
