# User analytics (backend-only)

This app can aggregate user data and track link clicks in **backend-only** tables. They are not exposed to the frontend or any public API.

---

## Tables

### 1. `user_aggregate`

One row per user, updated when they visit the dashboard or manage-subscriptions page.

| Column           | Description                                      |
|------------------|--------------------------------------------------|
| `clerk_user_id`  | Clerk user ID (unique)                           |
| `email`          | From Clerk                                       |
| `username`       | From Clerk                                       |
| `last_seen_ip`   | Client IP from request headers (`x-forwarded-for` / `x-real-ip`) |
| `favorites`      | JSON array of `{ tmdb_id, media_type, title? }` (shows they favorited) |
| `updated_at`     | Last upsert time                                |

**When it’s written:** On each load of `/dashboard` and `/manage-subscriptions` (server-side), if `SUPABASE_SERVICE_ROLE_KEY` is set.

### 2. `link_clicks`

One row per click on a cancel or subscribe link (before redirecting to the streaming service).

| Column           | Description                                      |
|------------------|--------------------------------------------------|
| `clerk_user_id`  | Signed-in user, or null if not authenticated    |
| `link_type`      | `cancel` or `subscribe`                         |
| `service_id`     | Provider id (e.g. `netflix`, `max`)             |
| `target_url`     | Final destination URL                           |
| `clicked_at`     | Timestamp                                       |
| `ip`             | Client IP                                       |
| `user_agent`     | Browser user agent                              |

**When it’s written:** When the user hits `/api/track-and-redirect?to=...&type=...&service=...` (all cancel/subscribe links in the app go through this endpoint, then redirect).

---

## Setup

1. **Run the migration**  
   In Supabase Dashboard → SQL Editor, run the contents of **`supabase_migration_analytics_tables.sql`**.  
   This creates `user_aggregate` and `link_clicks`, enables RLS, and leaves **no** policy for `anon`, so only the **service_role** (backend) can read or write.

2. **Ensure `SUPABASE_SERVICE_ROLE_KEY` is set**  
   Required for:
   - `upsertUserAggregate()` (dashboard / manage-subscriptions)
   - `/api/track-and-redirect` (link click logging)  
   If the key is missing, aggregate upserts are skipped and redirects still work but no click is stored.

3. **Do not expose these tables**  
   - No API route should return rows from `user_aggregate` or `link_clicks` to the client.  
   - Query them only from server code (cron, admin scripts, or internal tools) using the Supabase client that uses the service role key.

---

## Link tracking flow

Cancel and subscribe links no longer point directly at Netflix, Max, etc. They point to your app:

- **Manage subscriptions page:** “Go to X cancel page” and table “Cancel” / “Subscribe” links.
- **Cancel sidebar (dashboard):** Each provider’s cancel link.

All of these use **`/api/track-and-redirect?to=<encoded_url>&type=cancel|subscribe&service=<id>`**. The API:

1. Optionally records a row in `link_clicks` (if service role is available).
2. Responds with **302 redirect** to the target URL.

So the user still ends up on the streaming service; we only log the click first.

---

## Querying (backend only)

Example with service-role client (e.g. in a cron or script):

```ts
import { getSupabaseAdmin } from '@/lib/supabase-server';

const admin = getSupabaseAdmin();

// All users with their aggregate snapshot
const { data: users } = await admin.from('user_aggregate').select('*').order('updated_at', { ascending: false });

// All link clicks (e.g. last 7 days)
const { data: clicks } = await admin
  .from('link_clicks')
  .select('*')
  .gte('clicked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  .order('clicked_at', { ascending: false });
```

Keep this and any other analytics queries in server-only code; never expose them to the app or public API.
