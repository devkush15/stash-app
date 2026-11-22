"use client";
import Link from "next/link";
import {
  Plus,
  LibraryBig,
  MessageCircle,
  ChevronDown,
  Tags,
} from "lucide-react";
import { useClientReady } from "@/lib/use-client-ready";
import { Brand } from "./brand";
import { AccountMenu } from "./account-menu";
import { ThemeToggle } from "./theme-toggle";
import { SourceIcon } from "./source-icon";
import { tagLabel, tagTone } from "./tag-picker";
import { libraryHref, sources } from "@/lib/links";
import type { Platform } from "@/lib/database.types";
export function WorkspaceShell({
  active,
  email,
  onAdd,
  children,
  source = "all",
  sourceHref,
  customTags = [],
  selectedTags = [],
  tagHref,
  onManageTags,
}: {
  active: "library" | "ask";
  email: string;
  onAdd: () => void;
  children: React.ReactNode;
  source?: Platform | "all";
  sourceHref?: (source: Platform | "all") => string;
  customTags?: string[];
  selectedTags?: string[];
  tagHref?: (tag: string) => string;
  onManageTags: () => void;
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
        <div className="rail-content">
          <nav className="source-nav" aria-label="Library organization">
            <Link
              href="/library"
              prefetch={false}
              className={`source-nav-link ${active === "library" && !selectedTags.length ? "selected" : ""}`}
              aria-current={
                active === "library" && !selectedTags.length
                  ? "page"
                  : undefined
              }
            >
              <SourceIcon platform="all" />
              <span>All links</span>
            </Link>
          </nav>
          <div className="sidebar-label rail-tags-label">Your tags</div>
          <nav className="source-nav rail-tags" aria-label="Your tags">
            {customTags.map((tag) => (
              <Link
                key={tag}
                prefetch={false}
                href={tagHref ? tagHref(tag) : libraryHref("", "all", 1, [tag])}
                title={tagLabel(tag)}
                className={`source-nav-link rail-tag tag-tone-${tagTone(tag)} ${active === "library" && selectedTags.includes(tag) ? "selected" : ""}`}
                aria-current={
                  active === "library" && selectedTags.includes(tag)
                    ? "page"
                    : undefined
                }
              >
                <span className="tag-dot" aria-hidden="true" />
                <span>{tagLabel(tag)}</span>
              </Link>
            ))}
          </nav>
          {!customTags.length && (
            <p className="rail-empty-tags">
              Create a tag to organize your links.
            </p>
          )}
          <button
            className="rail-manage-tags text-button"
            onClick={onManageTags}
            disabled={!ready}
          >
            <Tags size={16} aria-hidden="true" />
            Manage tags
          </button>
          <details className="source-filter" open={source !== "all"}>
            <summary>
              <ChevronDown size={14} aria-hidden="true" />
              Filter by source
            </summary>
            <nav className="source-nav" aria-label="Filter by source">
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
                  <span>
                    {value.value === "all" ? "Any source" : value.label}
                  </span>
                </Link>
              ))}
            </nav>
          </details>
        </div>
        <div className="source-rail-bottom">
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
