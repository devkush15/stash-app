"use client";

import { useRef, useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import { TagPicker } from "./tag-picker";
import type { SavedItem } from "@/lib/database.types";
import {
  MAX_URL_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_NOTE_LENGTH,
  parseLink,
} from "@/lib/links";

export function LinkDialog({
  open,
  onOpenChange,
  onSaved,
  item,
  tagOptions = [],
  defaultTags = [],
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onSaved: (item: SavedItem, reanalyze?: boolean) => void;
  item?: SavedItem;
  tagOptions?: string[];
  defaultTags?: string[];
}) {
  const [error, setError] = useState("");
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState(item?.tags || defaultTags);
  const [submitting, startTransition] = useTransition();
  const [creatingTag, setCreatingTag] = useState(false);
  const pending = submitting || creatingTag;
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
              <Dialog.Title className="dialog-title">
                {item ? "Edit link" : "Add a link"}
              </Dialog.Title>
              <Dialog.Close
                className="icon-button"
                aria-label="Close dialog"
                disabled={pending}
              >
                <X size={20} aria-hidden="true" />
              </Dialog.Close>
            </div>
            <Dialog.Description
              className={item?.indexing_note ? "dialog-description" : "sr-only"}
            >
              {item?.indexing_note || "Save a URL to your private library."}
            </Dialog.Description>
            <form
              method="post"
              ref={formRef}
              onSubmit={(event) => {
                event.preventDefault();
                if (pending) return;
                const form = new FormData(event.currentTarget);
                startTransition(async () => {
                  setError("");
                  try {
                    if (!item) parseLink(form.get("url"));
                    const result = await api<{
                      item: SavedItem;
                      reanalyze?: boolean;
                    }>(item ? `/api/items/${item.id}` : "/api/items", {
                      method: item ? "PATCH" : "POST",
                      body: JSON.stringify({
                        url: form.get("url"),
                        title: form.get("title"),
                        note: form.get("note"),
                        tags: selectedTags,
                      }),
                    });
                    {
                      formRef.current?.reset();
                      if (!item) setSelectedTags(defaultTags);
                      onOpenChange(false);
                      onSaved(result.item, item ? result.reanalyze : true);
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
              {!item && (
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
              )}
              <div>
                <label htmlFor="link-title">
                  Title <span className="optional">Optional</span>
                </label>
                <input
                  ref={item ? inputRef : undefined}
                  className="input"
                  id="link-title"
                  name="title"
                  defaultValue={item?.title || ""}
                  placeholder="What will you look for later?"
                  maxLength={MAX_TITLE_LENGTH}
                  disabled={pending}
                  enterKeyHint="done"
                />
              </div>
              <div>
                <label htmlFor="link-note">
                  Notes <span className="optional">Optional</span>
                </label>
                <textarea
                  id="link-note"
                  name="note"
                  className="input"
                  rows={2}
                  maxLength={MAX_NOTE_LENGTH}
                  defaultValue={item?.user_note || ""}
                  placeholder="Add your context, or a caption you can access."
                  disabled={pending}
                />
              </div>
              <fieldset className="tag-fieldset" disabled={pending}>
                <legend>
                  Tags <span className="optional">Optional</span>
                </legend>
                <TagPicker
                  options={tagOptions}
                  selected={selectedTags}
                  onChange={setSelectedTags}
                  onCreate={async (tag) => {
                    setCreatingTag(true);
                    try {
                      await api("/api/tags", {
                        method: "POST",
                        body: JSON.stringify({ tag }),
                      });
                      setSelectedTags((values) => [
                        ...new Set([...values, tag]),
                      ]);
                      router.refresh();
                    } finally {
                      setCreatingTag(false);
                    }
                  }}
                />
              </fieldset>
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
                  {creatingTag
                    ? "Adding tag…"
                    : submitting
                      ? "Saving…"
                      : item
                        ? "Save changes"
                        : "Save link"}
                </button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
