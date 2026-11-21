import Link from "next/link";
export default function NotFound() {
  return (
    <main className="fallback-page">
      <span className="brand">stash.</span>
      <h1>Nothing stashed here.</h1>
      <Link className="button button-primary" href="/library">
        Back to library
      </Link>
    </main>
  );
}
