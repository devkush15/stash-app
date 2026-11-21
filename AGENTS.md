<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Stash project workflow

- Use this existing checkout and private repository: `https://github.com/devkush15/stash-app`. Production branch: `main`. Use feature branches for experimental work.
- Retain Vercel project `stash-app` in scope `devanshi9`, project ID `prj_NMHYulCL3MBHi81k11YpjrIdBE3T`. Production URL: `https://stash-app-sigma.vercel.app`. Its Git connection automatically deploys pushes. Do not recreate the repository or project.
- Use only Supabase project `dntblxbqggltyjorzziq` in organization `stash-app` (`lnnyjylpjrxikzpahebp`). Do not access or change xPloris projects. Remain on free infrastructure; no paid upgrades or paid AI integrations.
- For each phase: implement, run relevant tests/lint/TypeScript/build, commit, push, inspect the resulting deployment until terminal status, then report the actual status and URL. Investigate failed deployments instead of claiming success.
- Keep `.env.local`, tokens, API keys and passwords out of Git. Runtime uses only the Supabase publishable key and owner-based RLS. No service key belongs in the app or browser.
- `npm run test:ui` creates and removes an ignored temporary fixture route. Never build or deploy while it is running. Production `/library` must use only real authenticated database data.
- Keep the development server available while actively working when the environment supports it. Do not call email delivery or hosted flows verified without actually checking them.
- Phase 1 intentionally has no extraction or AI. Preserve the original link on future processing failures. Public passwordless sign-ups require a verified SMTP sender; the free default sender has recipient and volume restrictions.
