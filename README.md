# stash.

A small working assignment prototype: register → save a link → AI organizes accessible content → search → open the original.

- Existing private repository: https://github.com/devkush15/stash-app
- Existing Vercel project: `stash-app`, scope `devanshi9`
- Production URL: https://stash-app-sigma.vercel.app

## Small architecture

Next.js App Router, TypeScript, Tailwind, four SQLite tables (`users`, `sessions`, `saved_items`, `usage_counts`), and one Gemini REST integration. Backend operations use Next.js API routes. No external authentication provider, SMTP, separate server, queue, worker, vector database, payment system, or analytics service is required.

Passwords use salted scrypt (N=131072, r=8, p=1). Sessions are random opaque tokens in HTTP-only, SameSite=Lax cookies, Secure in production. Only token hashes are stored in SQLite. Sessions expire after 30 days and are revoked server-side at logout. Every link lookup, update, deletion, and search is scoped to the current user's ID with parameterized SQL.

## Run

Use Node.js 24 and npm:

```sh
npm ci
# For a fresh clone, copy .env.example to .env.local.
# Preserve an existing .env.local.
npm run dev
```

Open http://localhost:3000. In local development, without Turso credentials, the app uses the real persistent SQLite database `.data/stash.db`. This file is ignored by Git. Vercel explicitly rejects missing hosted database credentials and never uses a local file for persistence.

## Hosted database: Turso Free

1. Sign in at https://app.turso.tech and keep the Free plan (no credit card is required).
2. Create one **libSQL** database named `stash-app`. Use a region near your evaluators.
3. Copy its database URL (`libsql://…`) and create a database authentication token.
4. Put these **server-only** values in the ignored `.env.local` and in the existing Vercel project's environment variables:

   ```dotenv
   TURSO_DATABASE_URL=libsql://your-database-host
   TURSO_AUTH_TOKEN=your-database-token
   ```

5. Run `npm run db:setup`, or let the app create its small idempotent schema on its first database request. Both paths use the same schema in `src/lib/schema.ts`.
6. Redeploy Vercel after changing environment variables. Do not create another Vercel project or GitHub repository.

CLI alternative after installing the official Turso CLI:

```sh
turso auth login
turso db create stash-app
turso db show stash-app --url
turso db tokens create stash-app
```

Do not put credentials in a `NEXT_PUBLIC_` variable or commit them. Keep database tokens scoped to this database. Former Supabase code/dependencies have been removed; its remote resources have not been deleted. Earlier email-based accounts are not automatically converted into the new username accounts.

## AI: Gemini Free

1. At https://aistudio.google.com/api-keys create an API key in a project **without billing enabled**.
2. Configure these server-only values locally and on Vercel:

   ```dotenv
   GEMINI_API_KEY=your-key
   GEMINI_FREE_TIER_CONFIRMED=true
   ```

3. This version uses `gemini-3.5-flash-lite`, currently listed with a free input/output tier. Actual request and token limits are project-specific; check https://aistudio.google.com/rate-limit. Do not enable billing to make a quota error disappear.
4. The backend caps AI attempts at 5 indexed saves and 20 searches per account/day, with a shared ceiling of 50 calls/day. Failed calls also count; keyword search does not consume AI usage. Limits reset at UTC midnight. Provider exhaustion returns a visible fallback without losing the link.
5. If credentials or free capacity are unavailable, link saving, public metadata extraction, ordinary search and deletion still work. The UI says when analysis is limited, deferred, or unavailable. It never substitutes a fake AI summary.

Free-tier requests may be used by Google to improve its products. The selected link's public text/metadata and optional user description are sent for organization. Search sends bounded metadata and descriptions from the current user's own library. API keys never reach the browser or prompts. See https://aistudio.google.com/docs/pricing and https://aistudio.google.com/docs/rate-limits.

## How saving and search work

The save API persists the URL immediately. The browser then calls a separate synchronous analysis API request; there is no background infrastructure. If a tab closes before analysis starts, use **Analyze** on the saved link later. Analysis uses a short database lease to prevent overlapping calls and can be retried if interrupted.

