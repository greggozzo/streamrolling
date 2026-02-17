/**
 * Get/upsert user notification preferences. Uses anon client; call from API with Clerk userId.
 */
import { supabase } from '@/lib/supabase';

export interface UserNotificationPreferences {
  user_id: string;
  email_rolling_reminder_enabled: boolean;
  updated_at: string;
}

const TABLE = 'user_notification_preferences';

export async function getNotificationPreferences(
  userId: string
): Promise<UserNotificationPreferences | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[notification-preferences] get', error);
    return null;
  }
  return data as UserNotificationPreferences | null;
}

/** Get or create default prefs (enabled). Returns the row. */
export async function getOrCreatePreferences(
  userId: string
): Promise<UserNotificationPreferences> {
  const existing = await getNotificationPreferences(userId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      email_rolling_reminder_enabled: true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error('[notification-preferences] insert', error);
    return { user_id: userId, email_rolling_reminder_enabled: true, updated_at: new Date().toISOString() };
  }
  return data as UserNotificationPreferences;
}

export async function updateNotificationPreferences(
  userId: string,
  email_rolling_reminder_enabled: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      {
        user_id: userId,
        email_rolling_reminder_enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  if (error) {
    console.error('[notification-preferences] update', error);
    return false;
  }
  return true;
}
