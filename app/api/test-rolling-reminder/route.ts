/**
 * Send one rolling reminder email to the current user (for testing).
 * Does not log to notification_sent, so it doesn't count toward the 2-per-6-months limit.
 * GET or POST while signed in.
 */
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { loadUserShows } from '@/lib/load-user-shows';
import { buildRollingPlan, getNext12MonthKeys, formatMonth } from '@/lib/planner';
import { sendRollingReminder } from '@/lib/email';

export async function GET() {
  return sendTestReminder();
}

export async function POST() {
  return sendTestReminder();
}

async function sendTestReminder() {
  const { userId } = await getAuth();
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

  const shows = await loadUserShows(userId);
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
