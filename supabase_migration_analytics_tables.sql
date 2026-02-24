-- Backend-only analytics tables: user aggregate (Clerk + favorites + IP) and link clicks.
-- Run in Supabase Dashboard → SQL Editor.
-- RLS is enabled with NO policy for anon, so only service_role (backend) can read/write.
-- Do not expose these tables via any app API.

-- 1. User aggregate: one row per user, synced from Clerk + user_shows favorites.
CREATE TABLE IF NOT EXISTS public.user_aggregate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL UNIQUE,
  email text,
  username text,
  last_seen_ip text,
  favorites jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_aggregate IS 'Backend-only: Clerk identity + favorites snapshot. Do not expose to app.';

ALTER TABLE public.user_aggregate ENABLE ROW LEVEL SECURITY;

-- No policy for anon → anon cannot read or write. service_role bypasses RLS.

-- 2. Link clicks: when user clicks a cancel or subscribe link (track-and-redirect).
CREATE TABLE IF NOT EXISTS public.link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text,
  link_type text NOT NULL,
  service_id text,
  target_url text,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text
);

COMMENT ON TABLE public.link_clicks IS 'Backend-only: track cancel/subscribe link clicks. Do not expose to app.';

ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

-- Optional: indexes for querying by user or time
CREATE INDEX IF NOT EXISTS idx_user_aggregate_clerk_user_id ON public.user_aggregate (clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clerk_user_id ON public.link_clicks (clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON public.link_clicks (clicked_at DESC);
