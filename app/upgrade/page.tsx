// app/upgrade/page.tsx
'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useUser } from '@clerk/nextjs';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function UpgradePage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id }),
    });

    const { sessionId } = await res.json();

    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({ sessionId });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-20">
      <div className="max-w-lg mx-auto px-6 text-center">
        <h1 className="text-5xl font-bold mb-4">Upgrade to Unlimited</h1>
        <p className="text-2xl text-emerald-400 mb-8">$2.99 / month</p>

        <div className="bg-zinc-900 rounded-3xl p-10 mb-10">
          <ul className="text-left space-y-4 text-lg">
            <li>✅ Unlimited shows</li>
            <li>✅ Monthly email reminders</li>
            <li>✅ Priority in rolling plan</li>
            <li>✅ Cancel anytime</li>
          </ul>
        </div>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xl py-5 rounded-2xl transition-all disabled:opacity-50"
        >
          {loading ? 'Redirecting to Stripe...' : 'Subscribe Now – $2.99/mo'}
        </button>

        <p className="text-xs text-zinc-500 mt-6">Cancel anytime. Secure payment via Stripe.</p>
      </div>
    </div>
  );
}