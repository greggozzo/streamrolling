import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { RollingPlanType } from '@/lib/notification-preferences';
import {
  getOrCreatePreferences,
  updateNotificationPreferences,
} from '@/lib/notification-preferences';

const PLAN_TYPES: RollingPlanType[] = ['all', 'favorites', 'watch_live'];

/** GET: return current user's notification preferences. */
export async function GET(request: Request) {
  const { userId } = await getAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const prefs = await getOrCreatePreferences(userId);
  return NextResponse.json({
    email_rolling_reminder_enabled: prefs.email_rolling_reminder_enabled,
    rolling_plan_type: prefs.rolling_plan_type ?? 'all',
  });
}

/** PATCH: update notification preferences. Body: { email_rolling_reminder_enabled?: boolean, rolling_plan_type?: 'all'|'favorites'|'watch_live' }. At least one required. */
export async function PATCH(request: Request) {
  const { userId } = await getAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: { email_rolling_reminder_enabled?: boolean; rolling_plan_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const enabled =
    typeof body.email_rolling_reminder_enabled === 'boolean'
      ? body.email_rolling_reminder_enabled
      : undefined;
  const rolling_plan_type =
    body.rolling_plan_type && PLAN_TYPES.includes(body.rolling_plan_type as RollingPlanType)
      ? (body.rolling_plan_type as RollingPlanType)
      : undefined;
  if (enabled === undefined && rolling_plan_type === undefined) {
    return NextResponse.json(
      { error: 'Provide email_rolling_reminder_enabled (boolean) and/or rolling_plan_type (all|favorites|watch_live)' },
      { status: 400 }
    );
  }
  const current = await getOrCreatePreferences(userId);
  const ok = await updateNotificationPreferences(userId, {
    email_rolling_reminder_enabled: enabled ?? current.email_rolling_reminder_enabled,
    rolling_plan_type: rolling_plan_type ?? current.rolling_plan_type,
  });
  if (!ok) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  const prefs = await getOrCreatePreferences(userId);
  return NextResponse.json({
    email_rolling_reminder_enabled: prefs.email_rolling_reminder_enabled,
    rolling_plan_type: prefs.rolling_plan_type ?? 'all',
  });
}
