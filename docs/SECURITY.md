# Security overview and recommendations

This document summarizes the app’s security posture, where you’re in good shape, and where you could be vulnerable or should harden things. It does **not** replace a proper penetration test or audit.

---

## 1. What’s in good shape

### Authentication and authorization

- **Clerk** is used for auth; `userId` comes from Clerk on the server via `getAuth(request)` (API routes) or `auth()` (server components). There are no hardcoded user IDs; all user-scoped actions use this `userId`.
- **API routes** that mutate or return user-specific data require auth and scope by `userId`:
  - `add-show`, `remove-show`, `shows-order`, `toggle-favorite`, `toggle-watch-live`, `notification-preferences`, `check-saved`, `create-checkout-session`, `cancel-subscription`, `test-rolling-reminder` all use `getAuth(request)` and then filter by that `userId` when talking to Supabase or Clerk.
- **Stripe webhook** verifies the signature with `STRIPE_WEBHOOK_SECRET` before processing; no trust of raw POST body.
- **Cron** is gated by `CRON_SECRET` (Bearer token); without it, the rolling-reminder job returns 401.
- **Sensitive operations** (e.g. marking user paid, listing all users) use server-only code and env (e.g. Stripe secret key, `SUPABASE_SERVICE_ROLE_KEY` only in the cron).

### Data scoping

- All Supabase writes in API routes use `user_id` from Clerk (e.g. `.eq('user_id', userId)`). So through the API, users only affect their own rows.
- Subscription state is read from Clerk metadata (set by Stripe webhooks); free-tier limits (e.g. 5 shows) are enforced in the API using that metadata.

### Input and output

- No `dangerouslySetInnerHTML` or raw `innerHTML` with user input; React’s default escaping helps against XSS.
- Email body is built from trusted payload (service names, dates); user input is not interpolated into HTML except via escaped helpers in the email template.
- Redirects are to fixed paths or Stripe’s URL from the API (no user-controlled redirect URLs).

### Secrets

