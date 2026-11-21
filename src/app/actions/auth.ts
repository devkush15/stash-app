"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { AuthResult, ActionResult } from "@/lib/action-state";

export async function requestSignIn(
  _previous: AuthResult,
  form: FormData,
): Promise<AuthResult> {
  if (!isSupabaseConfigured())
    return { error: "Sign-in is unavailable until Supabase is configured." };
  const email = String(form.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return { error: "Enter a valid email address." };
  const requestHeaders = await headers();
  const siteUrl =
    process.env.APP_URL ||
    (process.env.NODE_ENV === "development"
      ? requestHeaders.get("origin")
      : null);
  if (!siteUrl)
    return {
      error: "Sign-in is temporarily unavailable. Please try again later.",
    };
  try {
    const origin = new URL(siteUrl).origin;
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    if (error)
      return {
        error:
          error.status === 429
            ? "Too many requests. Wait a minute before trying again."
            : "We couldn’t send your sign-in link. Please try again shortly.",
      };
    return { sent: true, email };
  } catch {
    return {
      error: "Couldn’t reach sign-in. Check your connection and try again.",
    };
  }
}

export async function signOut(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { error: "Couldn’t sign out. Please try again." };
  redirect("/sign-in");
}
