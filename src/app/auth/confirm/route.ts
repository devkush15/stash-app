import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

// Optional token-hash email template supports opening the link on another device.
// Keep destinations fixed: never accept arbitrary redirect URLs from a query.
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  if (token_hash && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: "email",
    });
    if (!error) return NextResponse.redirect(new URL("/library", request.url));
  }
  return NextResponse.redirect(new URL("/sign-in?error=expired", request.url));
}
