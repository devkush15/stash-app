"use client";
import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/client-api";
import { usePreference, tagColors } from "./display-preferences";
import { tagLabel } from "./tag-picker";
export function TagManager({
  open,
  onOpenChange,
  tags,
  onChanged,
  onCatalog,
}: {
  onCatalog?: (tags: string[]) => void;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  tags: string[];
  onChanged: (change?: { from: string; to: string | null }) => void;
}) {
  const [catalog, setCatalog] = useState(tags),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState<string | null>(null),
    [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  function mutate(method: string, body: unknown) {
    start(async () => {
      setError("");
      setMessage("");
      try {
        const result = await api<{ tags: string[] }>("/api/tags", {
          method,
          body: JSON.stringify(body),
        });
        setCatalog(result.tags);
        onCatalog?.(result.tags);
        setDeleting(null);
        setMessage(
          method === "POST"
            ? "Tag created."
            : method === "PATCH"
              ? "Tag renamed."
              : "Tag removed. Your links are still saved.",
        );
        const payload = body as { from?: string; to?: string };
        onChanged(
          payload.from
            ? {
                from: payload.from,
                to:
                  method === "DELETE"
                    ? null
                    : (payload.to || "")
                        .trim()
                        .toLowerCase()
                        .replace(/\s+/g, " "),
              }
            : undefined,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn’t update tags.");
      }
    });
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          onOpenChange(value);
          setError("");
          setDeleting(null);
          if (value) setCatalog(tags);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Viewport className="dialog-viewport">
          <Dialog.Popup className="dialog-popup">
            <div className="dialog-heading-row">
              <Dialog.Title className="dialog-title">Manage tags</Dialog.Title>
              <Dialog.Close
                className="icon-button"
                aria-label="Close tag manager"
                disabled={pending}
              >
                <X size={18} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="dialog-description">
              Rename or remove a tag across your library. Your links stay saved.
            </Dialog.Description>
            <form
              className="tag-manager-create"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                mutate("POST", { tag: form.get("tag") });
                event.currentTarget.reset();
              }}
            >
              <input
                className="input"
                name="tag"
                aria-label="New tag"
                placeholder="New tag"
                required
                maxLength={40}
                disabled={pending}
              />
              <button
                className="icon-button"
                aria-label="Create tag"
                disabled={pending}
              >
                <Plus size={18} />
              </button>
            </form>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            {(pending || message) && (
              <p className="muted" role="status">
                {pending ? "Updating tags…" : message}
              </p>
            )}
            {deleting && (
              <div className="tag-confirm" role="alert">
                <p>
                  Remove “{tagLabel(deleting)}” from your links? The links and
                  notes will remain.
                </p>
                <button
                  className="button button-danger"
                  disabled={pending}
                  onClick={() => mutate("DELETE", { from: deleting })}
                >
                  Remove tag
                </button>
                <button
                  className="button button-secondary"
                  disabled={pending}
                  onClick={() => setDeleting(null)}
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="tag-manager-list">
              {catalog.map((tag) => (
                <form
                  key={tag}
                  className="tag-manager-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    mutate("PATCH", {
                      from: tag,
                      to: new FormData(event.currentTarget).get("name"),
                    });
                  }}
                >
                  <TagColorPicker tag={tag} />
                  <input
                    className="input"
                    name="name"
                    aria-label={`Rename ${tag}`}
                    defaultValue={tag}
                    maxLength={40}
                    required
                    disabled={pending}
                  />
                  <button
                    className="icon-button"
                    aria-label={`Save ${tag}`}
                    disabled={pending}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${tag}`}
                    disabled={pending}
                    onClick={() => setDeleting(tag)}
                  >
                    <Trash2 size={16} />
                  </button>
                </form>
              ))}
            </div>
            {!catalog.length && (
              <p className="muted">
                Create a tag here, or add one while saving a link.
              </p>
            )}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TagColorPicker({ tag }: { tag: string }) {
  const [color, setColor] = usePreference(`stash-tag-color:${tag}`, "neutral");
  return (
    <select
      className="tag-color-select"
      aria-label={`Color for ${tag}`}
      value={color}
      onChange={(e) => setColor(e.target.value)}
      style={{ color: tagColors[color as keyof typeof tagColors] }}
    >
      {Object.keys(tagColors).map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
