"use client";

import { useRef, useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Link2, LoaderCircle, X } from "lucide-react";
import { api } from "@/lib/client-api";
import type { SavedItem } from "@/lib/database.types";
import { MAX_URL_LENGTH, MAX_TITLE_LENGTH, parseLink } from "@/lib/links";

export function LinkDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onSaved: (item: SavedItem) => void;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          onOpenChange(value);
          setError("");
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Viewport className="dialog-viewport">
          <Dialog.Popup
            className="dialog-popup"
            initialFocus={() =>
              window.matchMedia("(pointer: coarse)").matches
                ? true
                : inputRef.current
            }
          >
            <div className="dialog-header">
              <span className="dialog-symbol">
                <Link2 size={20} aria-hidden="true" />
              </span>
              <Dialog.Close
                className="icon-button"
                aria-label="Close dialog"
                disabled={pending}
              >
                <X size={20} aria-hidden="true" />
              </Dialog.Close>
            </div>
            <Dialog.Title className="dialog-title">Add a link</Dialog.Title>
            <Dialog.Description className="sr-only">
              Save a URL to your private library.
            </Dialog.Description>
            <form
              ref={formRef}
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                startTransition(async () => {
                  setError("");
                  try {
                    parseLink(form.get("url"));
                    const result = await api<{ item: SavedItem }>(
                      "/api/items",
                      {
                        method: "POST",
                        body: JSON.stringify({
                          url: form.get("url"),
                          title: form.get("title"),
                        }),
                      },
                    );
                    {
                      formRef.current?.reset();
                      onOpenChange(false);
                      onSaved(result.item);
                    }
                  } catch (error) {
                    setError(
                      error instanceof Error
                        ? error.message
                        : "Couldn’t save this link.",
                    );
                  }
                });
              }}
              className="link-form"
            >
              <div>
                <label htmlFor="link-url">URL</label>
                <input
                  ref={inputRef}
                  className="input"
                  id="link-url"
                  name="url"
                  type="url"
                  placeholder="https://…"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="url"
                  enterKeyHint="next"
                  required
                  maxLength={MAX_URL_LENGTH}
                  disabled={pending}
                  aria-describedby={error ? "save-error" : undefined}
                />
              </div>
              <div>
                <label htmlFor="link-title">
                  Title <span className="optional">Optional</span>
                </label>
                <input
                  className="input"
                  id="link-title"
                  name="title"
                  placeholder="Give it a name"
                  maxLength={MAX_TITLE_LENGTH}
                  disabled={pending}
                  enterKeyHint="done"
                />
              </div>
              {error && (
                <p className="error-message" id="save-error" role="alert">
                  {error}
                </p>
              )}
              <div className="dialog-actions">
                <Dialog.Close
                  className="button button-secondary"
                  disabled={pending}
                >
                  Cancel
                </Dialog.Close>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={pending}
                >
                  {pending && (
                    <LoaderCircle
                      className="spinner"
                      size={16}
                      aria-hidden="true"
                    />
                  )}
                  {pending ? "Saving…" : "Save link"}
                </button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
