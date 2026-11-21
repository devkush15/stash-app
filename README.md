# stash.

A private library for the links you want to keep. Phase 1 uses Next.js App Router, TypeScript, Tailwind CSS, and Supabase Auth/PostgreSQL. There is no AI integration, extraction, billing, localStorage content database, or production sample data.

Production: https://stash-app-sigma.vercel.app · Private source: https://github.com/devkush15/stash-app

The cloud project is `stash-app` (`dntblxbqggltyjorzziq`) in the separate `stash-app` organization, Mumbai region. The migration, RLS, production redirect allowlist, and Vercel environment variables are configured. Existing unrelated projects were not changed. The current checkout already has its ignored `.env.local`; preserve it.

## Run locally

Use Node.js 24 LTS and npm.

```sh
npm ci
# Fresh clones only: copy .env.example to .env.local and fill in the variables.
npm run dev
```

Open http://localhost:3000. The server binds to `0.0.0.0` for phone testing on your local network. Hot reload is enabled. Without Supabase configuration the sign-in page honestly shows a setup notice; it does not simulate authentication or saved links.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project publishable key (`sb_publishable_…`) |
| `APP_URL` | Canonical app origin, e.g. `http://localhost:3000` locally, your HTTPS production origin on Vercel |

Only the publishable key belongs in public configuration. The app does not need a service-role key, secret API key, or database password. Never commit `.env.local`; it is ignored. Vercel CLI may add a local OIDC token to that ignored file. Never print or commit it.

## Supabase setup

These steps describe reproducible setup. The current Stash project already has steps 1–5 configured; do not recreate it or re-run its initial migration.

1. For a fresh installation, create a **new** free-plan project named `stash-app` in the intended organization. Do not use another app's database. Choose a region near your users.
2. In the SQL Editor run the version-controlled file `supabase/migrations/20261121194730_saved_items.sql`. For a CLI-managed project, use the installed CLI's help for `link` and migration application; pin the CLI version used by your team. The initial files were generated with CLI 3.2.0.
3. Copy the API URL and **publishable** key from the project's Connect/API settings into `.env.local` and Vercel environment settings.
4. Enable the Email provider and allow new sign-ups in Authentication. This application uses a single passwordless email flow for sign-up and sign-in.
5. Under Authentication → URL Configuration, set **Site URL** to the production `APP_URL`. Add exact Redirect URLs for `http://localhost:3000/auth/callback`, your production `/auth/callback`, and production `/auth/confirm`. Add only trusted preview origins when testing preview authentication.
6. The default magic-link template works with the PKCE `/auth/callback` route in the browser that requested the link. Open each requested link in that same browser. Each device can sign in separately and use the same synced library. Supabase currently rejects template customization on free projects using its default email sender. Once a verified custom SMTP provider is configured, optionally use `supabase/templates/sign-in.html` for both **Confirm signup** and **Magic Link**, with this target:

   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email">Sign in to Stash</a>
   ```

   The app sets `RedirectTo` from its configured `APP_URL`. The callback supports both default PKCE codes and email token hashes, and always redirects to `/library`. `/auth/confirm` also accepts email token hashes. Redirects keep the browser's actual host so session cookies are preserved behind proxies and local bind addresses.
7. Before inviting public users, configure a verified custom SMTP sender. Supabase's default sender restricts recipients and volume; a production email sign-in page alone does not remove that restriction. Review current Auth email rate limits and enable CAPTCHA if needed for public sign-up abuse. Do not assume free email capacity is unlimited.
8. Restart the dev server after changing environment variables. Redeploy Vercel after changing production variables.

The migration explicitly grants table access only to authenticated users, enables and forces RLS, applies separate owner policies to all four operations, checks ownership during updates, and enforces `(user_id, normalized_url)` uniqueness. Deleted users cascade to their items. `updated_at` is maintained by a trigger.

`supabase/config.production.toml` records the sparse production Auth configuration. Apply it with CLI 3.2.0 from a temporary workdir where it is named `supabase/config.toml`: run `config diff --workdir <dir> --remote=dntblxbqggltyjorzziq`, review, then `config push --workdir <dir> --remote=dntblxbqggltyjorzziq --yes`. Do not push the full local-development config to production. The local stack's convenience defaults are intentionally different.

Public email delivery remains a setup dependency: in Supabase Authentication → Email/SMTP, configure your verified sender domain, sender address, SMTP host, port, username and password, using a provider with an appropriate free allowance. Disable email link tracking. Do not upgrade Supabase or enable a paid service just to modify a template. Review provider and Supabase send limits before inviting users. Actual mailbox delivery has not been verified.

## Behavior

- Paste an HTTP(S) link, optionally give it a title, and save it to your account. The original URL is preserved for opening; a normalized URL prevents duplicate saves within that account.
- Known tracking parameters are removed from the deduplication key. Meaningful fragments, path case, and query values are preserved. Common YouTube short links are converted to watch URLs. Normalization deliberately avoids guessing equivalence across arbitrary sites.
- Platform detection matches hostname boundaries, not substrings. No submitted URL is fetched or resolved server-side.
- Search matches a literal case-insensitive substring in the stored title and URL. Filters and pagination run in the database, with 24 items per page. Search and filters are URL-addressable.
- Links appear only after the database confirms saving; delete requires confirmation. Failed operations retain the input and display an error.
- Sessions use Supabase SSR cookies. Proxy refreshes tokens, protected pages and mutations verify the current user, and RLS also protects direct Data API calls. Auth responses are private/no-store. No privileged database client is used.
- Devices read the same cloud database. Returning to a tab or focusing the window refreshes the library; continuous Realtime subscriptions are not included in Phase 1.
- Processing status is `saved`. No title, summary, or analysis is fabricated.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:ui
```

