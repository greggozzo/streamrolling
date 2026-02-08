// app/api/create-checkout-session/route.ts
import { getAuth } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(request: Request) {
  console.log("=== Checkout API Called ===");
  console.log("STRIPE_SECRET_KEY exists:", !!process.env.STRIPE_SECRET_KEY);
  console.log("STRIPE_PRICE_ID:", process.env.STRIPE_PRICE_ID || "MISSING");

  const { userId } = getAuth(request);
  if (!userId) {
    console.log("ERROR: No userId from Clerk");
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
      metadata: { userId },
    });

    console.log("SUCCESS: Session created →", session.id);
    return Response.json({ sessionId: session.id });
  } catch (error: any) {
    console.error("STRIPE ERROR:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}