Website text and metadata are extracted from public HTML. YouTube uses public oEmbed title/author metadata; it does not imply access to transcripts. X uses public oEmbed when available. Login walls, private content, unsupported responses, and source errors preserve the original link. Metadata-only sources never receive an invented full-content summary.

Instagram uses public Open Graph title/description fields from the page header, bounded at 1 MiB and stopped at `</head>`; it does not download video, execute Instagram scripts, use login cookies, or infer a full caption or transcript. The earlier 512 KiB whole-response limit rejected otherwise accessible pages of around 600 KiB. Generic login-shell metadata is now discarded. Public captions can be partial, promotional, or absent; the AI can only organize what they actually say.

Meta introduced [tokenless oEmbed on June 15, 2026](https://developers.facebook.com/docs/graph-api/reference/oembed-post/). Live tests returned `html`, `provider_name`, `provider_url`, `type`, `version`, and `width`, without separate caption/title/author/thumbnail fields. However, [Meta's oEmbed terms](https://developers.facebook.com/documentation/instagram-platform/oembed) restrict its data to displaying embeds and prohibit extracting/persisting it for other uses. Stash therefore never persists oEmbed data or passes it to AI; it uses independently accessible public-page metadata and the user's own description.

Instagram post/Reel permalinks keep their case-sensitive shortcode, canonicalize `reels` to `reel`, use HTTPS/`www.instagram.com`, and remove all query tracking and fragments. Duplicate detection also canonicalizes legacy saves. Existing URLs and custom titles are preserved during the additive SQLite upgrade; old Instagram links receive one fresh extraction opportunity with the corrected extractor.

WhatsApp no longer has a separate source segment. Existing WhatsApp links remain available under Websites, without deleting or rewriting saved links.

When content is inaccessible, the compact card says **Instagram post** or **Instagram Reel**, with **Add description** instead of a repeated Analyze prompt. Edit a link to add your own optional description or change title/tags. Descriptions are private library notes, not verified source captions; they participate in both keyword and AI search. Only a changed description enables reorganization; title/tag edits preserve manual choices without spending another AI save. A new description can generate title/category/tags but never an invented summary of the unseen post. Deferred/failed AI calls with useful content can still be retried normally.

Extraction accepts only HTTP(S) on standard ports, rejects literal IPs and private/reserved DNS answers, pins validated DNS addresses to the HTTP connection, revalidates each redirect, and bounds time, redirects, headers, and response size. Normal responses remain bounded at 512 KiB. No login cookies, paywall bypasses, or platform access credentials are used.

Search first ranks the account's stored titles, descriptions, summaries, tags and available text by useful query words. When AI is available, it reranks up to 40 candidates by semantic relevance. The account library is bounded at 500 links for this prototype. AI results are accepted only when their IDs belong to the supplied private candidates. No new saved items or URLs can be generated by search. Keyword results remain available during AI failures.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:ui
```

Unit/database tests use actual SQLite and verify persistence across reconnects, password hashing, session expiry/revocation, duplicate handling, ownership isolation, AI usage limits, URL defenses, extraction, and AI output validation. Browser tests cover registration/login/save/refresh/search/delete/logout, direct cross-account API access, CSRF rejection and responsive layouts at 320, 390, 768 and 1440px.

Browser tests use port 3001 and an isolated local database/build directory. They do not impersonate an AI provider: ordinary CI checks run without an AI key and verify the honest fallback. Genuine Gemini organization and natural-language search are also verified separately through the real app when credentials are configured. Keep physical-phone keyboard, safe-area and touch checks separate from desktop browser emulation.

`npm run test:ui` generates an ignored temporary `/dev-qa` fixture route, runs worst-case layout tests, and removes it. It is not part of the production app. Do not build/deploy while that test is running.

## Deployment

Use the existing GitHub → Vercel connection. `main` is production; feature branches produce previews. Configure the four environment variables above in the appropriate Vercel environments. Run checks before committing and pushing, then verify the resulting deployment's commit and READY status. Never claim the hosted database or AI was verified from a successful build alone.

This assignment app intentionally has no password reset, email verification, optional account linking, automatic content refresh, or imports. Links are preserved when source extraction or AI fails.
