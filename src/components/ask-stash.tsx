"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, LoaderCircle, MessageCircle, Send } from "lucide-react";
import { WorkspaceShell } from "./workspace-shell";
import { LinkDialog } from "./link-dialog";
import { useClientReady } from "@/lib/use-client-ready";
import { api } from "@/lib/client-api";
import { linkTitle, originalLink } from "@/lib/links";
import type { SavedItem } from "@/lib/database.types";
import type { GroundedClaim } from "@/lib/ask";
import { useRouter } from "next/navigation";
type Answer = {
  mode: "empty" | "sources" | "answer";
  claims: GroundedClaim[];
  sources: SavedItem[];
  note: string;
};
export function AskPanel({
  topics = [],
  hasContent = true,
  onAdd,
}: {
  topics?: string[];
  hasContent?: boolean;
  onAdd?: () => void;
}) {
  const ready = useClientReady();
  const [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState<Answer | null>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [asked, setAsked] = useState("");
  const suggestions = topics.length
    ? [
        ...topics
          .slice(0, 2)
          .map((topic) => `What have I saved about ${topic}?`),
        "Summarize my notes.",
      ]
    : [
        "What have I saved about venture capital?",
        "Summarize my notes on pricing strategies.",
        "Where’s that recipe I saved?",
      ];
  async function ask(value: string) {
    if (!value.trim() || pending) return;
    setPending(true);
    setError("");
    setAnswer(null);
    setAsked(value.trim());
    try {
      setAnswer(
        await api<Answer>("/api/ask", {
          method: "POST",
          body: JSON.stringify({ question: value.trim() }),
        }),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn’t ask Stash. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }
  if (!hasContent)
    return (
      <div className="ask-panel">
        <div className="page-heading">
          <h1>Ask Stash</h1>
        </div>
        <div className="empty-state">
          <MessageCircle size={28} />
          <h2>Your saved knowledge starts here.</h2>
          <p>Save a link or a personal note, then ask about it.</p>
          <button
            className="button button-primary"
            disabled={!ready}
            onClick={onAdd}
          >
            Add a link
          </button>
        </div>
      </div>
    );
  return (
    <div className="ask-panel">
      <div className="page-heading">
        <h1>Ask Stash</h1>
      </div>
      <form
        className="ask-form"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
      >
        <label htmlFor="ask-question">
          What would you like to find or understand?
        </label>
        <textarea
          id="ask-question"
          className="input"
          maxLength={500}
          rows={3}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about your saved links or personal notes…"
          disabled={pending || !ready}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void ask(question);
            }
          }}
        />
        <div className="ask-form-footer">
          <span>Uses your saved content and notes.</span>
          <button
            className="button button-primary"
            disabled={pending || !ready || !question.trim()}
          >
            {pending ? (
              <LoaderCircle size={16} className="spinner" />
            ) : (
              <Send size={16} />
            )}{" "}
            {pending ? "Finding sources…" : "Ask Stash"}
          </button>
        </div>
      </form>
      {!answer && !pending && !error && (
        <div className="ask-suggestions">
          <span>Try asking</span>
          {suggestions.map((value) => (
            <button
              className="suggestion-button"
              disabled={!ready}
              key={value}
              onClick={() => {
                setQuestion(value);
                void ask(value);
              }}
            >
              {value}
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
      )}
      {pending && (
        <div className="ask-progress" role="status">
          <LoaderCircle size={18} className="spinner" />
          Reading your relevant saved sources…
        </div>
      )}
      {error && (
        <div className="inline-error" role="alert">
          {error}
          <button className="text-button" onClick={() => void ask(asked)}>
            Try again
          </button>
        </div>
      )}
      {answer && (
        <section
          className="ask-answer"
          aria-label="Stash answer"
          aria-live="polite"
        >
          <div className="answer-heading">
            <MessageCircle size={19} />
            <h2>
              {answer.mode === "sources"
                ? "Matching saved sources"
                : "From your Stash"}
            </h2>
          </div>
          <p className="answer-note">{answer.note}</p>
          {answer.claims.length > 0 && (
            <ul className="answer-points">
              {answer.claims.map((claim, index) => {
                const sourceIndex = answer.sources.findIndex(
                  (source) => source.id === claim.sourceId,
                );
                return (
                  <li key={index}>
                    {claim.text}{" "}
                    <a
                      className="citation"
                      href={`#source-${claim.sourceId}`}
                      aria-label={`Source ${sourceIndex + 1}`}
                    >
                      [{sourceIndex + 1}]
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          {answer.sources.length > 0 && (
            <div className="answer-sources">
              <h3>Sources</h3>
              {answer.sources.map((source, index) => (
                <article
                  className="answer-source"
                  id={`source-${source.id}`}
                  key={source.id}
                >
                  <a
                    href={originalLink(source)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="source-number">{index + 1}</span>
                    {linkTitle(source)}
                    <ArrowUpRight size={15} />
                  </a>
                  {answer.claims
                    .filter((claim) => claim.sourceId === source.id)
                    .map((claim, n) => (
                      <div className="source-evidence" key={n}>
                        <span>
                          {claim.field === "notes"
                            ? "Your note"
                            : claim.field === "metadata"
                              ? "Public metadata"
                              : claim.field === "title" ||
                                  claim.field === "tags"
                                ? "Saved context"
                                : "Saved text"}
                        </span>
                        <blockquote>{claim.quote}</blockquote>
                      </div>
                    ))}
                  {answer.mode === "sources" && (
                    <p>
                      {source.user_note ||
                        source.summary ||
                        source.description ||
                        "Open the original link to read more."}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
          {answer.mode === "empty" && (
            <Link href="/library" className="button button-secondary">
              Go to Library
            </Link>
          )}
          {!answer.sources.length && answer.mode !== "empty" && (
            <Link href="/library" className="text-button">
              Search your Library
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
export function AskStash({
  email,
  tags,
  hasContent = true,
}: {
  email: string;
  tags: string[];
  hasContent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <WorkspaceShell active="ask" email={email} onAdd={() => setOpen(true)}>
      <AskPanel
        topics={tags}
        hasContent={hasContent}
        onAdd={() => setOpen(true)}
      />
      <LinkDialog
        open={open}
        onOpenChange={setOpen}
        tagOptions={tags}
        onSaved={(item) => {
          void api(`/api/items/${item.id}/index`, { method: "POST" })
            .catch(() => {})
            .finally(() => router.refresh());
          router.push("/library");
        }}
      />
    </WorkspaceShell>
  );
}
