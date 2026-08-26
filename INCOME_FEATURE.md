# Income Tracking — Feature Design & Implementation Plan

**Status:** Draft
**Date:** 2026-08-26
**Author:** Engineering
**Scope:** Next.js 16 web app (`src/`) + Expo SDK 57 mobile app (`mobile/`) + Supabase schema

---

## 1. Problem

The app records **expenses only**. Users can track money leaving their account but have no way
to record money coming in (salary, freelance, refunds, interest, gifts). As a result:

- The dashboard shows *spending*, never *net cash flow* (income − expenses).
- Budgets can't be framed against actual take-home income.
- Exports and analytics tell half the financial story.

This document audits how the expense feature is built today and specifies a symmetric **income**
feature that reuses the existing, audited patterns with minimal risk to the current flow.

---

## 2. Audit of the current implementation

The expense feature is implemented as a clean vertical slice. Every layer follows the same
conventions, which makes income a matter of **mirroring an established pattern** rather than
inventing one.

### 2.1 Data model (Supabase — no SQL in repo)

The schema DDL is **not version-controlled**; tables live in the Supabase project and are mirrored
by hand into two TypeScript type files. The `expenses` row shape
(`src/lib/types/database.ts:84`):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `users`, RLS scope |
| `amount` | numeric | `> 0` |
| `category_id` | uuid \| null | FK → `categories` |
| `description` | text | required, ≤255 |
| `date` | date | |
| `receipt_url` | text \| null | private signed URL |
| `payment_method` | enum | `cash \| credit \| debit \| other` |
| `tags` | text[] | |
| `notes` | text \| null | ≤1000 |
| `is_recurring` / `recurring_frequency` / `recurring_group_id` / `next_due_date` | recurring support |
| `deleted_at` | timestamptz \| null | **soft delete** |
| `created_at` / `updated_at` | timestamptz | |

There is also a `monthly_summaries` table (`user_id, month, category_id, total_amount, expense_count`),
but **aggregation is computed at query-time in API handlers** — no DB triggers exist
(`Functions: Record<string, never>`). `categories` and `budgets` reference the same `user_id` RLS pattern.

**Type files that must stay in sync (no shared workspace):**
- `src/lib/types/database.ts` (web)
- `mobile/lib/database.types.ts` (mobile)

### 2.2 Backend — the request lifecycle

Every route follows: **auth → Zod validation → RLS-scoped Supabase query → standard envelope.**

- **Auth:** `getAuthenticatedUser(request)` accepts a `Bearer` token (mobile) or session cookie (web) — `src/lib/api/auth.ts`.
- **Validation:** `src/lib/schemas/expense.ts` — `createExpenseSchema`, `updateExpenseSchema` (`= create.partial()`), `expenseQuerySchema` (filters + pagination).
- **Response envelope:** `successResponse` / `errorResponse` / `validationErrorResponse` — `src/lib/api/response.ts`.
- **Routes:**
  - `src/app/api/v1/expenses/route.ts` — `GET` (paginated, filterable: date range, category, amount range, tag, search) + `POST` (create).
  - `src/app/api/v1/expenses/[id]/route.ts` — `PUT` (update) + `DELETE` (**soft** delete, sets `deleted_at`).
  - `src/app/api/v1/expenses/[id]/receipt/route.ts` — receipt upload.
- **Analytics** (read `expenses` directly, filter `deleted_at IS NULL`):
  - `analytics/summary/route.ts` — current vs. previous period total, `changePercent`, `expenseCount`, `byCategory`.
  - `analytics/trends/route.ts` — last 6 months of totals.
- **Exports:** `exports/csv` + `exports/json` read expenses.

### 2.3 Web frontend

- **Store (Zustand):** `src/lib/stores/expense-store.ts` — `{ expenses, loading, error, total, hasMore, page, filters }` + `setFilters / fetchExpenses / addExpense / updateExpense / deleteExpense`. `addExpense` returns the created row (so receipt upload can target its id). Peers: `category-store.ts`, `budget-store.ts`.
- **Page:** `src/app/(dashboard)/expenses/page.tsx` — header + "Add Expense", filters card, table, create/edit dialog (Zod-validated), pagination.
- **Dashboard:** `src/app/(dashboard)/dashboard/page.tsx` — summary cards (Total Spending / Transactions / Avg per Transaction), Recharts bar (trends) + pie (by category), period tabs.
- **Navigation:** `src/components/layout/sidebar.tsx` **and** `src/components/layout/mobile-nav.tsx` each hold a duplicated `navItems` array (Dashboard, Expenses, Categories, Budgets, Exports, Settings).

