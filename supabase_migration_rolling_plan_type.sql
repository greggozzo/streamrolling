-- Add which rolling plan to use for reminder emails. One option only (no multiple plans).
-- Run in Supabase SQL Editor.

ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS rolling_plan_type text NOT NULL DEFAULT 'all';

COMMENT ON COLUMN public.user_notification_preferences.rolling_plan_type IS 'Which plan to send in reminder emails: all | favorites | watch_live. Only one.';

-- Optional: constrain to allowed values
ALTER TABLE public.user_notification_preferences
  DROP CONSTRAINT IF EXISTS chk_rolling_plan_type;

ALTER TABLE public.user_notification_preferences
  ADD CONSTRAINT chk_rolling_plan_type
  CHECK (rolling_plan_type IN ('all', 'favorites', 'watch_live'));
