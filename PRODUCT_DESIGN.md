# Stash — product and interaction decisions

## Problem and jobs

People save useful links across platforms, then lose the context needed to find them. Stash promises: **Save effortlessly. Organize flexibly. Find intuitively.**

1. **Capture:** frequent, time-sensitive. Add Link is always one action away. Only a URL is required; title, notes and multiple tags stay optional.
2. **Retrieve:** frequent. Library search is immediate, predictable keyword matching across saved titles, notes, tags and accessible text. It needs no AI credits.
3. **Organize:** occasional and reversible. Recognizable colored tags, multiple filters, and lightweight tag management avoid a folder hierarchy.
4. **Understand:** intentional. Ask Stash retrieves this account's relevant records before producing a grounded answer with clickable sources. It distinguishes personal notes, public text, and unavailable media.

## Information architecture

- **Library** — default All Links, search, source and tag filters, newest/oldest/title sort; optional category grouping. All Links renders each database record once. Grouping can repeat a link under its tags without duplicating the stored item. Items without context have an explicit Uncategorized group.
- **Ask Stash** — a separate, clearly named destination for questions and natural-language retrieval. Answer and references stay together. Empty libraries, no relevant evidence, exhausted capacity and inaccessible content have explicit states.
- **Add Link** — a shared dialog accessible from both destinations. Paste URL, optionally edit the title, add notes and choose/create tags. Saving persists the link before indexing.
- **Secondary actions** — item overflow menu for edit/delete; a lightweight tag dialog for create/rename/delete. Deleting a tag removes its assignments, never its links.

Library and Ask are peers. The user chose Tabs for the two primary jobs and asked to retain the familiar desktop source sidebar, branding and account area. Source shortcuts remain secondary under Library; phone users access the same sources in Filters. The platform choices do not become additional primary destinations. URL parameters retain search, multiple selected tags, source, sort and view across refresh/back navigation. Multiple tag filters use **any selected tag** (OR), stated next to the control; this supports recognition without unexpectedly hiding links.

## Tradeoffs and rationale

- Default to an ungrouped list for a complete, nonduplicated inventory. Grouped browsing is an explicit view choice, not an inferred primary-tag hierarchy.
- Show title first, a short source domain/link second, notes only when present, and actual tags. Clamp long text with full text available in Edit; do not show raw tracking URLs.
- Keep user-selected tags authoritative. AI supplies useful organization when public information is accessible; restricted sources keep their original URL and manual context.
- Separate free Library search from quota-limited Ask. A question never silently changes the meaning of ordinary search.
- Ask uses bounded retrieval over existing SQLite records and one existing Gemini call for grounded selection/answers. No vectors, workers, extra database, paid API or new hosting.
- Validate citations against the current user's retrieved record IDs. Use source quotations/excerpts as evidence, reject unsupported references, and fall back to actual matching records when AI is unavailable. Notes remain labelled as user context, not verified source content.
- Tag rename/delete is transactional and scoped to the current account. Renaming into an existing tag merges assignments; deleting preserves the link and its notes. Confirmation names the affected tag and says links remain.
- System typography, warm neutral surfaces, restrained colored tags and compact rows prioritize legibility over decoration. Touch controls have generous targets, inputs remain at least 16px on coarse pointers, reduced motion and browser zoom remain supported.
- A shared sun/moon control switches light and dark appearance in Login, Library and Ask. It starts from the device preference, remembers an explicit choice locally, and applies it before paint. It adds no settings screen or account configuration.

## Five critical flows

A. **Capture:** Add Link → paste URL → optional notes/tags → Save → visible Library entry immediately; analysis status follows independently.

B. **Browse:** Library → choose tag/category or grouped view → recognize title/notes → open the original via its visible link.

C. **Find:** Library search → matching stored text immediately → refine tags/source/sort → open result. No AI credit required.

D. **Understand:** Ask Stash → submit question → retrieve relevant private records → grounded answer with numbered clickable references and explicit information gaps. If AI is unavailable, show matching saved sources rather than an invented answer.

E. **Correct:** item menu → Edit → update title, notes, multiple tags → Save → refreshed grouping and search. Only changed notes request fresh AI organization; manual title/tag edits do not spend AI credits.

## Navigation exploration and validation

Use the installed prototype skill on **primary navigation only**, in an isolated development harness: Desk (persistent sidebar), Tabs (compact top navigation), and Focus (search-centered navigation). Compared discoverability, capture access and phone density using real saved data and functional Library/Ask views; the user selected Tabs. The finished app ships one coherent direction, with no prototype picker or test data.

Validate actual rendered screens with empty/one/many records, 200-character titles, 1,000-character notes, eight 40-character tags, missing metadata, non-Latin text and emoji. The existing dev-only Demo/Worst case toggle must not ship. Check 320/390/768/1440px, 200% text and reduced motion; physical phone keyboard/safe-area behavior must be reported separately from browser emulation.

Acceptance: all five flows work against persistent storage; tag changes preserve ownership and data; Ask cites only retrieved saved items; no account can see another account's records; lint, types, tests, production build and the existing GitHub→Vercel deployment pass.
