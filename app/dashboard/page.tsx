import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

/** Resolve isPaid from Clerk on the server (same request as the page load, so auth is correct). */
export default async function DashboardPage() {
  const { userId } = await auth();

  let initialIsPaid = false;
  let initialCancelAtPeriodEnd = false;
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
    } catch (e) {
      console.error('[dashboard] isPaid check', e);
    }
  } else {
    redirect('/sign-in');
  }

  return (
    <DashboardClient
      initialIsPaid={initialIsPaid}
      initialCancelAtPeriodEnd={initialCancelAtPeriodEnd}
    />
  );
}
