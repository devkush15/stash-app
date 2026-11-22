import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignInForm } from "@/components/sign-in-form";
import { isDatabaseConfigured } from "@/lib/env";
import { currentUser } from "@/lib/auth";
export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";
export default async function SignInPage() {
  const configured = isDatabaseConfigured();
  if (configured && (await currentUser())) redirect("/library");
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link href="/" className="brand-link">
          <Brand />
        </Link>
        <ThemeToggle />
      </header>
      <main className="auth-main">
        <div className="auth-content">
          <SignInForm configured={configured} />
        </div>
      </main>
      <footer className="auth-footer">
        <span>stash.</span>
      </footer>
    </div>
  );
}
