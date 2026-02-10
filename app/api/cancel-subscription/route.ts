// app/api/cancel-subscription/route.ts
import { getAuth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

/** Set the current user's Stripe subscription to cancel at period end. */
export async function POST(request: Request) {
  const { userId } = await getAuth(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const privateMeta = user.privateMetadata as Record<string, unknown> | undefined;
    const subscriptionId = privateMeta?.stripeSubscriptionId as string | undefined;

    if (!subscriptionId || typeof subscriptionId !== 'string') {
      return Response.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return Response.json({
      success: true,
      message: 'Subscription will cancel at the end of the billing period.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
    console.error('[cancel-subscription]', err);
    return Response.json({ error: message }, { status: 500 });
  }
}
