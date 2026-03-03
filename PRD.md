# Expense Tracking System - Software Architecture (Revised)

## 1. System Overview

A web-based personal expense tracking application for individuals to manage their finances, track spending habits, capture receipts, categorize expenses, set budgets, and gain insights into their financial health.

---

## 2. Architecture Pattern

**Simplified Two-Tier Architecture** optimized for personal use.

Next.js handles both the presentation and API layers via built-in API routes/server actions, eliminating the need for a separate backend server.

```
┌──────────────────────────────────────────────┐
│              Vercel                           │
│  ┌─────────────────────────────────────────┐ │
│  │   Next.js (SSR + API Routes)            │ │
│  │   ├── Pages / React Components          │ │
│  │   └── /api/* (serverless functions)     │ │
│  └──────────────────┬──────────────────────┘ │
└─────────────────────┼────────────────────────┘
                      │
         ┌────────────▼────────────────┐
         │        Supabase             │
         │  ├── PostgreSQL + RLS       │
         │  ├── Auth (email/OAuth/JWT) │
         │  ├── Storage (receipts)     │
         │  ├── pg_cron (recurring     │
         │  │   expenses, summaries)   │
         │  └── Edge Functions (if     │
         │      needed for webhooks)   │
         └─────────────────────────────┘
```

**Why not a separate Express backend?**

- Next.js API routes run as serverless functions on Vercel — no server to manage.
- Eliminates CORS configuration, a second deployment unit, and an extra network hop on every request.
- If long-running jobs arise later that don't fit serverless, a lightweight worker can be added then.

---

## 3. Core Components

### 3.1 Frontend Layer

| Concern            | Choice                                    |
| ------------------- | ----------------------------------------- |
| Framework           | React with Next.js (App Router, SSR/SSG)  |
| State Management    | Zustand                                   |
| UI Components       | shadcn/ui + Tailwind CSS                  |
| Charts              | Recharts                                  |

**Key Features:**

- Personal dashboard with spending overview
- Receipt upload (drag & drop, mobile camera)
- Quick expense entry
- Interactive charts and visualizations
- Budget tracking with progress bars
- Calendar view for expenses
- Search and filtering
- Dark mode support

### 3.2 API Layer (Next.js API Routes)

All backend logic lives inside `app/api/` as serverless functions.

**Endpoints:**

```
GET    /api/v1/expenses?startDate=&endDate=&category=&page=&limit=
POST   /api/v1/expenses
PUT    /api/v1/expenses/:id
DELETE /api/v1/expenses/:id          (soft delete)
POST   /api/v1/expenses/:id/receipt

GET    /api/v1/categories
POST   /api/v1/categories
PUT    /api/v1/categories/:id
DELETE /api/v1/categories/:id

GET    /api/v1/budgets
PUT    /api/v1/budgets/:id

GET    /api/v1/analytics/summary?period=month
GET    /api/v1/analytics/trends
GET    /api/v1/analytics/by-category

GET    /api/v1/exports/csv?startDate=&endDate=
GET    /api/v1/exports/pdf?startDate=&endDate=
```

> **Note:** Export endpoints use GET — they generate read-only reports, not new resources. This allows browser caching and direct link sharing.

### 3.3 Data Layer

**Primary Database:** Supabase PostgreSQL

#### Schema

```sql
-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY,  -- managed by Supabase Auth
  email           VARCHAR(255) NOT NULL UNIQUE,
  name            VARCHAR(100),
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',  -- user's single currency
  theme           VARCHAR(10) NOT NULL DEFAULT 'light',
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(50) NOT NULL,
  icon            VARCHAR(50),
  color           VARCHAR(7),      -- hex color
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EXPENSES
-- (single table handles both one-off and recurring expenses)
-- ============================================================
CREATE TABLE expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount              DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  description         VARCHAR(255) NOT NULL,
  date                DATE NOT NULL,
  receipt_url         TEXT,
  payment_method      VARCHAR(10) NOT NULL DEFAULT 'other'
                        CHECK (payment_method IN ('cash','credit','debit','other')),
  tags                TEXT[] DEFAULT '{}',
  notes               TEXT,

  -- Recurrence fields
  is_recurring        BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency VARCHAR(10) CHECK (recurring_frequency IN ('weekly','monthly','yearly')),
  recurring_group_id  UUID,          -- links generated instances of the same recurrence
  next_due_date       DATE,          -- only set on the "template" row (is_recurring = true)

  -- Soft delete
  deleted_at          TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE budgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES categories(id) ON DELETE CASCADE,  -- null = overall budget
  period          VARCHAR(10) NOT NULL CHECK (period IN ('monthly','quarterly','yearly')),
  limit_amount    DECIMAL(12,2) NOT NULL CHECK (limit_amount > 0),
  alert_threshold INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold BETWEEN 1 AND 100),
  start_date      DATE NOT NULL,
  end_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MONTHLY SUMMARIES  (materialized for fast analytics)
-- ============================================================
CREATE TABLE monthly_summaries (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month           DATE NOT NULL,           -- first day of the month
  category_id     UUID REFERENCES categories(id) ON DELETE CASCADE,
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  expense_count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month, category_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_expenses_user_date       ON expenses(user_id, date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_user_category   ON expenses(user_id, category_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_user_date_cat   ON expenses(user_id, date, category_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_recurring_group ON expenses(recurring_group_id)
  WHERE recurring_group_id IS NOT NULL;
CREATE INDEX idx_budgets_user_period      ON budgets(user_id, period);
CREATE INDEX idx_categories_user          ON categories(user_id);
CREATE INDEX idx_monthly_summaries_user   ON monthly_summaries(user_id, month DESC);
```

