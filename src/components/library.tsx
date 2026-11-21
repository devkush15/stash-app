"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Command,
  LoaderCircle,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Brand } from "./brand";
import { SourceIcon } from "./source-icon";
import { AccountMenu } from "./account-menu";
import { LinkDialog } from "./link-dialog";
import { SavedLink } from "./saved-link";
import { libraryHref, PAGE_SIZE, sources } from "@/lib/links";
import type { Platform, SavedItem } from "@/lib/database.types";

export type LibraryProps = {
  items: SavedItem[];
  email: string;
  total: number;
  q: string;
  platform: Platform | "all";
  page: number;
  error?: boolean;
};

export function Library({
  items,
  email,
  total,
  q,
  platform,
  page,
  error,
}: LibraryProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    const sync = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("keydown", handle);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      document.removeEventListener("keydown", handle);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, [router]);
  const notify = (message: string) => {
    setNotice(message);
    router.refresh();
  };
  const title =
    platform === "all"
      ? "All links"
      : sources.find((s) => s.value === platform)?.label;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#library-content">
        Skip to library
      </a>
      <aside className="sidebar">
        <Link href="/library" className="brand-link">
          <Brand />
        </Link>
        <div className="sidebar-label">Library</div>
        <nav className="source-nav" aria-label="Sources">
          {sources.map((source) => (
            <Link
              key={source.value}
              href={libraryHref(q, source.value)}
              className={`source-nav-link ${platform === source.value ? "selected" : ""}`}
              aria-current={platform === source.value ? "page" : undefined}
            >
              <SourceIcon platform={source.value} />
              <span>{source.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="private-label">
            <span className="private-dot" />
            Just for you
          </span>
          <AccountMenu email={email} />
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Link className="mobile-brand brand-link" href="/library">
            <Brand />
          </Link>
          <form
            className="search-form"
            action="/library"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              startTransition(() =>
                router.push(
                  libraryHref(
                    String(form.get("q") ?? "")
                      .trim()
                      .slice(0, 200),
                    platform,
                  ),
                ),
              );
            }}
            role="search"
          >
            <Search size={19} aria-hidden="true" />
            <input
              ref={searchRef}
              key={q}
              defaultValue={q}
              name="q"
              type="search"
              placeholder="Search your saves…"
              aria-label="Search your saves"
              maxLength={200}
              autoComplete="off"
              enterKeyHint="search"
            />
            {platform !== "all" && (
              <input type="hidden" name="source" value={platform} />
            )}
            <kbd className="search-shortcut">
              <Command size={12} aria-hidden="true" /> K
            </kbd>
            <button
              type="submit"
              className="icon-button search-submit"
              aria-label="Search"
            >
              {pending ? (
                <LoaderCircle className="spinner" size={17} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          </form>
          <button
            className="button button-primary add-button"
            onClick={() => setOpen(true)}
          >
            <Plus size={18} aria-hidden="true" />
            <span>Add link</span>
          </button>
          <div className="mobile-account">
            <AccountMenu email={email} />
          </div>
        </header>
        <nav className="mobile-source-nav" aria-label="Filter by source">
          {sources.map((source) => (
            <Link
              key={source.value}
              href={libraryHref(q, source.value)}
              className={`source-chip ${platform === source.value ? "selected" : ""}`}
              aria-current={platform === source.value ? "page" : undefined}
            >
              <SourceIcon platform={source.value} />
              {source.label}
            </Link>
          ))}
        </nav>
        <main
          id="library-content"
          className="library-content"
          tabIndex={-1}
          aria-busy={pending}
        >
          <div className="library-heading">
            <h1>{q ? "Search results" : title}</h1>
            {!error && (
              <span className="item-count">
                {new Intl.NumberFormat("en").format(total)}{" "}
                {total === 1 ? "link" : "links"}
              </span>
            )}
          </div>
          {q && (
            <div className="search-query">
              <span>
                Results for <strong>“{q}”</strong>
              </span>
              <Link
                href={libraryHref("", platform)}
                className="icon-button"
                aria-label="Clear search"
              >
                <X size={16} aria-hidden="true" />
              </Link>
            </div>
          )}
          {notice && (
            <div role="status" className="success-notice">
              <Check size={16} aria-hidden="true" />
              {notice}
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {error ? (
            <div className="empty-state">
              <span className="empty-icon">
                <Bookmark size={27} />
              </span>
              <h2>Couldn’t load your links.</h2>
              <p>Please try again in a moment.</p>
              <button
                className="button button-secondary"
                onClick={() => startTransition(() => router.refresh())}
              >
                {pending ? "Retrying…" : "Try again"}
              </button>
            </div>
          ) : items.length ? (
            <>
              <div className="content-grid">
                {items.map((item) => (
                  <SavedLink
                    key={item.id}
                    item={item}
                    onDeleted={() => notify("Link deleted.")}
                  />
                ))}
              </div>
              <div className="library-end">
                <span>
                  {q ? "Your finds, found." : "A little less scattered."}
                </span>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">
                {q ? (
                  <Search size={27} strokeWidth={1.5} />
                ) : (
                  <Bookmark size={27} strokeWidth={1.5} />
                )}
              </span>
              <h2>
                {q
                  ? "No matching links."
                  : platform === "all"
                    ? "Keep your first good find."
                    : `No ${title} links yet.`}
              </h2>
              <p>
                {q
                  ? "Try a different title, keyword, or URL."
                  : "Paste a link. Pick it up whenever you need it."}
              </p>
              {q ? (
                <Link
                  href={libraryHref("", platform)}
                  className="button button-secondary"
                >
                  Clear search
                </Link>
              ) : (
                <button
                  className="button button-primary"
                  onClick={() => setOpen(true)}
                >
                  <Plus size={17} aria-hidden="true" />
                  Add a link
                </button>
              )}
            </div>
          )}
          {!error && (page > 1 || total > PAGE_SIZE) && (
            <nav className="pagination" aria-label="Library pages">
              {page > 1 ? (
                <Link
                  className="button button-secondary"
                  href={libraryHref(q, platform, page - 1)}
                >
                  <ChevronLeft size={16} />
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span>
                Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
              </span>
              {page * PAGE_SIZE < total ? (
                <Link
                  className="button button-secondary"
                  href={libraryHref(q, platform, page + 1)}
                >
                  Next
                  <ChevronRight size={16} />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </main>
        <footer className="app-footer">
          <span>Keep what clicks.</span>
          <span>stash.</span>
        </footer>
      </div>
      <LinkDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={() => {
          notify("Link saved.");
          if (q || platform !== "all" || page > 1) router.push("/library");
        }}
      />
    </div>
  );
}