### 2.4 Mobile frontend (Expo Router)

- **Tabs:** `mobile/app/(tabs)/_layout.tsx` — Dashboard, Expenses, Budgets, Categories, Settings (5 tabs).
- **Screens/hooks:** `mobile/app/(tabs)/expenses.tsx` + `mobile/hooks/useExpenses.ts`; dashboard `index.tsx` + `mobile/hooks/useDashboard.ts`.
- **Validation:** `mobile/lib/schemas.ts` mirrors the web Zod schemas (added during the hardening audit).

### 2.5 Tests

Vitest unit tests under `tests/unit/` — notably `tests/unit/schemas/expense.test.ts` and `auth.test.ts`, `csv.test.ts`. 54 tests currently pass.

### 2.6 Audit takeaways relevant to income

- The stack is symmetric and pattern-driven → income should **copy the expense slice**, not diverge.
- No DB triggers → any income aggregation must be added **in the analytics handlers**, same as expenses.
- Two type files + two schema files (web/mobile) must be updated **together** — known drift risk (AUDIT.md).
- Soft-delete + RLS-by-`user_id` are non-negotiable conventions to preserve.

---

## 3. Proposed design

### 3.1 Key decision — separate `income` table vs. unified `transactions` table

| Option | Pros | Cons |
|---|---|---|
| **A. Separate `income` table** (recommended) | Mirrors existing per-entity slices exactly; zero risk to the audited expense path; simplest RLS; independent evolution | Some duplicated code; analytics must union two tables |
| B. Unified `transactions` table with `type: 'income' \| 'expense'` | One code path; net cash flow is a trivial query | High-risk migration of live expense data; touches every expense query, store, test, export, and both type files; breaks the "expenses" RLS/route naming |

**Recommendation: Option A.** It matches the codebase's convention (expenses, budgets, categories are each
their own slice), keeps the hardened expense flow untouched, and is far lower risk. The only real cost —
unioning income + expenses in analytics — is small and localized.

### 3.2 `income` table shape

Income is intentionally **leaner** than expenses — it only carries the fields that make sense for money
coming in. The full field set:

| Field | Required | Notes |
|---|---|---|
| `amount` | ✅ | `> 0` |
| `description` | ✅ | ≤255 |
| `date` | ✅ | |
| `source` | ✅ (default `other`) | `salary \| freelance \| investment \| gift \| refund \| other` — income's own categorization |
| `notes` | optional | ≤1000 |
| `is_recurring` / `recurring_frequency` | optional | salary is naturally recurring |
| `recurring_group_id` / `next_due_date` | system | recurring bookkeeping |
| `deleted_at`, `created_at`, `updated_at` | system | soft delete + timestamps |

**Deliberately dropped** (vs. expenses): `category_id`, `tags`, `receipt_url`, `payment_method`. The income
`source` replaces the category concept, so no separate category table or `categories.kind` column is needed —
this keeps the expense path completely untouched.

### 3.3 Dashboard & analytics changes

- Add **Total Income** and **Net (Income − Expenses)** summary cards alongside Total Spending.
- Extend `analytics/summary` and `analytics/trends` to return income series in parallel with expenses
  (two aggregations in one handler, or a sibling `analytics/income/*` — see plan). Trends chart shows
  income vs. expense bars per month; net line optional.

---

## 4. Change map

### Database (Supabase console)
- [ ] Create `income` table (shape in §3.2) with the same RLS-by-`user_id` policies as `expenses`.
- [ ] (Optional) Add `categories.kind` column.
- [ ] Regenerate types (`npm run db:types`) and **hand-copy into `mobile/lib/database.types.ts`** preserving its header.

### Types & schemas
- [ ] `src/lib/types/database.ts` — add `income` table + `Income` alias + `IncomeSource` type.
- [ ] `mobile/lib/database.types.ts` — same (kept in sync).
- [ ] `src/lib/schemas/income.ts` — `createIncomeSchema`, `updateIncomeSchema`, `incomeQuerySchema` (copy `expense.ts`, swap `payment_method`→`source`, drop receipt).
- [ ] `mobile/lib/schemas.ts` — add income schemas.

### Web backend
- [ ] `src/app/api/v1/income/route.ts` — `GET` + `POST` (copy expenses route; no receipt join).
- [ ] `src/app/api/v1/income/[id]/route.ts` — `PUT` + `DELETE` (soft delete).
- [ ] Extend `analytics/summary/route.ts` + `analytics/trends/route.ts` to include income (or add `analytics/income/*`).
- [ ] Extend `exports/csv` + `exports/json` to include an income section/sheet.

