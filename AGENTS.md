<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Stash assignment prototype

- Preserve this checkout, private repository `https://github.com/devkush15/stash-app`, Vercel project `stash-app` / `prj_NMHYulCL3MBHi81k11YpjrIdBE3T` in `devanshi9`, and production URL `https://stash-app-sigma.vercel.app`.
- The current user explicitly simplified the app: Next.js API routes, username/password accounts, HTTP-only sessions, Turso/libSQL persistence and one free-tier Gemini REST integration. No Supabase, Firebase or Cloudflare integration is required. Do not modify their old remote resources.
- Build only the essential Login/Register and Library/Search experience. No separate backend, workers, Redis, vectors, payments, subscriptions, analytics or extra dashboards.
- Runtime credentials are server-only. Never commit `.env.local`, tokens, passwords or API keys. Never enable paid services or billing.
- Parameterize SQL and scope all item reads/writes/search to the session's user ID. Hash passwords with scrypt and store only hashes of opaque session tokens. Vercel must use hosted persistence; local file databases are for development/tests only.
- Verify real AI against the provider before claiming it works. Preserve links and public metadata when extraction or AI fails; never fabricate summaries. Restricted social platforms may have limited indexing.
- For each phase: implement → lint/typecheck/tests/build → commit/push → verify the existing automatic Vercel deployment → report status and URL. Use feature branches for experiments and main for checked work.
- Keep the local development preview running while working. Test fixtures remain development-only and must not be deployed. Do not run a production build while `npm run test:ui` has its temporary route present.
