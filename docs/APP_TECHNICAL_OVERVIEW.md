# Streamrolling — Technical Overview (Low-Level)

This document describes how the Streamrolling app works at a low level: data flows, environment variables (names only, no values), database usage, API routes, and inner workings. It is intended for developers who need to understand or modify the system.

---

## 1. Stack and entry points

- **Framework:** Next.js 15 (App Router).
- **Auth:** Clerk. All protected routes and API routes resolve the user via `getAuth(request)` (or `auth()` on server components); `userId` is the Clerk user ID (string).
- **Database:** Supabase (PostgreSQL). Two clients: (1) **anon** client in `lib/supabase.ts` for app and API routes that scope by `user_id`; (2) **service role** client in `lib/supabase-server.ts` used only by the cron job to list users.
- **Payments:** Stripe (subscriptions). Subscription state is mirrored into Clerk metadata (`isPaid`, `stripeSubscriptionId`, `cancelAtPeriodEnd`) via webhooks.
- **External APIs:** TMDB (movies/TV metadata and watch/providers). Some code uses `NEXT_PUBLIC_TMDB_API_KEY`, other server-only code uses `TMDB_API_KEY` (see Environment variables).
- **Email:** Pluggable transport (AWS SES API or SMTP). Used for rolling-plan reminder emails and test emails; configured via env (see Email and cron).

---

## 2. Environment variables (names only)

All references below are to variable **names**; values are not listed.

### 2.1 Required for core app

| Variable | Where used | Purpose |
|----------|------------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `app/layout.tsx` | Clerk provider (client + server). |
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase.ts`, `lib/supabase-server.ts` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase.ts` | Supabase anon key for app and API (user-scoped queries). |
| `NEXT_PUBLIC_TMDB_API_KEY` | `lib/load-user-shows.ts`, `app/dashboard/DashboardClient.tsx` | TMDB API key for loading show details and watch/providers (server and client fetch). |
| `TMDB_API_KEY` | `lib/tmdb.ts` | TMDB API key for server-only TMDB calls (trending, search, movie/show detail pages). |

### 2.2 Stripe

| Variable | Where used | Purpose |
|----------|------------|--------|
| `STRIPE_SECRET_KEY` | `app/api/create-checkout-session/route.ts`, `app/api/cancel-subscription/route.ts`, `app/api/stripe/webhook/route.ts` | Stripe server API. |
| `STRIPE_WEBHOOK_SECRET` | `app/api/stripe/webhook/route.ts` | Verify Stripe webhook signature. |
| `STRIPE_PRICE_ID` | `app/api/create-checkout-session/route.ts` | Price ID for the subscription line item. |
| `NEXT_PUBLIC_CLERK_BASE_URL` | `app/api/create-checkout-session/route.ts` | Base URL for Stripe success/cancel redirects (e.g. dashboard, upgrade). |

### 2.3 Email (SES or SMTP)

| Variable | Where used | Purpose |
|----------|------------|--------|
| `EMAIL_PROVIDER` | `lib/email/index.ts` | `ses` (default) or `smtp`. |
| `EMAIL_FROM` | `lib/email/ses.ts`, `lib/email/smtp.ts` | Sender address (fallback). |
| `SES_FROM` | `lib/email/ses.ts` | Sender if `EMAIL_FROM` not set. |
| `AWS_REGION` | `lib/email/ses.ts` | AWS region for SES. |
| `SES_REGION` | `lib/email/ses.ts` | Region if `AWS_REGION` not set. |
| (SES uses default AWS credential chain: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, or IAM role.) | | |
| `SMTP_HOST` | `lib/email/smtp.ts` | SMTP server host (when `EMAIL_PROVIDER=smtp`). |
| `SMTP_PORT` | `lib/email/smtp.ts` | SMTP port (default 587). |
| `SMTP_USER` | `lib/email/smtp.ts` | SMTP auth username. |
| `SMTP_PASSWORD` | `lib/email/smtp.ts` | SMTP auth password. |
| `SMTP_FROM` | `lib/email/smtp.ts` | Sender if `EMAIL_FROM` not set. |

