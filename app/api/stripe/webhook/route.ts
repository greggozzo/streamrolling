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

  // Handle successful subscription — use publicMetadata so the frontend can read it (privateMetadata is server-only)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (userId) {
      const existing = await clerkClient.users.getUser(userId);
      const existingPublic = (existing.publicMetadata || {}) as Record<string, unknown>;
      await clerkClient.users.updateUser(userId, {
        publicMetadata: { ...existingPublic, isPaid: true },
      });
      console.log(`User ${userId} upgraded to paid`);
    }
  }

  return Response.json({ received: true });
}