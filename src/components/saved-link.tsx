"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ExternalLink, Pencil, Trash2, LoaderCircle, Tags } from "lucide-react";
import { useClientReady } from "@/lib/use-client-ready";
import { api } from "@/lib/client-api";
import { SourceIcon } from "./source-icon";
import { LinkDialog } from "./link-dialog";
import { originalLink, linkTitle, sources } from "@/lib/links";
import type { SavedItem } from "@/lib/database.types";

export function SavedLink({
  item,
  onDeleted,
  onEdited,
  onAnalyze,
  analyzing = false,
  tagOptions = [],
  selected = false,
  onSelect,
  onRequestDelete,
  deleting = false,
}: {
  item: SavedItem;
  selected?: boolean;
  onSelect?: () => void;
  onRequestDelete?: () => void;
  deleting?: boolean;
  onDeleted: () => void;
  onEdited?: (item: SavedItem, reanalyze: boolean) => void;
  onAnalyze?: (id: string) => void;
  analyzing?: boolean;
  tagOptions?: string[];
}) {
  const ready = useClientReady();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const title = linkTitle(item);
  const target = originalLink(item);
  const working = analyzing || item.processing_status === "processing";
  const source =
    sources.find((s) => s.value === item.platform)?.label || "Website";
  const needsDescription =
    ["limited", "failed"].includes(item.processing_status) &&
    item.metadata_level === "none" &&
    !item.user_note;
  const retry =
    !working &&
    !item.ai_processed_at &&
    ["pending", "failed", "deferred"].includes(item.processing_status) &&
    (item.processing_status === "pending" ||
      item.metadata_level !== "none" ||
      Boolean(item.user_note));
  const status = working
    ? "Organizing…"
    : needsDescription
      ? "Public content unavailable"
      : item.processing_status === "limited"
        ? ""
        : item.processing_status === "deferred"
          ? "Organization deferred · link saved"
          : item.processing_status === "failed"
            ? "Organization unavailable · link saved"
            : "";
  return (
    <article
      className={`saved-link ${selected ? "is-selected" : ""}`}
      data-testid="saved-link"
    >
      {onSelect && (
        <input
          className="card-select"
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          aria-label={`Select ${title}`}
        />
      )}
      <div role="img" className="entry-logo" title={source} aria-label={source}>
        <SourceIcon platform={item.platform} />
      </div>
      <div className="entry-content">
        <a
          className="entry-title"
          href={target}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${title} (opens in a new tab)`}
        >
          <h3 className="card-title" dir="auto" title={title}>
            {title}
          </h3>
        </a>
        {item.user_note && (
          <p className="entry-note" title={item.user_note} dir="auto">
            <span>Your note · </span>
            {item.user_note}
          </p>
        )}
        {status && (
          <span
            className="entry-status"
            role="status"
            title={item.indexing_note || undefined}
          >
            {status}
          </span>
        )}
        {needsDescription && !working && (
          <button
            className="entry-status status-action"
            disabled={!ready}
            onClick={() => setEditing(true)}
          >
            Add a note
          </button>
        )}
        {retry && onAnalyze && (
          <button
            className="analyze-button"
            disabled={analyzing || !ready}
            onClick={() => onAnalyze(item.id)}
          >
            {analyzing ? (
              <LoaderCircle
                className="spinner"
                size={14}
                aria-label="Analyzing"
              />
            ) : item.processing_status === "pending" ? (
              "Organize link"
            ) : (
              "Retry organization"
            )}
          </button>
        )}
      </div>
      <div className="card-footer">
        <div className="card-actions">
          <div className="quick-actions">
            <a
              className="icon-button"
              href={target}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${title}`}
            >
              <ExternalLink size={15} />
            </a>
            <button
              className="icon-button"
              aria-label={`Edit tags for ${title}`}
              disabled={!ready || analyzing}
              onClick={() => setEditing(true)}
            >
              <Tags size={15} />
            </button>
            <button
              className="icon-button"
              aria-label={`Edit ${title}`}
              disabled={!ready || analyzing}
              onClick={() => setEditing(true)}
            >
              <Pencil size={15} />
            </button>
            <button
              className="icon-button"
              aria-label={`Delete ${title}`}
              disabled={!ready || deleting}
              onClick={() =>
                onRequestDelete ? onRequestDelete() : setOpen(true)
              }
            >
              <Trash2 size={15} />
            </button>
          </div>
          <Dialog.Root
            open={open}
            onOpenChange={(value) => {
              if (!pending) {
                setOpen(value);
                setError("");
              }
            }}
          >
            <Dialog.Portal>
              <Dialog.Backdrop className="dialog-backdrop" />
              <Dialog.Viewport className="dialog-viewport">
                <Dialog.Popup className="dialog-popup delete-popup">
                  <Dialog.Title className="dialog-title">
                    Delete this link?
                  </Dialog.Title>
                  <Dialog.Description className="dialog-description">
                    It will be removed from your Stash. The original stays where
                    it is.
                  </Dialog.Description>
                  <p className="delete-link-title" dir="auto">
                    {title}
                  </p>
                  {error && (
                    <p className="error-message" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="dialog-actions">
                    <Dialog.Close
                      className="button button-secondary"
                      disabled={pending}
                    >
                      Keep link
                    </Dialog.Close>
                    <button
                      className="button button-danger"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await api(`/api/items/${item.id}`, {
                              method: "DELETE",
                            });
                            setOpen(false);
                            onDeleted();
                          } catch (error) {
                            setError(
                              error instanceof Error
                                ? error.message
                                : "Couldn’t delete this link.",
                            );
                          }
                        })
                      }
                    >
                      {pending && (
                        <LoaderCircle
                          className="spinner"
                          size={16}
                          aria-hidden="true"
                        />
                      )}
                      {pending ? "Deleting…" : "Delete link"}
                    </button>
                  </div>
                </Dialog.Popup>
              </Dialog.Viewport>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
      <LinkDialog
        key={`${item.id}:${item.updated_at}`}
        item={item}
        tagOptions={tagOptions}
        open={editing}
        onOpenChange={setEditing}
        onSaved={(updated, reanalyze) =>
          onEdited?.(updated, Boolean(reanalyze))
        }
      />
    </article>
  );
}
