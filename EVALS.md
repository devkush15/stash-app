# Stash evaluation

**22 November 2026 (IST)** · Application revision `a3a6fda8061a1f3601ed34ea14c85a1e0d170708`.
Local: macOS, Node 25.8.0/npm 11.21.0, Next.js 16.4.6, Vitest 4.1.12, Playwright 1.65.1/Chromium. CI: Node 24/Linux.

## Actual local results

All six commands were executed. Five succeeded; full E2E failed. Counts are test cases; dashes mean not applicable.

| Command | Executed | Status | Passed | Failed | Skipped | Errors / attention |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `npm run lint` | Yes | PASS, exit 0 | — | — | — | No errors or warnings. |
| `npm run typecheck` | Yes | PASS, exit 0 | — | — | — | Route generation and TypeScript passed. |
| `npm test` | Yes | PASS, exit 0 | 90 | 0 | 0 | All 4 files passed. |
| `npm run build` | Yes, 3 attempts | PASS on attempt 3, exit 0 | — | — | — | Attempts 1–2: Turbopack `binding to a port: Operation not permitted`. Permitted execution with clean production cache passed. |
| `npm run test:e2e` | Yes | FAIL, exit 1 | 9 | 1 | 21 | Saved heading absent after 30 seconds (`tests/e2e/tags.spec.ts:74`). |
| `npm run test:ui` | Yes | PASS, exit 0 | 21 | 0 | 0 | All responsive fixture tests passed. |

The 21 E2E skips are intentional: layout tests require `test:ui`, which subsequently executed all 21 successfully. Unique local results: **120 passed, 1 failed**.

**Failed capture:** saving returned HTTP 201, but the library still showed zero links. A refresh overlapped the save; root cause remains unconfirmed. Subsequent assertions in that test were not reached. An unchanged targeted rerun (`npm run test:e2e -- tests/e2e/tags.spec.ts`) hit the 120-second server-startup timeout: **zero cases executed**, exit 1.

Local logs: `/tmp/stash-evals-*.log`; original failure trace/context: `/tmp/stash-evals-e2e-failure/`. Non-failing browser warnings concerned conflicting color flags and a Fast Refresh full reload.

## Fresh CI comparison

[CI attempt 2](https://github.com/devkush15/stash-app/actions/runs/44985797502/attempts/2) executed all six checks on the **same application revision**. All passed: lint/types/build; units **90/0/0**, E2E **10/0/21**, UI **21/0/0** (passed/failed/skipped). The complete tag-management/Ask-fallback test passed there. This does not explain or clear the local failure.

Non-blocking maintenance warnings: deprecated ESLint 9/`whatwg-encoding`, setup-action `punycode`/`url.parse()` usage, and Node 20 action runtimes forced onto Node 24.

## Infrastructure and journey coverage

Vitest uses fixtures and temporary SQLite. Playwright uses an isolated local database/server on port 3001 and `.next-e2e`, **with Gemini disabled**. UI tests temporarily generate `/dev-qa` with synthetic layout data; cleanup was verified. Production build ran beforehand. CI runs the six checks on pushes/PRs. No line/branch coverage percentage or AI accuracy score was measured.

| Journey | Verified coverage / gap |
| --- | --- |
| Registration/login | Browser: register, wrong password, logout/revocation, login. Units: salted hashing and session expiry. |
| Saving/editing | Browser: save, refresh persistence, original destination, delete, Instagram title/note/tag edits. Tagged-capture visibility failed locally. |
| Custom tags/notes | Database: create/select/rename/merge/delete, ownership and note preservation. Browser: note search locally; complete tag-management flow passed in CI. |
| Category-wise organization | Partial: category filtering/Uncategorized units; tag-section UI fixtures and CI grouping/filtering/sorting. Populated category browsing lacks a browser test. |
| Keyword/AI search | Natural-language keyword/note queries and fixture-based AI ranking validation passed. No live semantic-search evaluation. |
| Ask grounded answers | Units: exact quotes/source IDs, fabricated-evidence rejection, bounded retrieval. Browser: empty/private sources locally; populated fallback/clickable originals in CI. Live answer faithfulness untested. |
| Inaccessible Instagram | Browser: honest fallback, canonical duplicates, original destination, editable context, note search, unchanged reanalysis prevention. Accessible metadata parsing uses fixtures; live accessible posts/Reels untested here. |
| Data isolation | Two-account listing/Ask/delete/index checks, database read/edit/delete/tag privacy, and unauthenticated/cross-origin rejection passed. |
| Mobile/desktop | Chromium at 320/390/768/1440px: sign-in, empty/one/demo/worst libraries, 1/2/3 columns, dialogs/focus/Escape, overflow, 200% text, reduced motion, themes/contrast and pagination. No physical-device/cross-browser result. |

## Manual checks still required

- Reproduce the local tagged-capture failure; verify immediate card/navigation refresh and persistence.
- With existing free-tier credentials/quota, verify real article extraction, Gemini organization, semantic-search relevance and grounded Ask answers. Inspect supporting quotes/original sources; include unanswerable questions and misleading saved instructions.
- Compare accessible Instagram post/Reel and inaccessible-post behavior against actual metadata; distinguish notes from source captions and reject invented video summaries. Spot-check YouTube/X.
- Test populated categories, multi-tag sections and back/refresh navigation. Verify **hosted Turso persistence and production two-account privacy**; local suites do not prove deployed integrations work.
- Check Safari/Firefox, a physical phone, keyboard/screen reader, mobile keyboard/safe areas and both themes. Exercise outage/quota fallbacks without resetting real budgets.

## Fixes and outstanding issues

**Application/test fixes: none.** No assertions/timeouts were relaxed. Environment maintenance only: moved generated `.next/cache/turbopack` aside after the permission failure; the unchanged build passed.

Outstanding: local capture-refresh failure, server-startup timeout, maintenance warnings and manual/integration gaps above. **This is not an all-green local E2E evaluation.**
