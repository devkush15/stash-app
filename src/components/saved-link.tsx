"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ExternalLink, Trash2, LoaderCircle } from "lucide-react";
import { api } from "@/lib/client-api";
import { SourceIcon } from "./source-icon";
import { displayUrl, linkTitle, sources } from "@/lib/links";
import type { SavedItem } from "@/lib/database.types";

export function SavedLink({
  item,
  onDeleted,
  onAnalyze,
  analyzing = false,
}: {
  item: SavedItem;
  onDeleted: () => void;
  onAnalyze?: (id: string) => void;
  analyzing?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const title = linkTitle(item);
  const source =
    sources.find((s) => s.value === item.platform)?.label || "Website";
  const date = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(item.created_at));
  return (
    <article className="saved-link" data-testid="saved-link">
      <a
        className="saved-link-main"
        href={item.original_url}
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
        <p className="card-url" title={item.original_url} dir="auto">
          {displayUrl(item.original_url)}
        </p>
        {item.summary && <p className="card-summary">{item.summary}</p>}
        {item.category && (
          <span className="card-category">{item.category}</span>
        )}
        {item.tags.length > 0 && (
          <div className="card-tags">
            {item.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        )}
      </a>
      {item.processing_status !== "ready" && (
        <div className="index-status">
          <span title={item.indexing_note || undefined}>
            {analyzing
              ? "Analyzing…"
              : item.processing_status === "limited"
                ? "Limited indexing"
                : item.processing_status === "pending"
                  ? "Ready to analyze"
                  : item.processing_status === "deferred"
                    ? "Link saved · AI deferred"
                    : item.processing_status === "failed"
                      ? "Analysis unavailable"
                      : "Link saved"}
          </span>
          {!item.ai_processed_at && onAnalyze && (
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
      )}
      {item.processing_status === "limited" && item.indexing_note && (
        <p className="index-note">{item.indexing_note}</p>
      )}
      <div className="card-footer">
        <span className="card-saved">
          Saved{" "}
          <time
            dateTime={item.created_at}
            title={new Date(item.created_at).toISOString()}
          >
            {date}
          </time>
        </span>
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
                          {
                            setOpen(false);
                            onDeleted();
                          }
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
    </article>
  );
}
