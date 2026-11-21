import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function requireUser() {
  if (!isSupabaseConfigured()) redirect("/sign-in");
  const supabase = await createClient();
  // Ask Auth for the current user rather than trusting cookie/session contents.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/sign-in");
  return { supabase, user };
}
