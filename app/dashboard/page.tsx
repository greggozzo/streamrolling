import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { loadUserShows } from '@/lib/load-user-shows';
import { buildRollingPlan } from '@/lib/planner';
import { upsertUserAggregate } from '@/lib/user-aggregate';
import DashboardClient from './DashboardClient';
import type { InitialPlanPayload } from '@/components/RollingCalendar';

/** Load isPaid, shows, and pre-computed plan on the server so the calendar displays in all browsers (Firefox/mobile). */
export default async function DashboardPage() {
  const { userId } = await auth();

  let initialIsPaid = false;
  let initialCancelAtPeriodEnd = false;
  let initialShows: any[] = [];
  let initialPlan: InitialPlanPayload | null = null;
  let initialPlanFavorites: InitialPlanPayload | null = null;
  let initialPlanWatchLive: InitialPlanPayload | null = null;

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
        const toPayload = (shows: any[]) => {
          const { months, plan } = buildRollingPlan(shows);
          return {
            months,
            plan: Object.fromEntries(
              Object.entries(plan).map(([k, v]) => [
                k,
                { service: v.service, alsoWatchLive: v.alsoWatchLive },
              ])
            ),
          };
        };
        initialPlan = toPayload(initialShows);
      }
      const initialPlanFavorites =
        initialShows.filter((s) => s.favorite).length > 0
          ? (() => {
              const { months, plan } = buildRollingPlan(initialShows.filter((s) => s.favorite));
              return {
                months,
                plan: Object.fromEntries(
                  Object.entries(plan).map(([k, v]) => [
                    k,
                    { service: v.service, alsoWatchLive: v.alsoWatchLive },
                  ])
                ),
              };
            })()
          : null;
      const watchLiveShows = initialShows.filter((s) => s.watchLive ?? s.watch_live);
      const initialPlanWatchLive =
        watchLiveShows.length > 0
          ? (() => {
              const { months, plan } = buildRollingPlan(watchLiveShows);
              return {
                months,
                plan: Object.fromEntries(
                  Object.entries(plan).map(([k, v]) => [
                    k,
                    { service: v.service, alsoWatchLive: v.alsoWatchLive },
                  ])
                ),
              };
            })()
          : null;

      await upsertUserAggregate(userId, {
        headers: await headers(),
        favorites: initialShows.filter((s) => s.favorite).map((s) => ({
          tmdb_id: s.tmdb_id,
          media_type: s.media_type ?? 'tv',
          title: s.title,
        })),
      });
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
      initialPlanFavorites={initialPlanFavorites}
      initialPlanWatchLive={initialPlanWatchLive}
    />
  );
}
