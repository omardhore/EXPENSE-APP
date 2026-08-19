# Expense Tracker — Mobile (React Native / Expo)

React Native app for the same Supabase backend the web app
(`../src`) uses. Built with Expo + expo-router.

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # fill in your Supabase project values
npm start               # then press i / a / w, or scan the QR code
```

## Architecture

**Most data (expenses, budgets, categories, profile, receipts) talks
directly to Supabase** via `@supabase/supabase-js`, the same project and
Row Level Security policies the web app's database uses. This is the
standard, Supabase-documented pattern for native clients and avoids
needing a cookie-session bridge to the Next.js API routes, which are
built for browser clients.

**Account deletion and "clear workspace data" are the exception** — both
need the server's service-role key, which must never ship inside a mobile
app bundle. Those two screens call back into the web app's
`/api/v1/account` and `/api/v1/data` routes over HTTPS, sending the
user's Supabase access token as a Bearer header (`lib/api.ts`). Set
`EXPO_PUBLIC_API_URL` in `.env` to the web app's deployed URL for these to
work.

`lib/database.types.ts` mirrors `../src/lib/types/database.ts` by hand —
there's no shared types package yet, so update both when the schema
changes.

## What's implemented

- Email/password auth + password reset (deep link:
  `expensetracker://reset-password`)
- Expenses: list, add, edit, delete, category filter, receipt photo
  upload/view (private bucket + signed URLs, same as the web app)
- Budgets: list with spend-vs-limit progress, add/edit/delete
- Categories: list, add/edit/delete
- Dashboard: this-month total, category breakdown, budget warnings
- Settings: profile (name/currency), sign out, clear data, delete account

## Known gaps / needs device testing

Nothing here has run on an actual simulator or device — this was built
without one available. Before shipping, verify on a real iOS/Android
device or simulator:

- **Password reset deep link.** `app/reset-password.tsx` expects Supabase
  to redirect with `access_token`/`refresh_token` as query params on the
  `expensetracker://reset-password` scheme. Confirm this against your
  Supabase project's actual mobile redirect behavior (dashboard → Auth →
  URL configuration needs `expensetracker://reset-password` allow-listed).
- **Google OAuth** isn't implemented on mobile yet (email/password only).
  Web's OAuth uses a redirect flow that doesn't translate directly —
  would need `expo-auth-session` and a proper deep-link callback.
- **Filtering** is narrower than web: category filter only, no date
  range / amount range / tag / search yet.
- **Offline support** is not implemented — this is an online-only v1.
  Actions will fail with a network error if offline rather than queuing.
- **Recurring expenses** are a label only (matches the web app) — no
  auto-generation of future occurrences.
