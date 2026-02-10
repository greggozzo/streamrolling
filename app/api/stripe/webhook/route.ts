// app/api/stripe/webhook/route.ts
import { headers } from 'next/headers';
import { clerkClient } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get('stripe-signature')!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return Response.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  // Handle successful subscription: set isPaid and store subscription ID for cancel-at-period-end
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId as string | undefined;
    const subscriptionId = session.subscription as string | undefined;

    if (userId) {
      const clerk = await clerkClient();
      const existing = await clerk.users.getUser(userId);
      const existingPublic = (existing.publicMetadata || {}) as Record<string, unknown>;
      const existingPrivate = (existing.privateMetadata || {}) as Record<string, unknown>;
      await clerk.users.updateUser(userId, {
        publicMetadata: { ...existingPublic, isPaid: true },
        privateMetadata: {
          ...existingPrivate,
          isPaid: true,
          ...(subscriptionId && { stripeSubscriptionId: subscriptionId }),
        },
      });
      console.log(`User ${userId} upgraded to paid, subscription ${subscriptionId}`);
    }
  }

  // When subscription actually ends (after period end or immediate cancel), clear isPaid in Clerk
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId as string | undefined;

    if (userId) {
      const clerk = await clerkClient();
      const existing = await clerk.users.getUser(userId);
      const existingPublic = (existing.publicMetadata || {}) as Record<string, unknown>;
      const existingPrivate = (existing.privateMetadata || {}) as Record<string, unknown>;
      await clerk.users.updateUser(userId, {
        publicMetadata: { ...existingPublic, isPaid: false },
        privateMetadata: { ...existingPrivate, isPaid: false, stripeSubscriptionId: undefined },
      });
      console.log(`User ${userId} subscription ended, isPaid set to false`);
    }
  }

  return Response.json({ received: true });
}