### Web frontend
- [ ] `src/lib/stores/income-store.ts` — copy `expense-store.ts`.
- [ ] `src/app/(dashboard)/income/page.tsx` — copy expenses page (source instead of payment method, no receipt upload).
- [ ] Add `Income` nav item to **both** `sidebar.tsx` and `mobile-nav.tsx` (e.g. `TrendingUp` icon, `/income`).
- [ ] Dashboard: add Total Income + Net cards; update trends chart.

### Mobile frontend
- [ ] `mobile/app/(tabs)/income.tsx` + `mobile/hooks/useIncome.ts` (copy expenses screen/hook).
- [ ] Add Income tab to `mobile/app/(tabs)/_layout.tsx`.
- [ ] Update `mobile/hooks/useDashboard.ts` to fetch income and show net.

### Tests
- [ ] `tests/unit/schemas/income.test.ts` (copy `expense.test.ts`, adapt to `source`/no-receipt).
- [ ] Analytics tests updated for income + net calculations.

---

## 5. Phased delivery

**Phase 1 — Backend & data (✅ DONE, code-side):** income types (web+mobile), `income.ts` schemas
(web+mobile), `/api/v1/income` GET/POST + `[id]` PUT/DELETE routes, schema tests (11 new, 65 total pass),
and `supabase/income.sql` DDL. *Remaining:* **run `supabase/income.sql` in the Supabase project** — the
table does not exist yet, so live CRUD returns a DB error until the migration is applied.

**Phase 2 — Web UI (✅ DONE):** `income-store.ts`, `/income` page (source instead of payment method, no
receipt), Income nav entry in `sidebar.tsx` + `mobile-nav.tsx`. Typecheck + lint + tests green; the route
answers with the standard 401 envelope. Blocked on the same Supabase migration for end-to-end use.

**Phase 3 — Dashboard & analytics (✅ DONE, except exports):** `analytics/summary` now returns income
totals, `netTotal`, `incomeCount`, and `bySource`; `analytics/trends` returns per-month `income` and `net`
alongside expense totals. Dashboard shows four cards (**Total Income**, Total Spending, **Net Cash Flow**,
Transactions) and an **Income vs Spending** two-bar trends chart. Typecheck + lint + 64 tests green.
*Deferred:* income in CSV/JSON/PDF exports — the PDF handler consumes the JSON export's expense-array shape,
so that chain needs its own careful pass rather than a quick additive change.

**Phase 4 — Mobile (✅ DONE):** `useIncome` hook, `IncomeForm` (no category/tags/receipt), income list
tab (`(tabs)/income.tsx`) with source filter + FAB, `income/new` + `income/[id]` modal screens, registered
in the tab bar (`trending-up` icon) and root stack. `useDashboard` now fetches income in parallel and
exposes `incomeTotal`/`netTotal`; the mobile dashboard shows Income + Spending cards and a Net-this-month
card (green/red). Expo regenerated typed routes; mobile `tsc` clean, lint 0 errors (new files carry only the
pre-existing `set-state-in-effect` pattern shared with `useExpenses`).

**Phase 5 — Exports (✅ DONE):** the exports page has an **Expenses / Income** toggle; the CSV, JSON, and
PDF buttons all act on the selected type. `exports/csv` and `exports/json` take a `?type=income|expenses`
param (income columns: Date, Description, Amount, Source, Notes — no category/tags/payment). PDF branches to
an "Income Report" with Date/Description/Source/Amount. Typecheck + lint + 64 tests green.

---

## 6. Open questions

1. **`source` vs. reuse `payment_method`?** Recommended: a dedicated `source` enum. Confirm the value list.
2. **Typed categories now or later?** Ship v1 with shared/uncategorized, or add `categories.kind` up front?
3. **Recurring income?** Keep the recurring fields (salary is naturally recurring) or defer to a later phase?
4. **Budgets vs. income?** Out of scope for v1, but net-cash-flow framing may later change how budgets are presented.
5. **Analytics shape:** extend the existing `analytics/summary` + `trends` handlers, or add parallel `analytics/income/*` routes? (Extending keeps one round-trip; parallel keeps handlers small.)

---

## 7. Risk & effort

- **Risk: Low.** Additive-only; the audited expense path is untouched (Option A). Main watch-items are the
  two-file type/schema sync (known drift risk) and remembering RLS on the new table.
- **Effort:** ~Phase 1–2 is a focused day given how mechanical the mirroring is; Phases 3–4 add dashboard/mobile polish.
