-- Notification preferences and sent log for rolling plan email reminders.
-- Run in Supabase SQL editor.

-- Preferences: one row per user (Clerk user_id). Used by app and cron.
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id text PRIMARY KEY,
  email_rolling_reminder_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_notification_preferences IS 'Per-user email notification settings. user_id = Clerk user id.';

-- Log of sent notifications (for free-tier limit: 2 per 6 months).
CREATE TABLE IF NOT EXISTS public.notification_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL DEFAULT 'rolling_reminder'
);

CREATE INDEX IF NOT EXISTS idx_notification_sent_user_sent
  ON public.notification_sent (user_id, sent_at DESC);

COMMENT ON TABLE public.notification_sent IS 'Log of sent emails for rate limiting (e.g. free users: 2 per 6 months).';

-- RLS: allow service role full access; anon can only read/update own prefs by user_id (enforced in app via API).
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_sent ENABLE ROW LEVEL SECURITY;

-- Policy: allow all for authenticated requests (app uses anon key and filters by Clerk userId in API).
CREATE POLICY "Allow read/write user_notification_preferences"
  ON public.user_notification_preferences FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow read/insert notification_sent"
  ON public.notification_sent FOR ALL
  USING (true)
  WITH CHECK (true);
