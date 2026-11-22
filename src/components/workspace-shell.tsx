"use client";
import Link from "next/link";
import { Plus, LibraryBig, MessageCircle } from "lucide-react";
import { useClientReady } from "@/lib/use-client-ready";
import { Brand } from "./brand";
import { AccountMenu } from "./account-menu";
import { ThemeToggle } from "./theme-toggle";
import { SourceIcon } from "./source-icon";
import { libraryHref, sources } from "@/lib/links";
import type { Platform } from "@/lib/database.types";
export function WorkspaceShell({
  active,
  email,
  onAdd,
  children,
  source = "all",
  sourceHref,
}: {
  active: "library" | "ask";
  email: string;
  onAdd: () => void;
  children: React.ReactNode;
  source?: Platform | "all";
  sourceHref?: (source: Platform | "all") => string;
}) {
  const ready = useClientReady();
  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#workspace-content">
        Skip to content
      </a>
      <aside className="source-rail">
        <Link href="/library" className="brand-link">
          <Brand />
        </Link>
        <div className="sidebar-label">Library</div>
        <nav className="source-nav" aria-label="Sources">
          {sources.map((value) => (
            <Link
              key={value.value}
              prefetch={false}
              href={
                sourceHref
                  ? sourceHref(value.value)
                  : libraryHref("", value.value)
              }
              className={`source-nav-link ${active === "library" && source === value.value ? "selected" : ""}`}
              aria-current={
                active === "library" && source === value.value
                  ? "page"
                  : undefined
              }
            >
              <SourceIcon platform={value.value} />
              <span>{value.label}</span>
            </Link>
          ))}
        </nav>
        <div className="source-rail-bottom">
          <span className="private-label">
            <span className="private-dot" />
            Just for you
          </span>
          <AccountMenu email={email} />
        </div>
      </aside>
      <div className="workspace-stage">
        <header className="workspace-header">
          <Link href="/library" className="brand-link header-brand">
            <Brand />
          </Link>
          <nav className="primary-navigation" aria-label="Primary navigation">
            <Link
              href="/library"
              aria-current={active === "library" ? "page" : undefined}
            >
              <LibraryBig size={17} aria-hidden="true" />
              Library
            </Link>
            <Link
              href="/ask"
              aria-current={active === "ask" ? "page" : undefined}
            >
              <MessageCircle size={17} aria-hidden="true" />
              Ask Stash
            </Link>
          </nav>
          <div className="workspace-actions">
            <ThemeToggle />
            <button
              className="button button-primary"
              disabled={!ready}
              onClick={onAdd}
              aria-label="Add link"
              title="Add link"
            >
              <Plus size={18} aria-hidden="true" />
              <span className="add-link-label">Add link</span>
            </button>
            <div className="header-account">
              <AccountMenu email={email} />
            </div>
          </div>
        </header>
        <main id="workspace-content" className="workspace-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
