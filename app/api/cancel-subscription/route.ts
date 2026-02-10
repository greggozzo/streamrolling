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
    let subscriptionId = privateMeta?.stripeSubscriptionId as string | undefined;

    // Fallback for users who subscribed before we stored stripeSubscriptionId: find via Stripe by email
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      const u = user as { emailAddresses?: { emailAddress: string }[]; primaryEmailAddress?: { emailAddress: string } };
      const email = u.primaryEmailAddress?.emailAddress ?? u.emailAddresses?.[0]?.emailAddress;
      if (!email) {
        return Response.json(
          { error: 'No active subscription found. Add your Stripe subscription ID in Clerk or contact support.' },
          { status: 400 }
        );
      }
      const customers = await stripe.customers.list({ email, limit: 1 });
      const customerId = customers.data[0]?.id;
      if (!customerId) {
        return Response.json(
          { error: 'No active subscription found' },
          { status: 400 }
        );
      }
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });
      const trialing = subs.data.length === 0
        ? await stripe.subscriptions.list({ customer: customerId, status: 'trialing', limit: 1 })
        : { data: [] as Stripe.Subscription[] };
      const sub = subs.data[0] ?? trialing.data[0];
      if (!sub) {
        return Response.json(
          { error: 'No active subscription found' },
          { status: 400 }
        );
      }
      subscriptionId = sub.id;
      // Save to Clerk so next time we don't need to look up
      await clerk.users.updateUser(userId, {
        privateMetadata: { ...privateMeta, stripeSubscriptionId: subscriptionId },
      });
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
