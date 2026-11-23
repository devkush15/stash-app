"use client";
import Link from "next/link";
import { Plus, LibraryBig, Sparkles, Tags } from "lucide-react";
import { useClientReady } from "@/lib/use-client-ready";
import { Brand } from "./brand";
import { AccountMenu } from "./account-menu";
import { ThemeToggle } from "./theme-toggle";
import { useState } from "react";
import { usePreference, tagColors } from "./display-preferences";
import { SourceIcon } from "./source-icon";
import { tagLabel } from "./tag-picker";
import { libraryHref } from "@/lib/links";
import type { Platform } from "@/lib/database.types";
export function WorkspaceShell({
  active,
  email,
  onAdd,
  children,
  tagCounts = {},
  customTags = [],
  selectedTags = [],
  tagHref,
  onManageTags,
}: {
  active: "library" | "ask";
  email: string;
  onAdd: () => void;
  children: React.ReactNode;
  tagCounts?: Record<string, number>;
  source?: Platform | "all";
  sourceHref?: (source: Platform | "all") => string;
  customTags?: string[];
  selectedTags?: string[];
  tagHref?: (tag: string) => string;
  onManageTags: () => void;
}) {
  const ready = useClientReady();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const sorted = [...customTags].sort(
    (a, b) => (tagCounts[b] || 0) - (tagCounts[a] || 0) || a.localeCompare(b),
  );
  const visible = sorted.filter((tag) =>
    tag.toLowerCase().includes(query.toLowerCase()),
  );
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
          <div className="rail-tags-header">
            <span>Your tags</span>
            <button
              className="icon-button"
              aria-label="Manage tags"
              title="Manage tags"
              onClick={onManageTags}
              disabled={!ready}
            >
              <Tags size={16} />
            </button>
          </div>
          {customTags.length > 8 && (
            <input
              className="input tag-find"
              aria-label="Filter tags"
              placeholder="Filter tags…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
          <nav className="source-nav rail-tags" aria-label="Your tags">
            {(expanded || query ? visible : visible.slice(0, 8)).map((tag) => (
              <Link
                key={tag}
                prefetch={false}
                href={tagHref ? tagHref(tag) : libraryHref("", "all", 1, [tag])}
                title={tagLabel(tag)}
                className={`source-nav-link rail-tag ${active === "library" && selectedTags.includes(tag) ? "selected" : ""}`}
                aria-current={
                  active === "library" && selectedTags.includes(tag)
                    ? "page"
                    : undefined
                }
              >
                <TagDot tag={tag} />
                <span>{tagLabel(tag)}</span>
                <span className="rail-tag-count">{tagCounts[tag] || 0}</span>
              </Link>
            ))}
          </nav>
          {!customTags.length && (
            <p className="rail-empty-tags">
              Create a tag to organize your links.
            </p>
          )}
          {customTags.length > 8 && !query && (
            <button
              className="text-button show-tags"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
            >
              {expanded ? "Show less" : `Show more (${customTags.length - 8})`}
            </button>
          )}
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
              className="ask-tab"
              href="/ask"
              aria-current={active === "ask" ? "page" : undefined}
            >
              <Sparkles size={17} aria-hidden="true" />
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

function TagDot({ tag }: { tag: string }) {
  const [color] = usePreference(`stash-tag-color:${tag}`, "neutral");
  return (
    <span
      className="tag-dot"
      style={{
        background:
          tagColors[color as keyof typeof tagColors] || tagColors.neutral,
      }}
      aria-hidden="true"
    />
  );
}
