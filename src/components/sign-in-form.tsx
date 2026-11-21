"use client";

import { useActionState, useState } from "react";
import { Mail, Check, LoaderCircle } from "lucide-react";
import { requestSignIn } from "@/app/actions/auth";
import type { AuthResult } from "@/lib/action-state";

export function SignInForm({ configured, expired }: { configured: boolean; expired: boolean }) {
  const [state, action, pending] = useActionState<AuthResult, FormData>(requestSignIn, {});
  const [changeEmail, setChangeEmail] = useState(false);
  if (state.sent && !changeEmail) return <div className="email-sent">
    <span className="sent-icon"><Check size={24} aria-hidden="true" /></span>
    <h1>Check your inbox.</h1>
    <p role="status">Your sign-in link is on its way to <strong>{state.email}</strong>.</p>
    <p className="muted">Open it to get started. Check spam if it doesn’t arrive.</p>
    <button className="button button-secondary w-full" onClick={() => setChangeEmail(true)}>Use a different email</button>
  </div>;
  return <>
    <h1>Your good finds.<br /><span className="muted-heading">All together.</span></h1>
    <p className="auth-intro">Save anything. Find everything.</p>
    {!configured && <div className="notice" role="status">Stash is being set up. Sign-in will be available once the database is connected.</div>}
    {expired && !state.error && <p className="error-message" role="alert">This sign-in link has expired. Request a new one below.</p>}
    <form action={action} className="auth-form" onSubmit={() => setChangeEmail(false)}>
      <label htmlFor="email">Email address</label>
      <input className="input" id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" required maxLength={254} disabled={pending || !configured} aria-describedby={state.error ? "auth-error" : undefined} />
      {state.error && <p className="error-message" id="auth-error" role="alert">{state.error}</p>}
      <button className="button button-primary w-full" disabled={pending || !configured} type="submit">{pending ? <LoaderCircle className="spinner" size={17} aria-hidden="true" /> : <Mail size={17} aria-hidden="true" />}{pending ? "Sending link…" : "Continue with email"}</button>
    </form>
    <p className="auth-note">New here? Your account is created automatically.<br />No password to remember.</p>
  </>;
}
