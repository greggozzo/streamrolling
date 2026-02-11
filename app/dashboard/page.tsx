import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { loadUserShows } from '@/lib/load-user-shows';
import DashboardClient from './DashboardClient';

/** Load isPaid and shows on the server so the calendar renders with services on first paint (fixes Firefox/mobile). */
export default async function DashboardPage() {
  const { userId } = await auth();

  let initialIsPaid = false;
  let initialCancelAtPeriodEnd = false;
  let initialShows: any[] = [];

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
    />
  );
}
