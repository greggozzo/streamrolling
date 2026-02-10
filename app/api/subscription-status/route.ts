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
    const user = await clerkClient.users.getUser(userId);
    const publicMeta = user.publicMetadata as Record<string, unknown> | undefined;
    const privateMeta = user.privateMetadata as Record<string, unknown> | undefined;
    const isPaid =
      publicMeta?.isPaid === true || privateMeta?.isPaid === true;

    return Response.json({ isPaid });
  } catch (e) {
    console.error('[subscription-status]', e);
    return Response.json({ isPaid: false }, { status: 200 });
  }
}
