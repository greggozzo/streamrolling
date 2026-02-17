/**
 * Log and rate-limit sent notifications (e.g. free users: max 2 per 6 months).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const TABLE = 'notification_sent';
const KIND_ROLLING = 'rolling_reminder';

/** Count rolling reminders sent to this user in the last 6 months. */
export async function countRollingRemindersLast6Months(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  const sinceIso = since.toISOString();
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', KIND_ROLLING)
    .gte('sent_at', sinceIso);
  if (error) {
    console.error('[notification-sent] count', error);
    return 999;
  }
  return count ?? 0;
}

/** Record that we sent a rolling reminder to this user. */
export async function recordRollingReminderSent(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase.from(TABLE).insert({
    user_id: userId,
    kind: KIND_ROLLING,
  });
}
