# Enabling RLS (Row Level Security) in Supabase

This app uses **Clerk** for auth, not Supabase Auth. Supabase therefore has no built-in “current user” (`auth.uid()` is empty for your anon key). So you have two ways to secure tables with RLS.

---

## 1. Check if RLS is already enabled

**In Supabase Dashboard:**

1. Go to **Authentication** → **Policies** (or **Table Editor** → select table → “RLS”).
2. Open the table (e.g. `user_shows`). If “RLS enabled” is on, RLS is active.

**Or run in SQL Editor:**

```sql
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND relkind = 'r'
  AND relname IN ('user_shows', 'user_notification_preferences', 'notification_sent');
```

`rls_enabled = true` means RLS is on for that table.

---

## 2. Enable RLS on `user_shows`

Run the migration in **Supabase Dashboard → SQL Editor**:

```sql
ALTER TABLE public.user_shows ENABLE ROW LEVEL SECURITY;
```

Or run the file: `supabase_migration_rls_user_shows.sql`.

**Effect:** With RLS on and **no** policy that allows the `anon` role, the anon key cannot read or write any row. So:

- Any **client-side** Supabase call (e.g. in `DashboardClient`) that uses the anon key will get no rows or errors.
- The **service role** key bypasses RLS, so server-side code that uses `SUPABASE_SERVICE_ROLE_KEY` can still read/write.

So after enabling RLS with no allow policy for anon, you **must**:

1. Use the **service role** for all server-side access to `user_shows` (e.g. in `load-user-shows.ts`, and in API routes that insert/update/delete `user_shows`).
2. **Stop** using Supabase from the browser for `user_shows`: replace the client-side load and “remove all” with API routes that use the service role and Clerk’s `userId`.

---

## 3. Option A: Lock anon out and use service role on the server (recommended)

1. **Enable RLS** on `user_shows` (and, if you want, on notification tables) as above. Do **not** create any policy that allows `anon` to select/insert/update/delete.
2. **Set** `SUPABASE_SERVICE_ROLE_KEY` in your env (Vercel, local `.env`). Get it from Supabase Dashboard → **Settings** → **API** → “service_role” (secret).
3. **Use the service role** wherever you touch `user_shows` or notification tables on the server:
   - In `lib/load-user-shows.ts`: use a Supabase client created with the service role (e.g. from `lib/supabase-server.ts`) instead of the anon client.
   - In API routes that call Supabase for `user_shows` or notification prefs: use that same server-side client (service role).
4. **Remove client-side Supabase** for user data:
   - In `DashboardClient`, replace the `useEffect` that loads from `supabase.from('user_shows')` with a `fetch('/api/my-shows')` (or similar) that returns the same shape. That API route should use `getAuth(request)` and then load shows server-side with the service-role client.
   - Replace “Remove all” so it calls something like `POST /api/my-shows/remove-all` instead of `supabase.from('user_shows').delete()` from the client.

Result: the browser never talks to Supabase for `user_shows`; only your server does, with the service role, and only for the authenticated Clerk user.

---

## 4. Option B: Let the client talk to Supabase with a custom JWT

If you want to keep querying Supabase directly from the client and still have RLS, Supabase must know “who” the user is. You do that by giving it a **custom JWT** that includes the Clerk user id.

1. **Get your Supabase JWT secret**  
   Dashboard → **Settings** → **API** → “JWT Secret” (or “JWT Settings”).

2. **Issue a JWT for the signed-in user**  
   In your app (e.g. an API route or middleware), when the user is signed in with Clerk, create a JWT signed with that secret and a payload that includes the Clerk `userId`, e.g. `sub: userId` (or a custom claim like `user_id`).

3. **Use that JWT as the Supabase session**  
   On the client, set the Supabase client’s session to that JWT (e.g. `setSession` or create the client with that token) so every request sends it.

4. **RLS policies**  
   Write policies that allow access only when the JWT’s user matches the row, e.g.:

   ```sql
   -- After enabling RLS on user_shows:
   CREATE POLICY "Users can manage own user_shows"
   ON public.user_shows
   FOR ALL
   USING ((auth.jwt() ->> 'sub') = user_id)
   WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
   ```

   (Use `auth.jwt() ->> 'sub'` if you put Clerk’s userId in `sub`; otherwise use your custom claim, e.g. `auth.jwt() ->> 'user_id'`.)

This way the client can keep using Supabase from the browser, and RLS enforces “only my rows.” The downside is you must implement and maintain JWT creation and session handling.

---

## 5. Notification tables

Your notification tables already have RLS enabled with permissive policies (`USING (true)`). To lock them down:

- **If you use Option A:** Use the service role for any server code that reads/writes these tables. Then drop the current policies and add no policy for `anon` (so anon cannot access), or add a policy that allows only the service role (if you need to document it).
- **If you use Option B:** Add policies that restrict by the same JWT claim (e.g. `(auth.jwt() ->> 'sub') = user_id` for `user_notification_preferences` and `notification_sent`).

---

## 6. Summary

| Step | Action |
|------|--------|
| 1 | Run `ALTER TABLE public.user_shows ENABLE ROW LEVEL SECURITY` in SQL Editor. |
| 2 | Decide: **Option A** (lock anon out, use service role + APIs only) or **Option B** (custom JWT + RLS policies). |
| 3 | If Option A: set `SUPABASE_SERVICE_ROLE_KEY`, use it in server/API for `user_shows` (and notifications), and replace client-side Supabase for user data with API calls. |
| 4 | If Option B: implement custom JWT with Clerk userId, set it on the Supabase client, and add RLS policies using `auth.jwt() ->> 'sub'` (or your claim). |
| 5 | Harden notification tables the same way (no anon policy or JWT-based policy). |

After this, Supabase will enforce access at the database layer: either anon cannot touch the data (Option A) or RLS restricts rows to the current user (Option B).