### 2.4 Email / app branding and URLs

| Variable | Where used | Purpose |
|----------|------------|--------|
| `NEXT_PUBLIC_APP_NAME` | `lib/email/index.ts` | Site name in emails (default "Streamrolling"). |
| `NEXT_PUBLIC_APP_URL` | `lib/email/index.ts`, email templates | Base URL for links in emails (manage-subscriptions, dashboard, settings). |

### 2.5 Cron and notifications

| Variable | Where used | Purpose |
|----------|------------|--------|
| `CRON_SECRET` | `app/api/cron/rolling-reminder/route.ts` | Must match `Authorization: Bearer <value>` when Vercel (or caller) invokes the cron. |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase-server.ts`, `app/api/cron/rolling-reminder/route.ts` | Supabase service role key so the cron can list all users with shows and notification prefs. |

---

## 3. Middleware and auth

- **File:** `middleware.ts`.
- **Behavior:** Uses `clerkMiddleware()`. Runs on all routes except `_next`, static assets (by extension), and similar. Always runs for `/api/*` and `/trpc/*`.
- **Effect:** Clerk attaches auth state to the request. API routes and server components use `getAuth(request)` or `auth()` to obtain `userId`; unauthenticated requests are handled in each route (e.g. 401 or redirect).

---

## 4. Database (Supabase)

### 4.1 Tables used by Streamrolling

- **`user_shows`**  
  One row per show/movie saved by a user.  
  - **Columns (conceptual):** `id`, `user_id` (Clerk user ID), `tmdb_id`, `media_type` (`tv` | `movie`), `sort_order` (display order on dashboard), `favorite` (boolean), `watch_live` (boolean).  
  - **Usage:** All show list and plan logic; add/show order/favorite/watch live/remove APIs.  
  - **Scoping:** All queries filter by `user_id` from Clerk.

- **`user_notification_preferences`**  
  One row per user for email reminder settings.  
  - **Columns:** `user_id` (PK, Clerk ID), `email_rolling_reminder_enabled` (boolean), `updated_at`.  
  - **Usage:** Settings page and notification API; cron reads it to decide who gets reminder emails.

- **`notification_sent`**  
  Log of sent reminder emails (for rate limiting).  
  - **Columns:** `id` (uuid), `user_id`, `sent_at`, `kind` (e.g. `rolling_reminder`).  
  - **Usage:** Cron and `lib/notification-sent.ts` to enforce “max 2 rolling reminders per 6 months” for free users.

Other tables (e.g. `comments`, `recipes`, `recipes_unlocked`) belong to the template’s recipe/LMS features and are not required for the Streamrolling flows described here.

### 4.2 Supabase clients

- **Anon client (`lib/supabase.ts`):** Used by the app and by API routes. All access is scoped by `user_id` from Clerk; no direct listing of “all users.”
- **Service role client (`lib/supabase-server.ts`):** Created only when `SUPABASE_SERVICE_ROLE_KEY` is set. Used only by the cron job to query `user_shows` and `user_notification_preferences` across all users. Must never be exposed to the client.

---

## 5. Clerk metadata (subscription state)

Stripe webhooks keep Clerk in sync with subscription state:

- **`isPaid`** (or `is_paid`): `true` when the user has an active paid subscription; set on `checkout.session.completed`, cleared on `customer.subscription.deleted`.
- **`stripeSubscriptionId`:** Stored in private metadata when checkout completes; used by cancel-subscription and by webhook to match `customer.subscription.deleted` to a user if metadata is missing.
- **`cancelAtPeriodEnd`:** Set when the user chooses “cancel at period end” (via `POST /api/cancel-subscription`); used to show “Resubscribe” and messaging.

Subscription status is read in: dashboard page (server), subscription-status API, add-show (free-tier limit), cron (who gets monthly emails).

---

## 6. TMDB and streaming provider resolution

### 6.1 TMDB usage

- **Server-only (`lib/tmdb.ts`):** Trending TV, show/movie details, next-season episodes, search (TV and movie). Uses `TMDB_API_KEY`. Responses can be cached (e.g. `next: { revalidate: 3600 }`).
- **Load user shows:** `lib/load-user-shows.ts` and `app/dashboard/DashboardClient.tsx` fetch TMDB with `append_to_response=watch/providers` and use `NEXT_PUBLIC_TMDB_API_KEY`.

For each show/movie we need:
- **Subscription window:** From `lib/recommendation.ts` — either from episode air dates (`calculateSubscriptionWindow`) or from first/last air date or release date (`calculateSubscriptionWindowFromDates`). Produces `primarySubscribe`, `primaryCancel`, optional `secondarySubscribe` (e.g. “watch live” month), and `isComplete`.
- **Service name:** From TMDB `watch/providers.results.<region>.flatrate`. We do **not** use only US: we use `getFlatrateFromRegions(details['watch/providers'])` (US, then GB, CA, then any region with data) so titles without US data still get a provider when available. Then `pickPrimaryProvider(flatrate)` returns a display name (e.g. “Prime Video”, “Max”), or `"Unknown"` if none.

### 6.2 Streaming providers (`lib/streaming-providers.ts`)

- **`STREAMING_PROVIDERS`:** List of known services with `id`, `name`, `cancelUrl`, optional `subscribeUrl` (for future affiliate links), `logoUrl`, and `aliases` (for matching TMDB names).
- **`getFlatrateFromRegions(watchProviders, regions?)`:** Returns the first non-empty `flatrate` among the given regions (default US, GB, CA), or from any region as fallback.
- **`pickPrimaryProvider(flatrate)`:** Picks one provider name from the flatrate list; prefers “direct” service names over channel variants (e.g. “Paramount Plus Apple TV Channel” → “Paramount+”); normalizes tier names; returns `"Unknown"` if empty.
- **`getProviderForServiceName(serviceName)`:** Maps a service name (or alias) to the corresponding `StreamingProvider` entry (for cancel URL, logo, etc.).

---

## 7. Subscription windows and planner

### 7.1 Recommendation windows (`lib/recommendation.ts`)

- **TV with episodes:** `calculateSubscriptionWindow(episodes)` uses episode `air_date`s. If the season is complete, it recommends “binge in one month” and cancel the next; if not, subscribe in the month after the last episode, with optional `secondarySubscribe` for “watch live” (first episode month).
- **TV without episodes / movies:** `calculateSubscriptionWindowFromDates(firstAirDate, lastAirDate)` or release date. Same idea: subscribe in a given month, cancel the next; single date (e.g. movie) uses the month of release.

Output shape includes `primarySubscribe`, `primaryCancel`, `secondarySubscribe`, `isComplete`, and labels/notes.

### 7.2 Planner (`lib/planner.ts`)

- **Input:** Array of `Show` objects (title, service, window, favorite, watchLive, addedOrder).
- **Month keys:** `getNext12MonthKeys()` returns the next 12 calendar months from “today” as `YYYY-MM`.
- **Algorithm (`buildSubscriptionPlan`):**  
  - For each show, determine its “subscribe month” from `window.primarySubscribe` or, if Watch Live and `secondarySubscribe` exists, from `secondarySubscribe`.  
  - If that month is in the next 12, the show contributes to that month.  
  - Watch Live shows that would land in a past month are shifted to the current month so they still get a slot.  
  - Each (service, month) gets a score: Watch Live 10, Favorite 5, else 1.  
  - For each month, we assign **one** service: the one with the highest score for that month; tiebreak by lower `addedOrder`.  
  - We also compute `alsoWatchLive` for that month (other services that had Watch Live shows there).  
  - Services that never “won” a month are assigned to the first remaining empty month (fallback).
- **Output:** A calendar (record of month key → `MonthPlan`: `service`, `shows`, optional `alsoWatchLive`).  
- **`buildRollingPlan(shows)`** returns `{ months: [{ key, label }], plan }` for the UI.

---

## 8. Dashboard and “My Shows”

### 8.1 Server-side (dashboard page)

- **File:** `app/dashboard/page.tsx`.  
- **Auth:** Redirects to sign-in if no `userId`.  
- **Data loaded:**  
  - Clerk user → `isPaid`, `cancelAtPeriodEnd`.  
  - `loadUserShows(userId)` → full list of shows with TMDB details, windows, and service names.  
  - If there are shows, `buildRollingPlan(initialShows)` → `initialPlan` (months + plan).  
- **Render:** Passes `initialIsPaid`, `initialCancelAtPeriodEnd`, `initialShows`, `initialPlan` to `DashboardClient`. The calendar grid is rendered as **server children**: either `RollingPlanGrid` (with `initialPlan`) or an empty state. This way the calendar is in the initial HTML (works in Firefox and without client JS).

### 8.2 Client-side (DashboardClient)

- **State:** `shows` (starts as `initialShows`), `isPaid`, `cancelAtPeriodEnd`, view mode (cards/compact/list, persisted in `localStorage` under `streamrolling-dashboard-view`), loading, etc.
- **Re-hydration:** On mount, when `userId` is available, the client fetches `user_shows` from Supabase (ordered by `sort_order`), then for each row fetches TMDB (movie or TV + season) and watch/providers, computes window and service with the same logic as `load-user-shows`, and sets `shows`. So after load, the client has its own copy; mutations (reorder, favorite, watch live, remove) update local state and call `router.refresh()` so the server re-renders and the calendar stays in sync.
- **Rolling plan display:** The server-rendered grid (`children`) is wrapped in a container; when there are shows and `initialPlan`, `RollingPlanTooltips` is overlaid (client) to provide tooltips. The grid itself is not re-built on the client for the initial paint; after mutations, `router.refresh()` gets a new server-rendered plan.
- **Reorder:** Drag-and-drop updates local `shows` order and calls `POST /api/shows-order` with `{ order: tmdb_id[] }`. Each `user_shows` row is updated to `sort_order = index`. Then `router.refresh()`.
- **Favorite / Watch live:** `POST /api/toggle-favorite` or `POST /api/toggle-watch-live` with `tmdbId` and new boolean; Supabase `user_shows` updated; local state updated; `router.refresh()`.
- **Remove show:** `POST /api/remove-show` with `tmdbId`; row deleted; local state filtered; `router.refresh()`.
- **Remove all:** Client deletes all `user_shows` for `userId` via Supabase, clears local state, `router.refresh()`.

### 8.3 Rolling plan grid and tooltips

- **RollingPlanGrid** (`app/dashboard/RollingPlanGrid.tsx`): Presentational, server-rendered. Receives `plan` (months + plan map). Renders one cell per month with service name or “Open”; shows `alsoWatchLive` when present.
- **RollingPlanTooltips** (`app/dashboard/RollingPlanTooltips.tsx`): Client component. Overlays tooltips on the grid; uses `shows` and `plan` to show which shows belong to each month’s service.

---

## 9. Add to My Shows and show limits

- **Add to My Shows:** `AddToMyShowsButton` (movie and show pages) calls `POST /api/add-show` with `{ tmdbId, mediaType }`.  
- **Add-show API:**  
  - Resolves `userId` via Clerk.  
  - If not paid, counts existing `user_shows` for this user; if count ≥ 5, returns 402 “Free tier limit reached (5 shows). Upgrade for unlimited.”  
  - Computes next `sort_order` (max + 1), inserts one row into `user_shows` (`user_id`, `tmdb_id`, `media_type`, `sort_order`).  
- **Check saved:** `GET /api/check-saved?tmdbId=<id>` returns `{ saved: true|false }` so the button can show “Already in My Shows.”

---

## 10. Movie and show detail pages

- **Movie:** `app/movie/[id]/page.tsx`. Fetches movie via `getMovieDetails(id)` (TMDB, with watch/providers). Window from `calculateSubscriptionWindowFromDates(release_date)`. Service from `getFlatrateFromRegions` + `pickPrimaryProvider`; provider from `getProviderForServiceName`. Renders poster, title, release date, rating, overview, primary recommendation (service + month), cancel-by text, and `AddToMyShowsButton` with `mediaType="movie"`.
- **Show:** `app/show/[id]/page.tsx`. Fetches show and next-season episodes via `getShowDetails` and `getNextSeasonEpisodes`. Window from episodes or dates. Same provider resolution. Renders primary recommendation and, if applicable, alternative “watch live” month; then `AddToMyShowsButton` (default `mediaType="tv"`).
- **Links:** Cards and links use `media_type` and `id` to route to `/movie/[id]` or `/show/[id]`.

---

## 11. Search and home

- **Home:** `app/page.tsx`. Server-fetches trending TV via `getTrendingTV()` (TMDB). Renders hero, `SearchBar`, and a grid of `ShowCard`s. No auth required.
- **Search:** `app/search/page.tsx`. Reads `searchParams.q`. If present, calls `searchShows(query)` and `searchMovies(query)` (TMDB), merges results with `media_type` set. Renders `SearchBar` with `initialQuery={query}` and a grid of results. Each result links to the correct detail page by type.

---

## 12. Stripe subscription lifecycle

- **Checkout:** User hits “Upgrade” (e.g. from dashboard or upgrade page). Frontend calls `POST /api/create-checkout-session`. That route uses `getAuth(request)`, then creates a Stripe Checkout Session (subscription, `STRIPE_PRICE_ID`), with `client_reference_id` and `metadata.userId` and `subscription_data.metadata.userId` set to Clerk `userId`. Returns `{ url }`; client redirects to Stripe.
- **Success/cancel URLs:** Point to `NEXT_PUBLIC_CLERK_BASE_URL` (e.g. `/dashboard?success=true`, `/upgrade?cancelled=true`).
- **Webhook (`app/api/stripe/webhook/route.ts`):**  
  - **`checkout.session.completed`:** Reads `userId` from metadata (or client_reference_id); retrieves subscription id; updates Clerk user `publicMetadata` and `privateMetadata` with `isPaid: true` and `stripeSubscriptionId`.  
  - **`customer.subscription.deleted`:** Resolves user by subscription metadata or by matching `stripeSubscriptionId` in Clerk; sets `isPaid: false` and clears cancel-at-period-end.
- **Cancel at period end:** `POST /api/cancel-subscription` finds the user’s Stripe subscription (from Clerk `stripeSubscriptionId` or by email + Stripe customer), calls `stripe.subscriptions.update(..., cancel_at_period_end: true)`, and sets Clerk `cancelAtPeriodEnd: true`.

---

## 13. Email notifications (rolling reminder)

### 13.1 Design choices

- Emails contain **only links to the app’s domain** (e.g. manage-subscriptions, dashboard, notification settings). No direct links to streamers in the email body, to protect deliverability/reputation.
- Transport is pluggable: **SES** (AWS SDK `SendEmail`) or **SMTP** (nodemailer). Chosen via `EMAIL_PROVIDER`; each transport has its own env vars (see Environment variables).
- **Free users:** At most 2 rolling-reminder emails per rolling 6-month window (enforced by counting rows in `notification_sent`).
- **Paid users:** Can receive a reminder every month they have a plan; no cap.

### 13.2 Templates and sending

- **Templates:** Implemented in code in `lib/email/index.ts`. `buildRollingReminderHtml(payload)` builds HTML (dark theme, emerald accents); `buildRollingReminderText(payload)` builds plain text. Both are sent (multipart) so clients that don’t render HTML still get the message.
- **Payload:** `RollingReminderPayload`: `cancelService`, `cancelBy`, `subscribeService`, `subscribeMonthLabel`, `subscribeMonthKey`. No streamer URLs in the payload for the email body; the single CTA is “Manage subscriptions” → `/manage-subscriptions`.
- **Sending:** `sendRollingReminder(to, payload)` builds subject, HTML, and text, then calls `sendMail({ to, subject, html, text })`. Transport is obtained from `getEmailTransport()` (cached; chosen by `EMAIL_PROVIDER`).

### 13.3 Notification preferences and sent log

- **Preferences:** `lib/notification-preferences.ts`. Table `user_notification_preferences`. `getOrCreatePreferences(userId)` returns or creates a row (default `email_rolling_reminder_enabled: true`). `updateNotificationPreferences(userId, enabled)` upserts by `user_id`.
- **Sent log:** `lib/notification-sent.ts`. Table `notification_sent`. `countRollingRemindersLast6Months(admin, userId)` counts rows for that user with `kind = 'rolling_reminder'` and `sent_at` within the last 6 months. `recordRollingReminderSent(admin, userId)` inserts one row after a successful send.

### 13.4 Cron job (`app/api/cron/rolling-reminder/route.ts`)

- **Trigger:** Vercel cron (see `vercel.json`) or any caller that sends `Authorization: Bearer <CRON_SECRET>`.
- **Steps:**  
  1. Verify `Authorization: Bearer <CRON_SECRET>`.  
  2. Obtain Supabase admin client (`getSupabaseAdmin()` → requires `SUPABASE_SERVICE_ROLE_KEY`).  
  3. List distinct `user_id` from `user_shows`; list `user_id` from `user_notification_preferences` where `email_rolling_reminder_enabled = true`. Intersect to get candidate users.  
  4. For each candidate: get Clerk user (email); if no email, skip. If user is not paid, call `countRollingRemindersLast6Months`; if ≥ 2, skip. Load user’s shows and build plan; get current and next month’s service; call `sendRollingReminder(email, payload)`; on success, call `recordRollingReminderSent(admin, userId)`.  
  5. Return `{ sent, total }`.

### 13.5 Test email

- **Route:** `GET` or `POST /api/test-rolling-reminder`. Requires signed-in user (`getAuth(request)`). Sends one rolling reminder to the user’s primary Clerk email using the same payload and template as the cron. Does **not** insert into `notification_sent`. Used for on-demand testing (e.g. from the notification settings page “Send test email” button).

### 13.6 Vercel cron schedule

- **File:** `vercel.json`. One cron: path `/api/cron/rolling-reminder`, schedule `0 9 28 * *` (28th of each month at 09:00 UTC). When Vercel runs it, it sends the `CRON_SECRET` in the `Authorization` header.

---

## 14. Manage-subscriptions page

- **Route:** `app/manage-subscriptions/page.tsx`. Auth required; redirects to sign-in if no user.
- **Data:** Loads user’s shows and builds the rolling plan. Derives “this month” cancel service and optional cancel URL (via `getProviderForServiceName`), and “next month” subscribe service.
- **UI:**  
  - “Your plan this month”: Cancel [Service] by [date] with “Go to cancel page” link (external to streamer’s `cancelUrl`); Subscribe for [month]: [Service].  
  - Table: Service | Cancel | Subscribe. Rows are **ordered like the rolling plan**: unique services in the order they first appear in the next 12 months, then the rest of `STREAMING_PROVIDERS` in their default order. Cancel column links to each provider’s `cancelUrl`; Subscribe column shows “—” or a link when `subscribeUrl` is set (for future affiliate links).
- **Purpose:** Central place for all cancel (and later subscribe) links so the email only links to this page.

---

## 15. Settings and notification API

- **Settings page:** `app/settings/notifications/page.tsx`. Client fetches `GET /api/notification-preferences` and `GET /api/subscription-status`. Toggle for “Rolling plan reminder” calls `PATCH /api/notification-preferences` with `{ email_rolling_reminder_enabled }`. “Send test email” calls `POST /api/test-rolling-reminder`.
- **Notification-preferences API:** `GET` returns or creates prefs (default on). `PATCH` accepts `{ email_rolling_reminder_enabled: boolean }` and upserts. Both use `getAuth(request)` and scope by `userId`.

---

## 16. API routes summary

| Method | Path | Auth | Purpose |
|--------|------|------|--------|
| POST | `/api/add-show` | Required | Add show/movie to My Shows; enforces 5-show limit for free users. |
| GET | `/api/check-saved` | Optional | Query `tmdbId`; returns whether current user has it in `user_shows`. |
| POST | `/api/remove-show` | Required | Delete one `user_shows` row by `user_id` and `tmdb_id`. |
| POST | `/api/shows-order` | Required | Body `{ order: number[] }` (tmdb_ids); updates `sort_order` for each. |
| POST | `/api/toggle-favorite` | Required | Body `{ tmdbId, favorite }`; updates `user_shows.favorite`. |
| POST | `/api/toggle-watch-live` | Required | Body `{ tmdbId, watchLive }`; updates `user_shows.watch_live`. |
| GET | `/api/subscription-status` | Optional | Returns `{ isPaid }` from Clerk metadata. |
| POST | `/api/create-checkout-session` | Required | Creates Stripe Checkout Session for subscription; redirect URLs use `NEXT_PUBLIC_CLERK_BASE_URL`. |
| POST | `/api/cancel-subscription` | Required | Sets Stripe subscription to cancel at period end; updates Clerk `cancelAtPeriodEnd`. |
| POST | `/api/stripe/webhook` | Stripe signature | Handles `checkout.session.completed` and `customer.subscription.deleted`; updates Clerk. |
| GET / POST | `/api/notification-preferences` | Required (GET/PATCH) | Get or update user notification preferences. |
| GET / POST | `/api/test-rolling-reminder` | Required | Send one test rolling reminder to current user’s email. |
| GET | `/api/cron/rolling-reminder` | Bearer `CRON_SECRET` | Sends monthly rolling reminders to eligible users; uses Supabase service role. |

---

## 17. Key file reference

| Area | Files |
|------|--------|
| Auth / middleware | `middleware.ts`, Clerk in `layout.tsx` |
| DB | `lib/supabase.ts`, `lib/supabase-server.ts` |
| Shows & plan | `lib/load-user-shows.ts`, `lib/planner.ts`, `lib/recommendation.ts` |
| TMDB | `lib/tmdb.ts` |
| Streaming providers | `lib/streaming-providers.ts` |
| Dashboard | `app/dashboard/page.tsx`, `app/dashboard/DashboardClient.tsx`, `RollingPlanGrid.tsx`, `RollingPlanTooltips.tsx` |
| Email | `lib/email/types.ts`, `lib/email/ses.ts`, `lib/email/smtp.ts`, `lib/email/index.ts` |
| Notifications | `lib/notification-preferences.ts`, `lib/notification-sent.ts`, `app/api/cron/rolling-reminder/route.ts`, `app/api/test-rolling-reminder/route.ts`, `app/settings/notifications/page.tsx` |
| Subscriptions | `app/api/create-checkout-session/route.ts`, `app/api/cancel-subscription/route.ts`, `app/api/stripe/webhook/route.ts` |
| Manage links | `app/manage-subscriptions/page.tsx` |

---

This document is the single low-level reference for how the app works and which environment variables are used (by name only). For deployment and email/cron setup, see `docs/EMAIL_AND_CRON.md` and your deployment docs.
