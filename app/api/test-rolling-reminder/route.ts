/**
 * Send one rolling reminder email to the current user (for testing).
 * Does not log to notification_sent, so it doesn't count toward the 2-per-6-months limit.
 * GET or POST while signed in.
 */
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { loadUserShows } from '@/lib/load-user-shows';
import { getNotificationPreferences } from '@/lib/notification-preferences';
import { buildRollingPlan, getNext12MonthKeys, formatMonth } from '@/lib/planner';
import { sendRollingReminder } from '@/lib/email';

export async function GET(request: Request) {
  return sendTestReminder(request);
}

export async function POST(request: Request) {
  return sendTestReminder(request);
}

async function sendTestReminder(request: Request) {
  const { userId } = await getAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to send a test email' }, { status: 401 });
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress;
  if (!email) {
    return NextResponse.json(
      { error: 'No email on your account. Add one in Clerk.' },
      { status: 400 }
    );
  }

  let shows = await loadUserShows(userId);
  const prefs = await getNotificationPreferences(userId);
  const planType = prefs?.rolling_plan_type ?? 'all';
  if (planType === 'favorites') shows = shows.filter((s: { favorite?: boolean }) => !!s.favorite);
  else if (planType === 'watch_live')
    shows = shows.filter(
      (s: { watchLive?: boolean; watch_live?: boolean; window?: { isComplete?: boolean } }) =>
        !!(s.watchLive ?? s.watch_live) && !s.window?.isComplete
    );

  const months = getNext12MonthKeys();
  const currentMonthKey = months[0];
  const nextMonthKey = months[1];
  const cancelByLabel = `end of ${formatMonth(currentMonthKey)}`;
  const subscribeMonthLabel = formatMonth(nextMonthKey);

  let cancelService: string | null = null;
  let subscribeService: string | null = null;
  if (shows.length > 0) {
    const { plan } = buildRollingPlan(shows);
    cancelService = plan[currentMonthKey]?.service ?? null;
    subscribeService = plan[nextMonthKey]?.service ?? null;
  }

  const ok = await sendRollingReminder(email, {
    cancelService,
    cancelBy: cancelByLabel,
    subscribeService,
    subscribeMonthLabel,
    subscribeMonthKey: nextMonthKey,
  });

  if (!ok) {
    return NextResponse.json(
      { error: 'Email failed to send. Check server logs and email env vars.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Test reminder sent to ${email}`,
  });
}
