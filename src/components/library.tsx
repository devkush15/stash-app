"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Popover } from "@base-ui/react/popover";
import { Dialog } from "@base-ui/react/dialog";
import {
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  Grid2X2,
  List,
  Rows3,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { WorkspaceShell } from "./workspace-shell";
import { SavedLink } from "./saved-link";
import { LinkDialog } from "./link-dialog";
import { TagManager } from "./tag-manager";
import { usePreference } from "./display-preferences";
import { tagLabel } from "./tag-picker";
import { sources, PAGE_SIZE } from "@/lib/links";
import { filterLibrary, groupLibrary } from "@/lib/library-view";
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
export function Library(props: LibraryProps) {
  const router = useRouter();
  const [records, setRecords] = useState(props.items);
  const [catalog, setCatalog] = useState(props.tags || []);
  const [custom, setCustom] = useState(props.customTags || []);
  const [query, setQuery] = useState(props.q);
  const [source, setSource] = useState<string>(props.platform);
  const [tags, setTags] = useState(props.selectedTags || []);
  const [category, setCategory] = useState(props.category || "");
  const [sort, setSort] = useState(props.sort || "newest");
  const [group, setGroup] = useState(props.view || "tags");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(props.page);
  const [layout, setLayout] = usePreference("stash-library-layout", "grid");
  const [open, setOpen] = useState(false),
    [manage, setManage] = useState(false),
    [filters, setFilters] = useState(false);
  const [notice, setNotice] = useState(""),
    [error, setError] = useState(
      props.error ? "Couldn’t load your links." : "",
    );
  const [selected, setSelected] = useState<string[]>([]),
    [analyzing, setAnalyzing] = useState<string[]>([]);
  const [batchOpen, setBatchOpen] = useState(false),
    [batchTag, setBatchTag] = useState(""),
    [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<SavedItem[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDelete = useRef<SavedItem[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    try {
      const result = await api<{ items: SavedItem[] }>("/api/items");
      setRecords(result.items);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load your links.");
    }
  }, []);
  useEffect(() => {
    // Layout fixtures are isolated from account APIs.
    if (window.location.pathname.startsWith("/dev-qa")) return;
    let cancelled = false;
    void api<{ items: SavedItem[] }>("/api/items")
      .then((result) => {
        if (!cancelled) {
          setRecords(result.items);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn’t refresh your library.");
      });
    return () => {
      cancelled = true;
    };
  }, [props.items]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const flush = () => {
      for (const item of pendingDelete.current)
        void fetch(`/api/items/${item.id}`, {
          method: "DELETE",
          keepalive: true,
        });
      pendingDelete.current = [];
    };
    window.addEventListener("pagehide", flush);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      flush();
      window.removeEventListener("pagehide", flush);
    };
  }, []);
  const counts = Object.fromEntries(
    custom.map((tag) => [
      tag,
      records.filter(
        (item) =>
          item.tags.includes(tag) &&
          !undo.some((deleted) => deleted.id === item.id),
      ).length,
    ]),
  );
  const allTags = [
    ...new Set([
      ...catalog,
      ...custom,
      ...records.flatMap((item) => item.tags),
    ]),
  ].sort();
  const filtered = filterLibrary(records, {
    q: query,
    tags,
    platform: source,
    category,
    sort,
  }).filter(
    (item) =>
      !undo.some((deleted) => deleted.id === item.id) &&
      (!dateFrom || item.created_at.slice(0, 10) >= dateFrom) &&
      (!dateTo || item.created_at.slice(0, 10) <= dateTo),
  );
  const total = windowSafeFixtureTotal(props, records, filtered);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const shown = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const groups = groupLibrary(shown, group);
  const reset = () => {
    setTags([]);
    setSource("all");
    setCategory("");
    setDateFrom("");
    setDateTo("");
    setQuery("");
    setPage(1);
  };
  const ask = (value: string, ids: string[] = []) => {
    const params = new URLSearchParams({ q: value });
    if (ids.length) params.set("items", ids.join(","));
    router.push(`/ask?${params}`);
  };
  async function analyze(id: string) {
    setAnalyzing((v) => [...v, id]);
    try {
      await api(`/api/items/${id}/index`, { method: "POST" });
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Organization unavailable.");
    } finally {
      setAnalyzing((v) => v.filter((x) => x !== id));
    }
  }
  async function commitDelete(items: SavedItem[]) {
    const result = await Promise.allSettled(
      items.map((item) => api(`/api/items/${item.id}`, { method: "DELETE" })),
    );
    const failed = items.filter((_, i) => result[i].status === "rejected");
    setRecords((values) =>
      values.filter(
        (item) =>
          !items.some((deleted) => deleted.id === item.id) ||
          failed.some((f) => f.id === item.id),
      ),
    );
    pendingDelete.current = [];
    setUndo([]);
    if (failed.length)
      setError(`Couldn’t delete ${failed.length} link(s). Please try again.`);
    await load();
  }
  function remove(items: SavedItem[]) {
    if (pendingDelete.current.length || busy) return;
    pendingDelete.current = items;
    setUndo(items);
    setSelected([]);
    timer.current = setTimeout(() => {
      setBusy(true);
      void commitDelete(items).finally(() => setBusy(false));
    }, 6000);
  }
  async function applyTag() {
    const tag = batchTag.trim().toLowerCase();
    if (!tag) return;
    const targets = records.filter((item) => selected.includes(item.id));
    if (
      targets.some((item) => !item.tags.includes(tag) && item.tags.length >= 8)
    ) {
      setError("One selected link already has 8 tags. Edit it first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/tags", { method: "POST", body: JSON.stringify({ tag }) });
      const result = await Promise.allSettled(
        targets.map((item) =>
          api(`/api/items/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              title: item.title || "",
              note: item.user_note || "",
              tags: [...new Set([...item.tags, tag])],
            }),
          }),
        ),
      );
      const failures = result.filter((r) => r.status === "rejected").length;
      setCustom((v) => [...new Set([...v, tag])]);
      setBatchOpen(false);
      setBatchTag("");
      if (failures)
        setError(
          `${failures} link(s) could not be updated. Their selection is retained.`,
        );
      else {
        setSelected([]);
        setNotice("Tag added.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add tag.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <WorkspaceShell
      active="library"
      email={props.email}
      onAdd={() => setOpen(true)}
      customTags={custom}
      tagCounts={counts}
      selectedTags={tags}
      onManageTags={() => setManage(true)}
    >
      <div className="page-heading">
        <h1>Library</h1>
        <span className="item-count" role="status">
          {total} {total === 1 ? "link" : "links"}
        </span>
      </div>
      <button
        className="ask-fab"
        aria-label="Open Ask Stash"
        title="Ask Stash"
        onClick={() => router.push("/ask")}
      >
        <Sparkles size={23} aria-hidden="true" />
      </button>
      <div className="library-controls">
        <form
          role="search"
          className="library-search"
          onSubmit={(e) => e.preventDefault()}
        >
          <Search size={18} />
          <input
            ref={searchRef}
            type="search"
            aria-label="Search your saves"
            placeholder="Search titles, notes, or tags…"
            value={query}
            maxLength={200}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <kbd title="Command K or Control K">⌘K / Ctrl K</kbd>
        </form>
        <Popover.Root open={filters} onOpenChange={setFilters}>
          <Popover.Trigger className="button button-secondary">
            <SlidersHorizontal size={16} />
            Filters
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner
              sideOffset={8}
              align="end"
              className="filter-positioner"
            >
              <Popover.Popup className="filter-panel">
                <Popover.Title className="filter-title">Filters</Popover.Title>
                <Popover.Close
                  className="icon-button filter-close"
                  aria-label="Close filters"
                >
                  <X size={16} />
                </Popover.Close>
                <div className="filter-selects">
                  <label>
                    Source
                    <select
                      aria-label="Source"
                      value={source}
                      onChange={(e) => {
                        setSource(e.target.value);
                        setPage(1);
                      }}
                    >
                      {sources.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.value === "all" ? "All sources" : s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Category
                    <select
                      aria-label="Category"
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">All categories</option>
                      {[
                        ...new Set([
                          ...records.map((i) => i.category).filter(Boolean),
                          "Uncategorized",
                        ]),
                      ].map((c) => (
                        <option key={c} value={c!}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Saved after
                    <input
                      className="input"
                      type="date"
                      aria-label="Saved after"
                      value={dateFrom}
                      max={dateTo || undefined}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                  <label>
                    Saved before
                    <input
                      className="input"
                      type="date"
                      aria-label="Saved before"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                  <label>
                    Group by
                    <select
                      aria-label="View"
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                    >
                      <option value="all">Ungrouped</option>
                      <option value="tags">Group by tag</option>
                      <option value="categories">Group by category</option>
                    </select>
                  </label>
                </div>
                <fieldset className="filter-tags">
                  <legend>Tags · match any</legend>
                  {allTags.map((tag) => (
                    <label key={tag}>
                      <input
                        type="checkbox"
                        checked={tags.includes(tag)}
                        onChange={(e) => {
                          setTags((v) =>
                            e.target.checked
                              ? [...v, tag]
                              : v.filter((t) => t !== tag),
                          );
                          setPage(1);
                        }}
                      />
                      {tagLabel(tag)}
                    </label>
                  ))}
                </fieldset>
                <button
                  className="text-button"
                  onClick={() => {
                    setFilters(false);
                    setManage(true);
                  }}
                >
                  Manage tags
                </button>
                <div className="filter-panel-actions">
                  <button className="text-button" onClick={reset}>
                    Clear filters
                  </button>
                  <button
                    className="button button-primary"
                    onClick={() => setFilters(false)}
                  >
                    Apply filters
                  </button>
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
        <label className="sort-control">
          <span className="sr-only">Sort by</span>
          <select
            aria-label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
        <div className="view-switch" role="group" aria-label="Display mode">
          {(
            [
              ["grid", Grid2X2],
              ["list", List],
              ["compact", Rows3],
            ] as const
          ).map(([name, Icon]) => (
            <button
              key={name}
              className="icon-button"
              aria-label={`${name[0].toUpperCase() + name.slice(1)} view`}
              title={`${name} view`}
              aria-pressed={layout === name}
              onClick={() => setLayout(name)}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
      </div>
      {(query ||
        tags.length > 0 ||
        source !== "all" ||
        category ||
        dateFrom ||
        dateTo) && (
        <div className="active-filters">
          {[
            ...(query
              ? [{ label: `Search: ${query}`, clear: () => setQuery("") }]
              : []),
            ...tags.map((tag) => ({
              label: tagLabel(tag),
              clear: () => setTags((v) => v.filter((t) => t !== tag)),
            })),
            ...(source !== "all"
              ? [
                  {
                    label:
                      sources.find((s) => s.value === source)?.label || source,
                    clear: () => setSource("all"),
                  },
                ]
              : []),
            ...(category
              ? [{ label: category, clear: () => setCategory("") }]
              : []),
            ...(dateFrom
              ? [{ label: `After ${dateFrom}`, clear: () => setDateFrom("") }]
              : []),
            ...(dateTo
              ? [{ label: `Before ${dateTo}`, clear: () => setDateTo("") }]
              : []),
          ].map(({ label, clear }) => (
            <button
              className="filter-chip"
              key={label}
              onClick={clear}
              aria-label={`Remove ${label} filter`}
            >
              {label}
              <X size={12} />
            </button>
          ))}
          <button className="text-button" onClick={reset}>
            Clear all
          </button>
        </div>
      )}
      {(notice || error) && (
        <div
          className={error ? "inline-error" : "inline-notice"}
          role={error ? "alert" : "status"}
        >
          {error || notice}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div
        className={`library-results layout-${["grid", "list", "compact"].includes(layout) ? layout : "grid"}`}
      >
        {shown.length ? (
          groups.map(([name, items]) => (
            <section className="link-section" key={name}>
              {group !== "all" && (
                <div className="section-heading">
                  <h2>
                    {name === "Uncategorized"
                      ? name
                      : name.charAt(0).toUpperCase() + name.slice(1)}
                  </h2>
                  <span>{items.length}</span>
                </div>
              )}
              <div className="link-list">
                {items.map((item) => (
                  <SavedLink
                    key={item.id}
                    item={item}
                    selected={selected.includes(item.id)}
                    onSelect={() =>
                      setSelected((v) =>
                        v.includes(item.id)
                          ? v.filter((id) => id !== item.id)
                          : [...v, item.id],
                      )
                    }
                    onRequestDelete={() => remove([item])}
                    deleting={!!undo.length || busy}
                    tagOptions={allTags}
                    analyzing={analyzing.includes(item.id)}
                    onAnalyze={analyze}
                    onEdited={(updated, reanalyze) => {
                      setRecords((v) =>
                        v.map((i) => (i.id === updated.id ? updated : i)),
                      );
                      setCustom((v) => [...new Set([...v, ...updated.tags])]);
                      if (reanalyze) void analyze(updated.id);
                    }}
                    onDeleted={() => void load()}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="empty-state">
            <h2>
              {records.length ? "No matching links." : "Save your first link."}
            </h2>
            <button
              className="button button-secondary"
              onClick={records.length ? reset : () => setOpen(true)}
            >
              {records.length ? "Clear filters" : "Add a link"}
            </button>
          </div>
        )}
      </div>
      {total > PAGE_SIZE && (
        <nav className="pagination" aria-label="Library pages">
          <button
            className="button button-secondary"
            disabled={currentPage === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {lastPage}
          </span>
          <button
            className="button button-secondary"
            disabled={currentPage === lastPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </nav>
      )}
      {!!selected.length && (
        <div
          className="selection-bar"
          role="region"
          aria-label="Selected link actions"
        >
          <button
            className="button button-primary"
            onClick={() => ask("Summarize the selected saved links.", selected)}
          >
            Ask Stash about these ({selected.length})
          </button>
          <button
            className="button button-secondary"
            onClick={() => setBatchOpen(true)}
          >
            Add tag
          </button>
          <button
            className="button button-secondary"
            disabled={busy || !!undo.length}
            onClick={() =>
              remove(records.filter((i) => selected.includes(i.id)))
            }
          >
            Delete
          </button>
          <button
            className="icon-button"
            aria-label="Clear selection"
            onClick={() => setSelected([])}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {!!undo.length && (
        <div className="undo-toast" role="status">
          {busy ? "Deleting…" : `${undo.length} link(s) removed`}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              if (timer.current) clearTimeout(timer.current);
              pendingDelete.current = [];
              setUndo([]);
            }}
          >
            Undo
          </button>
        </div>
      )}
      <LinkDialog
        open={open}
        onOpenChange={setOpen}
        tagOptions={allTags}
        defaultTags={tags}
        onSaved={(item) => {
          setRecords((v) => [item, ...v.filter((i) => i.id !== item.id)]);
          setCustom((v) => [...new Set([...v, ...item.tags])]);
          setCatalog((v) => [...new Set([...v, ...item.tags])]);
          reset();
          setNotice("Link saved.");
          void analyze(item.id);
        }}
      />
      {manage && (
        <TagManager
          open={manage}
          onOpenChange={setManage}
          tags={allTags}
          onChanged={(change) => {
            if (change) {
              setCustom((v) => [
                ...new Set(
                  v.flatMap((t) =>
                    t === change.from ? (change.to ? [change.to] : []) : [t],
                  ),
                ),
              ]);
              setTags((v) =>
                v.flatMap((t) =>
                  t === change.from ? (change.to ? [change.to] : []) : [t],
                ),
              );
            }
            void load();
            router.refresh();
          }}
          onCatalog={(values) => {
            setCatalog(values);
            setCustom((v) => [
              ...new Set([
                ...v.filter((t) => values.includes(t)),
                ...values.filter((t) => !catalog.includes(t)),
              ]),
            ]);
          }}
        />
      )}
      <Dialog.Root open={batchOpen} onOpenChange={setBatchOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="dialog-backdrop" />
          <Dialog.Viewport className="dialog-viewport">
            <Dialog.Popup className="dialog-popup">
              <Dialog.Title>Add tag to {selected.length} links</Dialog.Title>
              <Dialog.Description>
                Existing tags and notes are preserved.
              </Dialog.Description>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void applyTag();
                }}
              >
                <input
                  className="input"
                  aria-label="Tag to add"
                  value={batchTag}
                  onChange={(e) => setBatchTag(e.target.value)}
                  list="batch-tag-options"
                  required
                  maxLength={40}
                />
                <datalist id="batch-tag-options">
                  {allTags.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <div className="dialog-actions">
                  <Dialog.Close
                    className="button button-secondary"
                    disabled={busy}
                  >
                    Cancel
                  </Dialog.Close>
                  <button className="button button-primary" disabled={busy}>
                    Add tag
                  </button>
                </div>
              </form>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    </WorkspaceShell>
  );
}
function windowSafeFixtureTotal(
  props: LibraryProps,
  records: SavedItem[],
  filtered: SavedItem[],
) {
  return records === props.items && props.total > records.length
    ? props.total
    : filtered.length;
}
