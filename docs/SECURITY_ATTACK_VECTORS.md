# Security: Attack Vectors & Mitigations

This doc answers: **Can someone bypass Clerk sign-in or subscription? Can they get other users’ data from Clerk or Supabase? Can altering HTML in dev tools grant access?**

---

## 1. Bypassing Clerk sign-in

**Can someone use the app or APIs without signing in?**

- **No.** Protected pages and APIs rely on **server-side** auth:
  - **Dashboard:** `app/dashboard/page.tsx` calls `await auth()`. If there is no `userId`, it `redirect('/sign-in')`. The redirect happens on the server before any paid data is sent.
  - **API routes:** Every route that touches user data (add-show, remove-show, subscription-status, cancel-subscription, etc.) uses `await getAuth(request)` and returns `401 Unauthorized` if `!userId`. The `userId` comes from Clerk’s signed session (cookie/JWT), **not** from the request body or URL, so it cannot be forged by the client.
- **Middleware:** `middleware.ts` uses `clerkMiddleware()`, so Clerk runs on API and page requests. You cannot “skip” sign-in by changing URLs or headers from the browser.

**Conclusion:** There is no way to bypass Clerk sign-in to access protected features. Identity is always taken from the server-side Clerk session.

---

## 2. Bypassing membership / subscription

**Can someone get paid features without paying?**

- **No.** Paid state is enforced **on the server**:
  - **Dashboard:** `initialIsPaid` is computed on the server from **Clerk** (private/public metadata set by Stripe webhooks). The client never decides “I am paid.”
  - **Add show (free-tier limit):** `app/api/add-show/route.ts` checks `isPaid` via Clerk server-side; if not paid, it enforces the 5-show limit by querying Supabase for the **authenticated** user’s count.
  - **Subscription status:** `GET /api/subscription-status` reads paid state from Clerk on the server and returns `{ isPaid }`. The UI may hide paywalled actions, but the real enforcement is in API routes that check Clerk metadata.
- **Stripe:** Checkout is created with `userId` from `getAuth(request)`. Webhooks update Clerk metadata and are verified with `STRIPE_WEBHOOK_SECRET` (signature check). Nobody can “mark themselves paid” from the client.

**Conclusion:** Membership/subscription cannot be bypassed. Paid state is always read from Clerk (or Stripe) on the server.

---

## 3. Getting other users’ data from Clerk or Supabase

**Clerk:**

- User data (email, metadata) is only read **on the server** via `clerkClient().users.getUser(userId)`, and `userId` always comes from `getAuth(request)` (the current user). There is no API that accepts “another user’s ID” from the client and returns their Clerk profile. So one user cannot fetch another user’s Clerk info through your app.

**Supabase:**

- **If RLS is enabled and anon has no (or strict) policies:**  
  The anon key cannot read or write rows it’s not allowed to. So even if someone calls Supabase from the client, they cannot see or change other users’ data.
- **If RLS is not enabled (or anon has permissive policies):**  
  The **anon key is public** (in the client bundle). Someone could call Supabase directly (e.g. from the browser console or a script) and run `from('user_shows').select('*')` and potentially read or modify all rows. So the main risk is **Supabase access control**, not Clerk.

**Recommendation:** Follow `docs/SUPABASE_RLS_SETUP.md`: enable RLS on `user_shows` (and notification tables), use the **service role** only on the server for these tables, and avoid using the anon key from the client for user data (use API routes that use the service role and Clerk’s `userId` instead). That way, even if the anon key is known, it cannot be used to read or alter user data.

---

## 4. Altering HTML in developer tools

**Can someone change the page in dev tools to “get access”?**

- **No.** Changing the DOM (e.g. making a button visible, changing text, or editing form values) only affects what you see and what the **existing** client-side JavaScript does. It does **not**:
  - Change the **Clerk session** (identity and `userId` are from Clerk’s cookies/JWT).
  - Change what the **server** does. Every protected action goes through API routes or server components that call `getAuth(request)` or `auth()`. They ignore any HTML or client state; they only trust the signed Clerk session.
- So “unhiding” a “Subscribe” or “Cancel subscription” button might send a request, but the server will still only act for the **authenticated** user and will only cancel **that** user’s subscription (and only if they have one). You cannot, by editing HTML, log in as another user or mark yourself paid.

**Conclusion:** Dev tools / HTML changes cannot be used to bypass auth or subscription. They only affect client-side UI; the server always re-checks identity and permissions.

---

## 5. What was fixed in this codebase

- **Missing `await` on `getAuth(request)`:** Several API routes used `getAuth(request)` without `await`. In Node, `getAuth(request)` returns a Promise, so `userId` could be wrong and authenticated users could get 401. The following routes were updated to use `await getAuth(request)`:
  - `app/api/create-checkout-session/route.ts`
  - `app/api/toggle-watch-live/route.ts`
  - `app/api/toggle-favorite/route.ts`
  - `app/api/remove-show/route.ts`
  - `app/api/check-saved/route.ts`
  - `app/api/debug-paid/route.ts`

---

## 6. Summary table

| Attack / question | Possible? | Why |
|-------------------|-----------|-----|
| Use app without signing in | No | Server redirects and APIs use Clerk session; no `userId` → 401 or redirect. |
| Get paid features without paying | No | Paid state read from Clerk/Stripe on server; no client override. |
| Get another user’s Clerk data | No | No API accepts another user’s ID; server only uses `getAuth(request)`. |
| Get another user’s Supabase data | Only if RLS is off/weak | With RLS + service role on server, anon key cannot read others’ rows. |
| Alter HTML to gain access | No | Server ignores DOM; identity and permissions come from Clerk session. |

**Bottom line:** Auth and subscription are enforced on the server using Clerk (and Stripe). The only remaining risk is Supabase if RLS is not enabled and the anon key can be used from the client. Follow `SUPABASE_RLS_SETUP.md` to lock that down.