> **Design decisions:**
>
> - **No separate `recurring_expenses` table.** The `expenses` table handles recurrence via `is_recurring`, `recurring_frequency`, `recurring_group_id`, and `next_due_date`. A pg_cron job materializes upcoming instances.
> - **No per-expense currency.** MVP stores all amounts in the user's single preferred currency. Multi-currency with exchange rates is deferred to Phase 2.
> - **Explicit settings columns** instead of a JSONB blob — provides validation, defaults, and queryability.
> - **Soft deletes** via `deleted_at`. All queries filter with `WHERE deleted_at IS NULL`. A nightly pg_cron job purges rows older than 30 days.
> - **Partial indexes** exclude soft-deleted rows to keep index size small.
> - **`monthly_summaries`** is refreshed nightly via pg_cron to keep analytics queries fast.

#### Row-Level Security (RLS)

```sql
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;

-- Example policy (repeat pattern for each table)
CREATE POLICY "Users can only access their own expenses"
  ON expenses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### File Storage: Supabase Storage

- **Bucket:** `receipts`
- **Max file size:** 10 MB
- **Accepted types:** JPEG, PNG, PDF only
- **Thumbnails:** generated via Supabase image transformations for display
- **Bucket policy:** authenticated users can only read/write their own folder (`{user_id}/*`)
- **CDN:** built-in via Supabase Storage

#### Background Jobs (pg_cron)

| Job                        | Schedule      | Description                                            |
| -------------------------- | ------------- | ------------------------------------------------------ |
| Materialize recurring      | Daily 00:00   | Generate expense rows from recurring templates          |
| Refresh monthly summaries  | Daily 01:00   | Recalculate `monthly_summaries` for current month       |
| Purge soft-deleted rows    | Daily 02:00   | Delete rows where `deleted_at` < now() - 30 days        |
| Budget alert check         | Daily 08:00   | Flag budgets exceeding `alert_threshold`                |

---

## 4. Security Architecture

### Authentication & Authorization

- **Supabase Auth** handles sign-up, sign-in, and token refresh.
- Supported methods: email/password, Google OAuth, GitHub OAuth, magic link.
- JWT tokens with automatic refresh.
- RLS policies ensure complete data isolation per user.

### Data Security

- Encryption at rest and in transit (Supabase managed).
- RLS on every user-facing table.
- Input validation and sanitization at the API route level (zod schemas).
- Parameterized queries via the Supabase client (prevents SQL injection).
- XSS protection via React's default escaping + Content-Security-Policy headers.

### Privacy

- User data isolation enforced at the database level via RLS.
- GDPR-compliant data export (`GET /api/v1/exports/csv`).
- Account deletion cascades all user data (expenses, categories, budgets, receipts).
- No third-party data sharing.

---

## 5. Performance & Optimization

### Database

- Partial indexes exclude soft-deleted rows.
- `monthly_summaries` table avoids full-table scans for analytics.
- Supabase connection pooling (PgBouncer).
- Cursor-based pagination for expense lists.

### Frontend

- Next.js SSR/SSG for fast initial load.
- Lazy loading for charts and analytics pages.
- Virtual scrolling for long expense lists (tanstack-virtual).
- Receipt image optimization via Supabase image transformations.
- Service worker for offline capability (PWA).

### API

- Serverless functions scale to zero — no idle cost.
- Response caching via Vercel edge cache for analytics endpoints.
- Zod schema validation rejects malformed requests early.

---

## 6. Deployment Architecture

### Local Development

```
Local Machine
├── Next.js dev server (localhost:3000)
│   ├── Pages + Components
│   └── API Routes (/api/*)
└── Supabase
    ├── Local instance (supabase start) OR cloud project
    ├── PostgreSQL
    ├── Auth
    └── Storage
```

### Production

```
Vercel
├── Next.js (SSR + Static pages)
├── API Routes (serverless functions)
└── Edge middleware (auth checks, redirects)

Supabase Cloud
├── PostgreSQL + RLS
├── Auth
├── Storage + CDN
├── pg_cron (background jobs)
└── Edge Functions (webhooks, if needed)

Optional: Cloudflare (additional CDN layer)
```

### Alternative Production Setup

```
Railway / Render / Fly.io
├── Next.js (single container, SSR + API)
└── Supabase Cloud (database + auth + storage)
```

---

## 7. Monitoring & Logging

### MVP

| Concern             | Tool                            |
| ------------------- | ------------------------------- |
| Database metrics    | Supabase Dashboard              |
| Frontend perf       | Vercel Analytics                |
| Error tracking      | Sentry (free tier)              |
| Uptime              | UptimeRobot (free tier)         |
| Logging             | Vercel function logs + Pino     |

### Key Metrics

- API response times (p50, p95, p99)
- Database query latency
- Error rate by endpoint
- Storage usage (receipts bucket)
- Active users (daily/weekly/monthly)

---

## 8. API Design Principles

### Standards

- RESTful, resource-based URLs.
- Versioned: `/api/v1/*`.
- Consistent error format across all endpoints.
- Zod schemas for request validation.

### Response Format

**Success:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "amount": 45.99,
    "category": "Food & Dining",
    "date": "2024-02-11"
  },
  "meta": {
    "timestamp": "2024-02-11T10:30:00Z"
  }
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount must be greater than zero.",
    "details": [
      { "field": "amount", "message": "Must be a positive number" }
    ]
  },
  "meta": {
    "timestamp": "2024-02-11T10:30:00Z"
  }
}
```

**Paginated list:**

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "timestamp": "2024-02-11T10:30:00Z",
    "pagination": {
      "cursor": "abc123",
      "hasMore": true,
      "total": 342
    }
  }
}
```

---

## 9. Development Workflow

### Version Control

- Git with feature branch workflow.
- Branch naming: `feat/`, `fix/`, `chore/`.
- PRs require passing CI checks before merge.

### CI/CD (GitHub Actions)

```
on push / PR:
  ├── Lint (ESLint + Prettier)
  ├── Type check (tsc --noEmit)
  ├── Unit tests (Vitest)
  ├── Integration tests (Vitest + Supabase local)
  └── Build (next build)

on merge to main:
  └── Auto-deploy to Vercel
```

### Testing Strategy

| Layer          | Tool              | Coverage Target |
| -------------- | ----------------- | --------------- |
| Unit           | Vitest            | Core logic 80%+ |
| Integration    | Vitest + Supertest| API routes       |
| E2E            | Playwright        | Critical flows   |
| Load           | k6                | Pre-launch       |

---

## 10. Future Enhancements

### Phase 2

- Mobile app (PWA first, React Native later)
- Multi-currency support with `exchange_rates` table and auto-conversion
- Bank account integration (Plaid API)
- Receipt OCR (Google Vision API or Tesseract.js)
- AI-powered expense categorization
- Redis caching layer (session storage, analytics, rate limiting)
- 2FA support

### Phase 3

- Spending insights and predictions
- Savings goals tracker
- Bill reminders and subscription tracking
- Investment tracking
- Net worth calculator
- Tax report generation
- Shared expenses (bill splitting)
- Export to accounting software (QuickBooks, Xero)
- Voice input for quick expense entry

---

## Technology Stack Summary

| Layer          | Technology                              |
| -------------- | --------------------------------------- |
| Frontend       | React, Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| API            | Next.js API Routes (serverless)         |
| Validation     | Zod                                     |
| Database       | Supabase PostgreSQL + RLS               |
| Auth           | Supabase Auth                           |
| Storage        | Supabase Storage                        |
| Background Jobs| pg_cron                                 |
| Hosting        | Vercel                                  |
| Monitoring     | Sentry, Vercel Analytics                |
| Testing        | Vitest, Playwright                      |
| CI/CD          | GitHub Actions + Vercel auto-deploy     |
