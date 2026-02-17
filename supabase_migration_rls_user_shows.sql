-- Enable RLS on user_shows so that access is restricted by policy.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).

-- 1. Enable RLS on the table
ALTER TABLE public.user_shows ENABLE ROW LEVEL SECURITY;

-- 2. (Option A) No policy for anon = anon can't read/write anything.
--    Service role (used in cron and, if you add it, in API routes) bypasses RLS.
--    So after this: direct client-side Supabase calls with the anon key will
--    return no rows / fail. You must then use the service role on the server
--    and stop using Supabase from the client for user_shows (use an API instead).

-- Optional: Explicit "deny anon" policy (same effect as no policy, but documents intent).
-- Uncomment if you want to be explicit:
-- DROP POLICY IF EXISTS "Anon cannot access user_shows" ON public.user_shows;
-- CREATE POLICY "Anon cannot access user_shows" ON public.user_shows
--   FOR ALL TO anon USING (false) WITH CHECK (false);

-- 3. Verify RLS is on
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'user_shows';
-- (relrowsecurity should be true)
