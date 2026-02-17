/**
 * Cron: send rolling plan reminder emails (~2 days before end of month, or bi-monthly).
 * Secured with CRON_SECRET. Uses SUPABASE_SERVICE_ROLE_KEY to list users with shows + prefs.
 * Free users: max 2 notifications per 6 months. Paid: every month they have a plan.
 */
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { loadUserShows } from '@/lib/load-user-shows';
import { buildRollingPlan, getNext12MonthKeys, formatMonth } from '@/lib/planner';
import { getProviderForServiceName } from '@/lib/streaming-providers';
import { sendRollingReminder } from '@/lib/email';
import {
  countRollingRemindersLast6Months,
  recordRollingReminderSent,
} from '@/lib/notification-sent';

const truthy = (v: unknown) => v === true || v === 'true';

function isPaidFromMetadata(meta: Record<string, unknown> | undefined): boolean {
  if (!meta) return false;
  return truthy(meta.isPaid) || truthy(meta.is_paid);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    console.error('[cron rolling-reminder] Supabase admin init failed:', e);
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not set' },
      { status: 500 }
    );
  }

  // Users who have at least one show
  const { data: showRows } = await admin
    .from('user_shows')
    .select('user_id');
  const userIdsWithShows = [...new Set((showRows || []).map((r: { user_id: string }) => r.user_id))];

  // Users who have reminders enabled
  const { data: prefsRows } = await admin
    .from('user_notification_preferences')
    .select('user_id')
    .eq('email_rolling_reminder_enabled', true);
  const enabledUserIds = new Set((prefsRows || []).map((r: { user_id: string }) => r.user_id));

  const candidateUserIds = userIdsWithShows.filter((id) => enabledUserIds.has(id));
  if (candidateUserIds.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No users to notify' });
  }

  const months = getNext12MonthKeys();
  const currentMonthKey = months[0];
  const nextMonthKey = months[1];
  const cancelByLabel = `end of ${formatMonth(currentMonthKey)}`;
  const subscribeMonthLabel = formatMonth(nextMonthKey);

  let sent = 0;
  const clerk = await clerkClient();

  for (const userId of candidateUserIds) {
    try {
      const user = await clerk.users.getUser(userId);
      const email = user.primaryEmailAddress?.emailAddress;
      if (!email) continue;

      const publicMeta = user.publicMetadata as Record<string, unknown> | undefined;
      const privateMeta = user.privateMetadata as Record<string, unknown> | undefined;
      const isPaid = isPaidFromMetadata(publicMeta) || isPaidFromMetadata(privateMeta);

      if (!isPaid) {
        const count = await countRollingRemindersLast6Months(admin, userId);
        if (count >= 2) continue;
      }

      const shows = await loadUserShows(userId);
      if (shows.length === 0) continue;
      const { plan } = buildRollingPlan(shows);
      const currentPlan = plan[currentMonthKey];
      const nextPlan = plan[nextMonthKey];
      const cancelService = currentPlan?.service ?? null;
      const subscribeService = nextPlan?.service ?? null;
      const cancelProvider = cancelService ? getProviderForServiceName(cancelService) : null;
      const cancelUrl = cancelProvider?.cancelUrl ?? null;

      const ok = await sendRollingReminder(email, {
        cancelService,
        cancelUrl,
        cancelBy: cancelByLabel,
        subscribeService,
        subscribeMonthLabel,
        subscribeMonthKey: nextMonthKey,
      });
      if (ok) {
        await recordRollingReminderSent(admin, userId);
        sent++;
      }
    } catch (e) {
      console.error('[cron rolling-reminder] user', userId, e);
    }
  }

  return NextResponse.json({ sent, total: candidateUserIds.length });
}
