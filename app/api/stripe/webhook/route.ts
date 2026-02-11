// app/api/stripe/webhook/route.ts

// Stripe requires Node runtime (raw body + crypto)
// Edge WILL break signature verification
export const runtime = 'nodejs';

import { headers } from 'next/headers';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[stripe webhook] STRIPE_WEBHOOK_SECRET missing');
    return Response.json(
      { error: 'Webhook secret not configured.' },
      { status: 500 }
    );
  }

  /* ================================
     Verify Stripe signature
     ================================ */
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe webhook] Invalid signature:', err);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[stripe webhook] Event received:', event.type);

  /* =====================================================
     checkout.session.completed → mark user as paid in Clerk
     ===================================================== */
  if (event.type === 'checkout.session.completed') {
    let session = event.data.object as Stripe.Checkout.Session;

    let userId =
      (session.metadata?.userId ??
        session.client_reference_id) as string | undefined;

    // Sometimes metadata isn't included — fetch full session
    if (!userId && session.id) {
      const full = await stripe.checkout.sessions.retrieve(session.id);
      session = full;
      userId =
        (full.metadata?.userId ??
          full.client_reference_id) as string | undefined;
    }

    if (!userId) {
      console.error('[stripe webhook] Missing userId');
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
          ...(subscriptionId && { stripeSubscriptionId: subscriptionId }),
        },
      });

      console.log('[stripe webhook] User upgraded:', userId);
    } catch (err) {
      console.error('[stripe webhook] Clerk update failed:', err);
      return Response.json({ error: 'Clerk update failed' }, { status: 500 });
    }
  }

  /* =====================================================
     customer.subscription.deleted → set isPaid = false in Clerk
     Fired when a subscription ends: immediate cancel OR at end of
     billing period after "cancel at period end". Ensure this event
     is enabled in Stripe Dashboard → Webhooks → your endpoint.
     ===================================================== */
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId as string | undefined;

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

        console.log('[stripe webhook] User downgraded (subscription ended):', userId);
      } catch (err) {
        console.error('[stripe webhook] Clerk update failed:', err);
        return Response.json({ error: 'Clerk update failed' }, { status: 500 });
      }
    } else {
      console.warn('[stripe webhook] customer.subscription.deleted: no userId in subscription.metadata (subscription may predate metadata)');
    }
  }

  return Response.json({ received: true });
}
