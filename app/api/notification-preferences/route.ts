import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  getOrCreatePreferences,
  updateNotificationPreferences,
} from '@/lib/notification-preferences';

/** GET: return current user's notification preferences. */
export async function GET(request: Request) {
  const { userId } = await getAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const prefs = await getOrCreatePreferences(userId);
  return NextResponse.json({
    email_rolling_reminder_enabled: prefs.email_rolling_reminder_enabled,
  });
}

/** PATCH: update notification preferences. Body: { email_rolling_reminder_enabled?: boolean } */
export async function PATCH(request: Request) {
  const { userId } = await getAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: { email_rolling_reminder_enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const enabled =
    typeof body.email_rolling_reminder_enabled === 'boolean'
      ? body.email_rolling_reminder_enabled
      : undefined;
  if (enabled === undefined) {
    return NextResponse.json(
      { error: 'email_rolling_reminder_enabled (boolean) required' },
      { status: 400 }
    );
  }
  const ok = await updateNotificationPreferences(userId, enabled);
  if (!ok) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  return NextResponse.json({ email_rolling_reminder_enabled: enabled });
}
