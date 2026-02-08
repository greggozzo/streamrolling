// app/api/create-checkout-session/route.ts
import { getAuth } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(request: Request) {
  const { userId } = getAuth(request);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_CLERK_BASE_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_CLERK_BASE_URL}/upgrade?cancelled=true`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
      },
    });

    return Response.json({ sessionId: session.id });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}