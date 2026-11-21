"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="fallback-page"><span className="brand">stash.</span><h1>Something didn’t load.</h1><p>Your links are still yours. Try again in a moment.</p><button className="button button-primary" onClick={reset}>Try again</button></main>;
}
