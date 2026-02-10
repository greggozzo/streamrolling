// app/api/subscription-status/route.ts
import { getAuth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

/** Returns whether the current user has an active subscription. Read from Clerk server-side (public or private metadata). */
export async function GET(request: Request) {
  const { userId } = await getAuth(request);
  if (!userId) {
    return Response.json({ isPaid: false }, { status: 200 });
  }

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const publicMeta = user.publicMetadata as Record<string, unknown> | undefined;
    const privateMeta = user.privateMetadata as Record<string, unknown> | undefined;

    // Clerk can store metadata as boolean true or string "true" (e.g. from dashboard JSON)
    const truthy = (v: unknown) => v === true || v === 'true';
    const isPaid =
      truthy(publicMeta?.isPaid) ||
      truthy(publicMeta?.is_paid) ||
      truthy(privateMeta?.isPaid) ||
      truthy(privateMeta?.is_paid);

    return Response.json(
      { isPaid },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    );
  } catch (e) {
    console.error('[subscription-status]', e);
    return Response.json({ isPaid: false }, { status: 200 });
  }
}
