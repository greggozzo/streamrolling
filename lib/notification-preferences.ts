/**
 * Get/upsert user notification preferences. Uses anon client; call from API with Clerk userId.
 */
import { getSupabaseForUserShows } from '@/lib/supabase-server';
import { supabase } from '@/lib/supabase';

export type RollingPlanType = 'all' | 'favorites' | 'watch_live';

export interface UserNotificationPreferences {
  user_id: string;
  email_rolling_reminder_enabled: boolean;
  rolling_plan_type: RollingPlanType;
  updated_at: string;
}

function getClient() {
  try {
    return getSupabaseForUserShows();
  } catch {
    return supabase;
  }
}

const TABLE = 'user_notification_preferences';

export async function getNotificationPreferences(
  userId: string
): Promise<UserNotificationPreferences | null> {
  const client = getClient();
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[notification-preferences] get', error);
    return null;
  }
  const row = data as Record<string, unknown> | null;
  if (!row) return null;
  return {
    user_id: row.user_id as string,
    email_rolling_reminder_enabled: !!row.email_rolling_reminder_enabled,
    rolling_plan_type: (row.rolling_plan_type as RollingPlanType) || 'all',
    updated_at: row.updated_at as string,
  };
}

/** Get or create default prefs (enabled, plan type all). Returns the row. */
export async function getOrCreatePreferences(
  userId: string
): Promise<UserNotificationPreferences> {
  const existing = await getNotificationPreferences(userId);
  if (existing) return existing;
  const client = getClient();
  const { data, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      email_rolling_reminder_enabled: true,
      rolling_plan_type: 'all',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error('[notification-preferences] insert', error);
    return { user_id: userId, email_rolling_reminder_enabled: true, rolling_plan_type: 'all', updated_at: new Date().toISOString() };
  }
  const row = data as Record<string, unknown>;
  return {
    user_id: row.user_id as string,
    email_rolling_reminder_enabled: !!row.email_rolling_reminder_enabled,
    rolling_plan_type: (row.rolling_plan_type as RollingPlanType) || 'all',
    updated_at: row.updated_at as string,
  };
}

export async function updateNotificationPreferences(
  userId: string,
  updates: { email_rolling_reminder_enabled?: boolean; rolling_plan_type?: RollingPlanType }
): Promise<boolean> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (typeof updates.email_rolling_reminder_enabled === 'boolean') {
    payload.email_rolling_reminder_enabled = updates.email_rolling_reminder_enabled;
  }
  if (updates.rolling_plan_type !== undefined) {
    if (!['all', 'favorites', 'watch_live'].includes(updates.rolling_plan_type)) return false;
    payload.rolling_plan_type = updates.rolling_plan_type;
  }
  const client = getClient();
  const { error } = await client.from(TABLE).upsert(payload, { onConflict: 'user_id' });
  if (error) {
    console.error('[notification-preferences] update', error);
    return false;
  }
  return true;
}
