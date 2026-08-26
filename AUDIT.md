# Code Audit & Hardening — Expense App

**Date:** 2026-08-26
**Branch:** `audit/hardening-refactor`
**Scope:** Full monorepo — Next.js 16 web app (`src/`) + Expo SDK 57 mobile app (`mobile/`)

The codebase was found **architecturally sound** — consistent per-route auth → Zod validation → RLS-scoped queries, standardized API response envelope, server-verified Bearer tokens, private signed-URL receipts, admin client confined to legitimate account-deletion. This was a **hardening & consistency** pass, not a rescue.

## Verification (post-fix)

| Check | Web | Mobile |
|---|---|---|
| `tsc --noEmit` | ✅ pass | ✅ pass |
| lint | ✅ 0 errors | ✅ 0 errors (91 legacy warnings) |
| tests (`vitest`) | ✅ 54 passed / 6 files | n/a |
| production build | ✅ `next build` | ✅ signed APK (earlier) |

---

## Findings & status

Severity → `[FIXED]` applied on this branch, `[DEFERRED]` needs infra/design/on-device work (marked with `TODO(security)` in code).

### Critical
- **[FIXED] Mobile reset-password session hijack** — `mobile/app/reset-password.tsx` blindly called `setSession()` with raw deep-link tokens. Now signs out + routes to login on any failure, gates the update on a freshly-established recovery session. `[DEFERRED]` deeper fix: PKCE `exchangeCodeForSession` + `type=recovery` check + verified App/Universal Links (needs Supabase email-template + native config).

### High
- **[FIXED] CSV formula injection (partial bypass)** — `exports/csv/route.ts` left Category/Amount/Payment/Date columns unquoted/unescaped. All columns now routed through a quote-and-escape `csvCell()` helper.
- **[FIXED] Mobile receipt upload trust** — `mobile/lib/receipts.ts` trusted a client-passed `userId` and did no ownership/size check. Now derives the user from `getUser()`, scopes the update with `.eq("user_id", …)`, enforces a 10 MB cap.
- **[FIXED] Silent delete "success"** — web stores didn't re-throw on delete failure, so callers showed `toast.success` on a failed delete. All three stores now re-throw.
- **[FIXED] Racy receipt upload target** — web attached receipts to `expenses[0]` (racy). `addExpense` now returns the created row; upload targets its id.
- **[FIXED] Mobile validation parity** — mobile wrote to Supabase with zero runtime validation. Added `zod` + `mobile/lib/schemas.ts` mirroring web; forms now `safeParse` before insert/update.
- **[FIXED] Mobile pagination race** — `useExpenses` append fetches had an ineffective guard. Added an in-flight ref + filter-signature staleness check.
- **[FIXED] Test suite was non-functional** — `vitest`/`playwright` pointed at a non-existent `tests/` dir (`npm test` failed to run). Added `tests/setup.ts` + 54 unit tests (csv sanitization, all zod schemas, auth Bearer/cookie paths).

### Medium
- **[FIXED] Raw `dbError.message` leaked** to clients across ~14 API routes → generic message + server-side `console.error`.
- **[FIXED] No CSRF / API returned HTML redirect** — `src/lib/supabase/middleware.ts` now returns JSON 401 for unauthenticated `/api` calls (instead of 307 → `/login`) and rejects cross-origin state-changing requests via `Sec-Fetch-Site`/`Origin`.
- **[FIXED] Dashboard swallowed errors** (web + mobile) — a failed load looked like `$0.00`. Now surfaces a distinct error state.
- **[FIXED] Divide-by-zero** in `budget-warnings.tsx` (`limit_amount === 0` → `Infinity%`). Guarded.
- **[FIXED] `category/[id]` cold-load/deep-link** rendered blank (relied on list being populated) — now fetches the single record with loading/not-found states.
- **[FIXED] Error-masking in stores** — guarded `json?.error?.message` / `res.ok` so malformed responses don't throw a `TypeError` that hides the real failure.
- **[DEFERRED] Rate-limiting + step-up re-auth** on the irreversible account/data-wipe endpoints — needs infra; `TODO(security)` at the handlers.

### Low
- **[FIXED] `is_default` mass-assignment** — removed from the client-writable category schema (DB default governs it).
- **[FIXED] `alert_threshold` unit mismatch** — mobile treated it as a 0–1 fraction; web stores int 1–100. Mobile now matches (a real data-model bug).
- **[FIXED] Bearer consistency** — `request` now passed into `getAuthenticatedUser()` on all routes.
- **[FIXED] Misleading "Daily Average" card** — relabeled "Avg / Transaction" to match the computation.
- **[FIXED] Public-storage `next.config` remotePattern** removed (receipts are private/signed).
- **[FIXED] Dead `skipWaiting` PWA config** — was silently ignored at top level; moved under `workboxOptions`.
- **[DEFERRED] AsyncStorage token plaintext** — migrating to chunked `expo-secure-store` needs on-device verification; `TODO(security)` added.

---

## Tooling & consistency
- **[FIXED] Mobile had no linter/formatter** — added `eslint-config-expo` (flat) + Prettier + `lint`/`format` scripts. Adopted in *brownfield mode*: pre-existing patterns are warnings so lint flags new regressions, not the entire legacy baseline.
- **[FIXED] Web `eslint .` linted `mobile/`** — scoped web lint to web source.
- **[FIXED] `database.types.ts` manual drift** — added `db:types` regeneration script + drift note (both apps keep a local copy; no shared workspace).
- **npm audit:** web 6 vulns are all build-time-only PWA tooling with no non-breaking fix (left alone; `--force` is a breaking `next-pwa` bump). Mobile `npm audit fix` cleared one High (5→4); the rest are Expo build tooling resolvable only via a breaking Expo downgrade.

## Known follow-ups (not addressed)
- Store-level `AbortController` sequencing for `fetchExpenses` (web) — race window remains under rapid filter+paginate.
- The `expenses` GET advertises a `cursor` it never accepts (offset paging) — dead field; pick one strategy.
- Promote mobile lint warnings to errors after a `npm run format` pass + a hooks (`fetch`-in-`useEffect`) refactor.
- Server-authoritative totals for large PDF exports.