`npm test` runs URL/search tests and executes the actual migration in PGlite (PostgreSQL in WASM), testing save/search/delete, duplicates, schema validation, owner reassignment, anonymous denial, and two-user RLS isolation. The test emulates the `auth.uid()` boundary; it does **not** verify hosted Supabase authentication or the Data API.

Browser checks cover responsive sign-in at 320, 390, 768, and 1440px, route protection, and failed authentication callbacks. Check real iOS Safari/Android hardware for the software keyboard, safe areas, touch feedback, and browser chrome; desktop emulation cannot establish those behaviors.

`npm run test:ui` temporarily creates an ignored `/dev-qa` route to render the actual dashboard with test fixtures (Demo data / Worst case / Empty / One), then removes it. It checks all four widths, large text, dialogs and keyboard focus. This route is not committed or deployed; production `/library` only reads the authenticated cloud database. Start the dev server before running this test, or let Playwright start it. Do not run a production build concurrently with this temporary fixture test.

For actual hosted Auth and direct API verification, create two dedicated, confirmed test accounts with passwords in a test project. Put `STASH_TEST_EMAIL_A`, `STASH_TEST_PASSWORD_A`, `STASH_TEST_EMAIL_B`, and `STASH_TEST_PASSWORD_B` in the ignored `.env.local`, then:

```sh
npm run test:live
```

The script signs in through Auth, saves and re-reads a unique URL, searches, checks duplicates and cross-user direct API reads/inserts/updates/deletes, deletes the test records, and signs out. It never needs a service key. `npm run test:e2e` also runs a real authenticated browser save/refresh/search/isolation/delete/sign-out flow when those test-account variables are present; otherwise that test is explicitly skipped. With a valid one-time `STASH_TEST_TOKEN_HASH`, it also verifies the email token callback and session persistence. Test credentials never belong in Vercel.

Hosted Auth/Data API isolation and both local authenticated browser flows have passed against the actual Stash project using two temporary confirmed test accounts. The accounts and their test records were deleted afterward. Token generation for that check did not send email. Actual inbox delivery and the default email sender's user-initiated PKCE journey still need verification after SMTP is configured: request a link → open email in the same browser → save → reload → search → open original → delete → sign out. Repeat with a second account.

## GitHub → Vercel

- Private repository: https://github.com/devkush15/stash-app
- Vercel project: `stash-app`, scope `devanshi9` (local identity in ignored `.vercel/project.json`).
- Production: https://stash-app-sigma.vercel.app. Development: http://localhost:3000.
- GitHub is connected, production branch is `main`, and a push to `feat/ui-verification` has triggered a verified READY automatic preview at https://stash-app-git-feat-ui-verification-devanshi9.vercel.app. All three production environment variables are configured, and production deployment protection is disabled.
- Framework: Next.js. Install: `npm ci`. Build: `npm run build`. Output: framework default. Use Node.js 24 LTS.
- Retain the existing repository connection under Vercel Project Settings → Git. If access to the private repo fails, configure the Vercel GitHub App to include `stash-app`, then retry the connection. Use `main` for production and feature branches for previews.
- Configure all three application variables for Production. For trusted previews use the same Supabase project with its redirect allowlist and that preview's `APP_URL`, or a separate test project. Never expose an untrusted wildcard callback domain.
- Disable Vercel deployment protection for production so the deployed app can be visited publicly; Supabase still protects each library.
- GitHub Actions checks lint, TypeScript, tests, build, and public browser flows on main pushes and pull requests. Native Vercel Git integration deploys pushes automatically; verify a READY deployment matching each intended commit. Native deployment does not wait for GitHub Actions, so run checks before pushing to main.
- For each phase: implement → run relevant checks/build → commit → push → inspect deployment status and URL. Continue using this repository and Vercel project; do not recreate them.

## Phase 2 boundary

`saved_items` has nullable title/description, a processing-state vocabulary, and timestamps ready for a durable extraction job. A later migration can add tags, collections and an embedding relation without changing URL ownership. Preserve the saved link on extraction failure. Treat fetched content as untrusted data and add SSRF defenses, timeouts and size limits before introducing any fetching.

No AI provider is configured and AI requests cost nothing because none are made. Proposed limits (5 processed saves and 20 semantic searches per user/day) are planning targets, not enforced or validated capacity. Before enabling AI, implement atomic server-side quotas, shared app caps, provider budgets/monitoring and capacity-exhausted behavior. Keyword search must remain available without AI credits.