- Stripe secret key, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, and SMTP/SES credentials are only used on the server and are not prefixed with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_*` vars are limited to non-secret config (Supabase URL, anon key, TMDB key, app URL, Clerk publishable key, etc.). The anon key is intended to be public but should be restricted by RLS (see below).

---

## 2. Where you could be vulnerable

### 2.1 Supabase used from the client (biggest concern)

**What happens today**

- The dashboard loads “My Shows” **from the browser** via the Supabase client in `lib/supabase.ts` (anon key). `DashboardClient` calls `supabase.from('user_shows').select(...).eq('user_id', userId)` with `userId` from `useAuth()`.
- Tables `user_notification_preferences` and `notification_sent` use RLS with policies that currently allow all (`USING (true)`, `WITH CHECK (true)`). So anyone with the anon key can read/update any row if they call Supabase directly (e.g. from DevTools or a script).
- If `user_shows` has **no RLS or permissive RLS**, then anyone with the anon key could:
  - Query another user’s shows by sending a different `user_id`.
  - Insert/update/delete rows for any `user_id`.

So security today depends entirely on:

- Clients not modifying the app to send a different `userId`.
- No one using the anon key outside your app to hit Supabase directly.

**Recommendation**

- **Option A (preferred):** Stop using Supabase from the client for user-specific data. Load `user_shows` (and any other user data) only in server components or via API routes that use `getAuth(request)` and then query Supabase on the server. The dashboard already has server-loaded `initialShows`; you could rely on that and refill via an API (e.g. `GET /api/my-shows`) instead of client-side Supabase.
- **Option B:** Enable RLS on **all** user tables and enforce “user can only access own rows.” With Clerk, Supabase doesn’t have `auth.uid()`, so you’d need a pattern such as:
  - Passing a signed JWT or session token that includes `user_id` and using it in RLS (e.g. custom claim or request header), or
  - Using Supabase Auth in addition to Clerk and syncing identities (more complex).
- In all cases, tighten notification tables: replace `USING (true)` / `WITH CHECK (true)` with policies that restrict by `user_id` using whatever auth context you choose (e.g. JWT claim or header set by your backend).

### 2.2 API input validation

- **add-show:** Accepts `tmdbId` and `mediaType` from the request body. If `tmdbId` is not validated as a finite number (and `mediaType` as `'tv'` or `'movie'`), you could get bad data or odd behavior (e.g. NaN, huge IDs). Not necessarily a security bug by itself but good to harden.
- **shows-order:** Accepts `order: number[]` (tmdb_ids). The route updates only rows that match both `user_id` and the given `tmdb_id`, so you can’t change another user’s rows, but invalid types could cause no-ops or errors. Validating that `order` is an array of finite numbers is recommended.
- **notification-preferences PATCH:** Correctly requires `email_rolling_reminder_enabled` to be a boolean. Good.

**Recommendation**

- Validate and coerce inputs (e.g. `tmdbId` = number, `mediaType` in `['tv','movie']`, `order` = array of numbers). Reject or sanitize unexpected types and ranges.

### 2.3 Debug and internal routes

- **`/api/debug-paid`** returns the current user’s Clerk `userId` and a short message. It doesn’t expose secrets but does expose an internal identifier. In production, any debug or internal route increases attack surface and can leak information.

**Recommendation**

- Disable or remove debug routes (e.g. `debug-paid`) in production, or protect them (e.g. allowlist by IP or require an internal secret).

### 2.4 Rate limiting and abuse

- There is no rate limiting on API routes. A signed-in user (or an attacker who obtains valid sessions) could:
  - Hammer add-show, remove-show, or notification-preferences.
  - Trigger many test reminder emails via `/api/test-rolling-reminder`.

**Recommendation**

- Add rate limiting (e.g. per `userId` or per IP) on sensitive or expensive endpoints (auth, add/remove show, test email, notification prefs). Use Vercel’s features, a middleware, or an external service.

### 2.5 Dependencies

- Known vulnerabilities in dependencies can affect security. The repo uses npm; `npm audit` may report issues.

**Recommendation**

- Run `npm audit` (and `npm audit fix` where safe) regularly. Track and patch critical/high issues quickly.

### 2.6 Environment and deployment

- If `CRON_SECRET`, `STRIPE_WEBHOOK_SECRET`, or `SUPABASE_SERVICE_ROLE_KEY` are weak, guessed, or leaked (e.g. in logs, client bundles, or public repos), attackers could trigger cron, forge webhooks, or access the DB with elevated rights.

**Recommendation**

- Use strong, random secrets (e.g. `openssl rand -hex 32`). Never commit secrets; use env vars or a secrets manager. Restrict production env access. In Vercel, ensure cron is only invoked with the correct secret.

---

## 3. Quick checklist

| Area | Status | Action |
|------|--------|--------|
| Auth on API routes | Good | Keep using Clerk and scoping by `userId`. |
| Stripe webhook verification | Good | Keep signature check. |
| Cron secret | Good | Keep and don’t expose. |
| Client-side Supabase | Risk | Prefer server-only access for user data, or enforce RLS. |
| RLS on notification tables | Weak | Replace permissive policies with proper `user_id` (or equivalent) checks. |
| RLS on `user_shows` | Unknown | Confirm RLS is on and restricts by user; if not, add or stop client access. |
| Input validation (add-show, shows-order) | Partial | Add strict validation (types, ranges). |
| Debug routes | Risk | Remove or restrict in production. |
| Rate limiting | Missing | Add for sensitive/expensive endpoints. |
| Dependencies | Unknown | Run `npm audit` and fix critical/high. |
| Secrets management | Good | No secrets in client; rotate if ever exposed. |

---

## 4. Summary

- **Strong points:** Auth and authorization are centralized on Clerk; API routes consistently use `userId`; Stripe and cron are protected; no obvious XSS or open redirect from user input; secrets are server-side.
- **Main risk:** Supabase is used from the client with the anon key, and RLS is either missing or permissive on the tables in use. That can allow access to other users’ data or bypass of your “only my data” model if the client or anon key is misused. Mitigate by moving user data access to the server or by enforcing strict RLS.
- **Other improvements:** Stricter input validation, removing or protecting debug routes, adding rate limiting, and keeping dependencies updated will further reduce risk.

If you want, the next step can be a concrete change list (e.g. “remove client Supabase from dashboard and add GET /api/my-shows” or “example RLS policies for user_shows”) tailored to your repo.
