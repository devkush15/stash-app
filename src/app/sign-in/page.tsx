import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { SignInForm } from "@/components/sign-in-form";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const configured = isSupabaseConfigured();
  if (configured) { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (user) redirect("/library"); }
  const params = await searchParams;
  return <div className="auth-page"><header className="auth-header"><Link href="/" className="brand-link"><Brand /></Link><span className="auth-header-note">A place for your good finds.</span></header><main className="auth-main"><div className="auth-content"><SignInForm configured={configured} expired={params.error === "expired"} /></div></main><footer className="auth-footer"><span>Keep what clicks.</span><span>Private by default.</span></footer></div>;
}
