import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { loadUserShows } from '@/lib/load-user-shows';
import { buildRollingPlan } from '@/lib/planner';
import DashboardClient from './DashboardClient';
import type { InitialPlanPayload } from '@/components/RollingCalendar';

/** Load isPaid, shows, and pre-computed plan on the server so the calendar displays in all browsers (Firefox/mobile). */
export default async function DashboardPage() {
  const { userId } = await auth();

  let initialIsPaid = false;
  let initialCancelAtPeriodEnd = false;
  let initialShows: any[] = [];
  let initialPlan: InitialPlanPayload | null = null;

  if (userId) {
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      const privateMeta = user.privateMetadata as Record<string, unknown> | undefined;
      const publicMeta = user.publicMetadata as Record<string, unknown> | undefined;
      const truthy = (v: unknown) => v === true || v === 'true';
      initialIsPaid =
        truthy(privateMeta?.isPaid) ||
        truthy(privateMeta?.is_paid) ||
        truthy(publicMeta?.isPaid) ||
        truthy(publicMeta?.is_paid);
      initialCancelAtPeriodEnd =
        truthy(privateMeta?.cancelAtPeriodEnd) || truthy(publicMeta?.cancelAtPeriodEnd);

      initialShows = await loadUserShows(userId);
      if (initialShows.length > 0) {
        const { months, plan } = buildRollingPlan(initialShows);
        initialPlan = {
          months,
          plan: Object.fromEntries(
            Object.entries(plan).map(([k, v]) => [
              k,
              { service: v.service, alsoWatchLive: v.alsoWatchLive },
            ])
          ),
        };
      }
    } catch (e) {
      console.error('[dashboard] server load', e);
    }
  } else {
    redirect('/sign-in');
  }

  return (
    <DashboardClient
      initialIsPaid={initialIsPaid}
      initialCancelAtPeriodEnd={initialCancelAtPeriodEnd}
      initialShows={initialShows}
      initialPlan={initialPlan}
    />
  );
}
