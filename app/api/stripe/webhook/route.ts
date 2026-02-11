// app/api/stripe/webhook/route.ts

export const runtime = 'nodejs'; // REQUIRED for Stripe (raw body + crypto)

import { headers } from 'next/headers';
import { clerkClient } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: Request) {
  // ✅ Runtime ONLY — no build injection
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[stripe webhook] STRIPE_WEBHOOK_SECRET missing at runtime');
    return Response.json(
      { error: 'Webhook secret not configured.' },
      { status: 500 }
    );
  }

  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');

  if (!sig) {
    return Response.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe webhook] Signature verification failed:', err);
    return Response.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  console.log('[stripe webhook] Event:', event.type);

  /* ================================
     checkout.session.completed
     ================================ */

  if (event.type === 'checkout.session.completed') {
    let session = event.data.object as Stripe.Checkout.Session;

    let userId =
      (session.metadata?.userId ??
        session.client_reference_id) as string | undefined;

    // sometimes webhook payload lacks metadata — fetch full session
    if (!userId && session.id) {
      const full = await stripe.checkout.sessions.retrieve(session.id);
      session = full;
      userId =
        (full.metadata?.userId ??
          full.client_reference_id) as string | undefined;
    }

    if (!userId) {
      console.error('[stripe webhook] No userId found');
      return Response.json({ error: 'Missing user reference' }, { status: 400 });
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as Stripe.Subscription)?.id;

    try {
      const clerk = await clerkClient();

      const existing = await clerk.users.getUser(userId);

      await clerk.users.updateUser(userId, {
        publicMetadata: {
          ...(existing.publicMetadata || {}),
          isPaid: true,
        },
        privateMetadata: {
          ...(existing.privateMetadata || {}),
          isPaid: true,
          cancelAtPeriodEnd: false,
          stripeSubscriptionId: subscriptionId,
        },
      });

      console.log('[stripe webhook] Clerk updated:', userId);
    } catch (err) {
      console.error('[stripe webhook] Clerk update failed:', err);
      return Response.json({ error: 'Clerk update failed' }, { status: 500 });
    }
  }

  /* ================================
     subscription ended
     ================================ */

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;

    if (userId) {
      try {
        const clerk = await clerkClient();

        const existing = await clerk.users.getUser(userId);

        await clerk.users.updateUser(userId, {
          publicMetadata: {
            ...(existing.publicMetadata || {}),
            isPaid: false,
          },
          privateMetadata: {
            ...(existing.privateMetadata || {}),
            isPaid: false,
            cancelAtPeriodEnd: false,
            stripeSubscriptionId: undefined,
          },
        });

        console.log('[stripe webhook] User downgraded:', userId);
      } catch (err) {
        console.error('[stripe webhook] Clerk update failed:', err);
        return Response.json({ error: 'Clerk update failed' }, { status: 500 });
      }
    }
  }

  return Response.json({ received: true });
}
