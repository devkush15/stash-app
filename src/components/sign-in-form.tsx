"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { api } from "@/lib/client-api";

export function SignInForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [register, setRegister] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <h1>{register ? "Create an account." : "Welcome back."}</h1>
      {!configured && (
        <p className="notice" role="status">
          Database setup is required before you can sign in.
        </p>
      )}
      <form
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError("");
          setPending(true);
          try {
            await api(`/api/auth/${register ? "register" : "login"}`, {
              method: "POST",
              body: JSON.stringify({
                username: form.get("username"),
                password: form.get("password"),
              }),
            });
            router.replace("/library");
            router.refresh();
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Couldn’t sign in.",
            );
            setPending(false);
          }
        }}
      >
        <label htmlFor="username">Username</label>
        <input
          className="input"
          id="username"
          name="username"
          required
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_.\-]+"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          disabled={pending || !configured}
        />
        <label htmlFor="password">Password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete={register ? "new-password" : "current-password"}
          disabled={pending || !configured}
          aria-describedby={error ? "auth-error" : undefined}
        />
        {error && (
          <p className="error-message" id="auth-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button button-primary w-full"
          disabled={pending || !configured}
          type="submit"
        >
          {pending && (
            <LoaderCircle className="spinner" size={17} aria-hidden="true" />
          )}
          {pending ? "Please wait…" : register ? "Create account" : "Sign in"}
        </button>
      </form>
      <button
        className="auth-switch"
        disabled={pending}
        onClick={() => {
          setRegister(!register);
          setError("");
        }}
      >
        {register
          ? "Already have an account? Sign in"
          : "New here? Create an account"}
      </button>
    </>
  );
}
