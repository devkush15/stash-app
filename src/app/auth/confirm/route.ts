import { type NextRequest } from "next/server";
import { authRedirect } from "@/lib/auth-redirect";
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
    if (!error) return authRedirect("/library");
  }
  return authRedirect("/sign-in?error=expired");
}
