"use client";
import { useState } from "react";
import { Check, Plus, X } from "lucide-react";

export function tagTone(tag: string) {
  return [...tag].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6;
}
export function tagLabel(tag: string) {
  return tag.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
export function TagPicker({
  options,
  selected,
  onChange,
  onCreate,
  single = false,
}: {
  options: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
  onCreate?: (tag: string) => Promise<void>;
  single?: boolean;
}) {
  const [adding, setAdding] = useState(false),
    [value, setValue] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const available = [...new Set([...options, ...selected])];
  const visible =
    single && !expanded
      ? available.filter((tag, index) => index < 8 || selected.includes(tag))
      : available;
  async function create() {
    const tag = value.trim().toLowerCase().replace(/\s+/g, " ");
    if (!tag) return;
    if (!single && selected.length >= 8) {
      setError("Choose up to 8 tags.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (onCreate) await onCreate(tag);
      else onChange([...new Set([...selected, tag])]);
      setValue("");
      setAdding(false);
      setExpanded(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn’t add tag.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="tag-picker">
      <div className="tag-pills">
        {single && (
          <button
            type="button"
            className="tag-pill tag-all"
            aria-pressed={!selected.length}
            onClick={() => onChange([])}
          >
            All
          </button>
        )}
        {visible.map((tag) => (
          <button
            type="button"
            key={tag}
            className={`tag-pill tag-tone-${tagTone(tag)}`}
            aria-pressed={selected.includes(tag)}
            onClick={() => {
              setError("");
              if (selected.includes(tag))
                onChange(selected.filter((t) => t !== tag));
              else if (single) onChange([tag]);
              else if (selected.length < 8) onChange([...selected, tag]);
              else setError("Choose up to 8 tags.");
            }}
          >
            {tagLabel(tag)}
          </button>
        ))}
        {single && available.length > 8 && (
          <button
            type="button"
            className="tag-pill"
            aria-expanded={expanded}
            aria-label={expanded ? "Show fewer tags" : "Show all tags"}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Less" : "More"}
          </button>
        )}
        <button
          type="button"
          className="tag-pill tag-add"
          aria-label="Add a tag"
          aria-expanded={adding}
          onClick={() => setAdding(!adding)}
        >
          <Plus size={17} aria-hidden="true" />
        </button>
      </div>
      {adding && (
        <div className="tag-create">
          <input
            className="input"
            aria-label="New tag"
            placeholder="Name your tag"
            maxLength={40}
            value={value}
            disabled={busy}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void create();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setAdding(false);
              }
            }}
          />
          <button
            type="button"
            className="icon-button"
            aria-label="Create tag"
            disabled={busy || !value.trim()}
            onClick={() => void create()}
          >
            <Check size={18} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Cancel new tag"
            onClick={() => setAdding(false)}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
