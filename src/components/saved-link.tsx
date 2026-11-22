"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ExternalLink, Pencil, Trash2, LoaderCircle } from "lucide-react";
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
}: {
  item: SavedItem;
  onDeleted: () => void;
  onEdited?: (item: SavedItem, reanalyze: boolean) => void;
  onAnalyze?: (id: string) => void;
  analyzing?: boolean;
  tagOptions?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const title = linkTitle(item);
  const source =
    sources.find((s) => s.value === item.platform)?.label || "Website";
  const needsDescription =
    item.processing_status === "limited" &&
    !item.ai_processed_at &&
    !item.user_note;
  const retry =
    !item.ai_processed_at &&
    ["pending", "failed", "deferred"].includes(item.processing_status) &&
    (item.processing_status === "pending" ||
      item.metadata_level !== "none" ||
      Boolean(item.user_note));
  const status = analyzing
    ? "Analyzing…"
    : needsDescription
      ? "Add description"
      : item.processing_status === "limited"
        ? item.user_note
          ? "From your description"
          : "Metadata only"
        : item.processing_status === "deferred"
          ? "AI deferred"
          : item.processing_status === "failed"
            ? "Analysis unavailable"
            : "";
  return (
    <article className="saved-link" data-testid="saved-link">
      <a
        className="saved-link-main"
        href={originalLink(item)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${title} (opens in a new tab)`}
      >
        <div className="card-source-row">
          <span className={`source-mark source-${item.platform}`}>
            <SourceIcon platform={item.platform} />
          </span>
          <span className="card-source">
            {source === "Websites" ? "Website" : source}
          </span>
          <ExternalLink
            className="external-icon"
            size={15}
            aria-hidden="true"
          />
        </div>
        <h2 className="card-title" dir="auto" title={title}>
          {title}
        </h2>
      </a>
      <div className="card-footer">
        <div className="card-details">
          {item.category && (
            <span className="card-category">{item.category}</span>
          )}
          {status &&
            (needsDescription ? (
              <button
                className="card-status status-action"
                onClick={() => setEditing(true)}
              >
                {status}
              </button>
            ) : (
              <span
                className="card-status"
                role="status"
                title={item.indexing_note || undefined}
              >
                {status}
              </span>
            ))}
          {retry && onAnalyze && (
            <button
              className="analyze-button"
              disabled={analyzing}
              onClick={() => onAnalyze(item.id)}
            >
              {analyzing ? (
                <LoaderCircle
                  className="spinner"
                  size={14}
                  aria-label="Analyzing"
                />
              ) : (
                "Analyze"
              )}
            </button>
          )}
        </div>
        <div className="card-actions">
          <button
            className="icon-button"
            aria-label={`Edit ${title}`}
            disabled={analyzing}
            onClick={() => setEditing(true)}
          >
            <Pencil size={15} aria-hidden="true" />
          </button>
          <Dialog.Root
            open={open}
            onOpenChange={(value) => {
              if (!pending) {
                setOpen(value);
                setError("");
              }
            }}
          >
            <Dialog.Trigger
              className="icon-button delete-trigger"
              aria-label={`Delete ${title}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </Dialog.Trigger>
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
