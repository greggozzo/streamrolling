// app/api/stripe/webhook/route.ts
import { headers } from 'next/headers';
import { clerkClient } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: Request) {
  // Must read at runtime: Next.js inlines process.env.VAR at build time, so use [] to avoid inlining (Vercel injects env when function runs)
  const getStripeWebhookSecret = () =>
    (process.env as Record<string, string | undefined>)['STRIPE_WEBHOOK_SECRET'] ??
    (process.env as Record<string, string | undefined>)['STRIPE_WEBHOOK_SIGNING_SECRET'];
  const raw = getStripeWebhookSecret();
  const webhookSecret = typeof raw === 'string' ? raw.trim() : '';
  if (!webhookSecret) {
    // Diagnose: which STRIPE_ vars exist (names only) so we can see if secret is missing or misnamed
    const stripeEnvKeys = Object.keys(process.env || {}).filter((k) => k.startsWith('STRIPE_'));
    const envStatus = raw === undefined ? 'undefined' : raw === '' ? 'empty string' : typeof raw;
    console.error(
      '[stripe webhook] STRIPE_WEBHOOK_SECRET not available. Value:', envStatus,
      '| STRIPE_* keys at runtime:', stripeEnvKeys.join(', ') || '(none)'
    );
    return Response.json(
      {
        error: 'Webhook secret not configured.',
        hint: 'In Vercel: set STRIPE_WEBHOOK_SECRET for Production, then use Deployments → Redeploy (do not use "Use existing build"). Check function logs for STRIPE_* keys.',
      },
      { status: 500 }
    );
  }

  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');
  if (!sig) {
    console.error('[stripe webhook] Missing stripe-signature header');
    return Response.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe webhook] Signature verification failed:', msg);
    return Response.json({ error: `Webhook signature verification failed: ${msg}` }, { status: 400 });
  }

  console.log('[stripe webhook] Event received:', event.type);

  // Handle successful subscription: set isPaid and store subscription ID for cancel-at-period-end
  if (event.type === 'checkout.session.completed') {
    let session = event.data.object as Stripe.Checkout.Session;
    let userId = (session.metadata?.userId ?? session.client_reference_id) as string | undefined;

    // If userId missing from payload, retrieve full session from Stripe (webhook payload can differ)
    if (!userId && session.id) {
      try {
        const full = await stripe.checkout.sessions.retrieve(session.id);
        session = full;
        userId = (full.metadata?.userId ?? full.client_reference_id) as string | undefined;
      } catch (retrieveErr) {
        console.error('[stripe webhook] Session retrieve failed:', retrieveErr);
      }
    }

    if (!userId) {
      console.error('[stripe webhook] checkout.session.completed: no userId. metadata=', session.metadata, 'client_reference_id=', session.client_reference_id);
      return Response.json({ error: 'Missing user reference' }, { status: 400 });
    }

    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : (session.subscription as Stripe.Subscription)?.id;

    try {
      const clerk = await clerkClient();
      const existing = await clerk.users.getUser(userId);
      const existingPublic = (existing.publicMetadata || {}) as Record<string, unknown>;
      const existingPrivate = (existing.privateMetadata || {}) as Record<string, unknown>;
      const newPrivate = {
        ...existingPrivate,
        isPaid: true,
        cancelAtPeriodEnd: false,
        ...(subscriptionId && { stripeSubscriptionId: subscriptionId }),
      };
      await clerk.users.updateUser(userId, {
        publicMetadata: { ...existingPublic, isPaid: true },
        privateMetadata: newPrivate,
      });
      console.log('[stripe webhook] Clerk updated: userId=', userId, 'subscriptionId=', subscriptionId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.error('[stripe webhook] Clerk update failed:', msg, stack);
      return Response.json({ error: 'Clerk update failed' }, { status: 500 });
    }
  }

  // When subscription actually ends (after period end or immediate cancel), clear isPaid in Clerk
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId as string | undefined;

    if (userId) {
      try {
        const clerk = await clerkClient();
        const existing = await clerk.users.getUser(userId);
        const existingPublic = (existing.publicMetadata || {}) as Record<string, unknown>;
        const existingPrivate = (existing.privateMetadata || {}) as Record<string, unknown>;
        await clerk.users.updateUser(userId, {
          publicMetadata: { ...existingPublic, isPaid: false },
          privateMetadata: {
            ...existingPrivate,
            isPaid: false,
            cancelAtPeriodEnd: false,
            stripeSubscriptionId: undefined,
          },
        });
        console.log(`[stripe webhook] User ${userId} subscription ended, isPaid set to false`);
      } catch (err) {
        console.error('[stripe webhook] Failed to clear Clerk metadata on subscription.deleted:', err);
        return Response.json({ error: 'Clerk update failed' }, { status: 500 });
      }
    }
  }

  return Response.json({ received: true });
}