"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { WorkspaceShell } from "./workspace-shell";
import { SavedLink } from "./saved-link";
import { LinkDialog } from "./link-dialog";
import { TagManager } from "./tag-manager";
import { tagLabel, tagTone } from "./tag-picker";
import { libraryHref, PAGE_SIZE, sources } from "@/lib/links";
import { groupLibrary } from "@/lib/library-view";
import { useClientReady } from "@/lib/use-client-ready";
import { api } from "@/lib/client-api";
import type { Platform, SavedItem } from "@/lib/database.types";
export type LibraryProps = {
  items: SavedItem[];
  email: string;
  total: number;
  q: string;
  platform: Platform | "all";
  page: number;
  error?: boolean;
  tags?: string[];
  tag?: string;
  selectedTags?: string[];
  sort?: string;
  view?: string;
  category?: string;
  categories?: string[];
  customTags?: string[];
};
export function Library({
  items,
  email,
  total,
  q,
  platform,
  page,
  error,
  tags = [],
  tag = "",
  selectedTags = tag ? [tag] : [],
  sort = "newest",
  view = "tags",
  category = "",
  categories = [],
  customTags = [],
}: LibraryProps) {
  const ready = useClientReady();
  const router = useRouter(),
    searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false),
    [filters, setFilters] = useState(
      Boolean(selectedTags.length || platform !== "all" || category),
    ),
    [managing, setManaging] = useState(false),
    [notice, setNotice] = useState(""),
    [analyzing, setAnalyzing] = useState<string[]>([]),
    [pending, start] = useTransition();
  const options = { sort, view, category };
  const href = (
    query = q,
    source = platform,
    values = selectedTags,
    number = 1,
    changes: Partial<typeof options> = {},
  ) => libraryHref(query, source, number, values, { ...options, ...changes });
  const catalog = [
    ...new Set([...tags, ...items.flatMap((item) => item.tags)]),
  ].sort((a, b) => a.localeCompare(b));
  const groups = groupLibrary(items, view);
  const activeFilters =
    selectedTags.length + (platform !== "all" ? 1 : 0) + (category ? 1 : 0);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  async function analyze(id: string) {
    setAnalyzing((values) => [...values, id]);
    try {
      await api(`/api/items/${id}/index`, { method: "POST" });
      router.refresh();
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Your link is saved. Analysis is unavailable.",
      );
    } finally {
      setAnalyzing((values) => values.filter((value) => value !== id));
    }
  }
  const refresh = (message: string) => {
    setNotice(message);
    router.refresh();
  };
  return (
    <WorkspaceShell
      active="library"
      email={email}
      onAdd={() => setOpen(true)}
      source={platform}
      sourceHref={(value) => href(q, value)}
      customTags={customTags}
      selectedTags={selectedTags}
      tagHref={(value) =>
        href("", platform, [value], 1, { category: "", view: "all" })
      }
      onManageTags={() => setManaging(true)}
    >
      <div className="page-heading">
        <h1>Library</h1>
        <span className="item-count">
          {total.toLocaleString()} {total === 1 ? "link" : "links"}
        </span>
        <label className="mobile-tag-browse">
          <span className="sr-only">Browse by tag</span>
          <select
            aria-label="Browse by tag"
            disabled={!ready || pending}
            value={
              selectedTags.length === 1 && customTags.includes(selectedTags[0])
                ? `tag:${selectedTags[0]}`
                : ""
            }
            onChange={(event) => {
              const value = event.target.value;
              if (value === "manage") setManaging(true);
              else
                start(() =>
                  router.push(
                    value
                      ? href("", platform, [value.slice(4)], 1, {
                          category: "",
                          view: "all",
                        })
                      : "/library",
                  ),
                );
            }}
          >
            <option value="">All links</option>
            {customTags.map((value) => (
              <option key={value} value={`tag:${value}`}>
                {tagLabel(value)}
              </option>
            ))}
            <option value="manage">Manage tags…</option>
          </select>
        </label>
      </div>
      <form
        role="search"
        className="library-search"
        onSubmit={(event) => {
          event.preventDefault();
          const value = String(new FormData(event.currentTarget).get("q") || "")
            .trim()
            .slice(0, 200);
          start(() => router.push(href(value)));
        }}
      >
        <Search size={20} aria-hidden="true" />
        <input
          ref={searchRef}
          key={q}
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search titles, notes, or tags…"
          aria-label="Search your saves"
          disabled={!ready}
          maxLength={200}
          autoComplete="off"
          enterKeyHint="search"
        />
        {q && (
          <Link
            href={href("")}
            className="icon-button"
            aria-label="Clear search"
          >
            <X size={17} />
          </Link>
        )}
        <button className="icon-button" aria-label="Search" disabled={!ready}>
          {pending ? (
            <LoaderCircle className="spinner" size={18} />
          ) : (
            <ChevronRight size={19} />
          )}
        </button>
      </form>
      <div className="library-toolbar">
        <button
          className={`button button-secondary filter-toggle ${activeFilters ? "has-filters" : ""}`}
          aria-expanded={filters}
          aria-controls="library-filters"
          disabled={!ready}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeFilters > 0 && (
            <span className="filter-count">{activeFilters}</span>
          )}
        </button>
        <label className="sort-control">
          Sort by
          <select
            aria-label="Sort by"
            disabled={!ready || pending}
            value={sort}
            onChange={(event) =>
              start(() =>
                router.push(
                  href(q, platform, selectedTags, 1, {
                    sort: event.target.value,
                  }),
                ),
              )
            }
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
      </div>
      {filters && (
        <form
          id="library-filters"
          className="filter-panel"
          key={JSON.stringify([
            selectedTags,
            platform,
            category,
            view,
            catalog,
          ])}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            if (data.getAll("tag").length > 8) {
              setNotice("Choose up to 8 tags for a filter.");
              return;
            }
            start(() =>
              router.push(
                libraryHref(
                  q,
                  String(data.get("source")),
                  1,
                  data.getAll("tag").map(String),
                  {
                    sort,
                    view: String(data.get("view")),
                    category: String(data.get("category")),
                  },
                ),
              ),
            );
          }}
        >
          <div className="filter-selects">
            <label className="mobile-source-filter">
              Source
              <select
                name="source"
                aria-label="Source"
                disabled={!ready || pending}
                defaultValue={platform}
              >
                {sources.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.value === "all" ? "All sources" : source.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Category
              <select
                name="category"
                aria-label="Category"
                disabled={!ready || pending}
                defaultValue={category}
              >
                <option value="">All categories</option>
                {[...new Set([...categories, "Uncategorized"])].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              View
              <select
                name="view"
                aria-label="View"
                disabled={!ready || pending}
                defaultValue={view}
              >
                <option value="all">Ungrouped</option>
                <option value="categories">Group by category</option>
                <option value="tags">Group by tag</option>
              </select>
            </label>
          </div>
          <div className="filter-tags-heading">
            <span>
              Tags <small>Match any · up to 8 tags</small>
            </span>
            <button
              type="button"
              className="text-button"
              onClick={() => setManaging(true)}
            >
              Manage tags
            </button>
          </div>
          <div className="filter-tags">
            {catalog.map((value) => (
              <label
                className={`tag-filter tag-tone-${tagTone(value)}`}
                key={value}
              >
                <input
                  type="checkbox"
                  disabled={!ready || pending}
                  name="tag"
                  value={value}
                  defaultChecked={selectedTags.includes(value)}
                />
                <span className="tag-dot" />
                {tagLabel(value)}
              </label>
            ))}
            {!catalog.length && (
              <span className="muted">
                No tags yet. Add one when saving a link.
              </span>
            )}
          </div>
          <div className="filter-panel-actions">
            <Link
              className="text-button"
              href={libraryHref(q, "all", 1, [], { sort })}
            >
              Clear filters
            </Link>
            <button className="button button-primary" disabled={pending}>
              Apply filters
            </button>
          </div>
        </form>
      )}
      {(activeFilters > 0 || q) && (
        <div className="active-filters">
          {q && <span>Results for “{q}”</span>}
          {selectedTags.map((value) => (
            <button
              key={value}
              className={`tag-pill compact tag-tone-${tagTone(value)}`}
              onClick={() =>
                start(() =>
                  router.push(
                    href(
                      q,
                      platform,
                      selectedTags.filter((t) => t !== value),
                    ),
                  ),
                )
              }
            >
              {tagLabel(value)}
              <X size={12} />
            </button>
          ))}
          {category && <span>{category}</span>}
          {platform !== "all" && (
            <span>
              {sources.find((source) => source.value === platform)?.label}
            </span>
          )}
        </div>
      )}
      {notice && (
        <div className="inline-notice" role="status">
          {notice}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="library-results" aria-busy={pending}>
        {error ? (
          <div className="empty-state">
            <h2>Couldn’t load your links.</h2>
            <button
              className="button button-secondary"
              onClick={() => router.refresh()}
            >
              Try again
            </button>
          </div>
        ) : items.length ? (
          groups.map(([name, links]) => (
            <section className="link-section" key={name}>
              {view !== "all" && (
                <div className={`section-heading tag-tone-${tagTone(name)}`}>
                  <h2>{tagLabel(name)}</h2>
                  <span>{links.length}</span>
                </div>
              )}
              <div className="link-list">
                {links.map((item) => (
                  <SavedLink
                    key={item.id}
                    item={item}
                    analyzing={analyzing.includes(item.id)}
                    onAnalyze={analyze}
                    tagOptions={catalog}
                    onEdited={(updated, reanalyze) => {
                      refresh("Link updated.");
                      if (reanalyze) void analyze(updated.id);
                    }}
                    onDeleted={() => refresh("Link deleted.")}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="empty-state">
            <span className="empty-icon">
              <Bookmark size={25} />
            </span>
            <h2>
              {q || activeFilters
                ? "No matching links."
                : "Save your first link."}
            </h2>
            <p>
              {q || activeFilters
                ? "Try fewer filters or a different search."
                : "Keep a good find. Add context whenever you need it."}
            </p>
            {q || activeFilters ? (
              <Link className="button button-secondary" href="/library">
                Show all links
              </Link>
            ) : (
              <button
                className="button button-primary"
                disabled={!ready}
                onClick={() => setOpen(true)}
              >
                Add a link
              </button>
            )}
          </div>
        )}
      </div>
      {!error && (page > 1 || total > PAGE_SIZE) && (
        <nav className="pagination" aria-label="Library pages">
          {page > 1 ? (
            <Link
              className="button button-secondary"
              href={href(q, platform, selectedTags, page - 1)}
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
              href={href(q, platform, selectedTags, page + 1)}
            >
              Next
              <ChevronRight size={16} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      <LinkDialog
        key={selectedTags.join(",")}
        open={open}
        onOpenChange={setOpen}
        tagOptions={catalog}
        defaultTags={selectedTags}
        onSaved={(item) => {
          refresh("Link saved.");
          void analyze(item.id);
          if (q || activeFilters || page > 1) router.push("/library");
        }}
      />
      {managing && (
        <TagManager
          open={managing}
          onOpenChange={setManaging}
          tags={catalog}
          onChanged={(change) => {
            if (change && selectedTags.includes(change.from)) {
              const next = selectedTags.flatMap((value) =>
                value === change.from
                  ? change.to
                    ? [change.to]
                    : []
                  : [value],
              );
              router.replace(href(q, platform, [...new Set(next)]));
            } else router.refresh();
          }}
        />
      )}
    </WorkspaceShell>
  );
}
