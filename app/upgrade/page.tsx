'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useUser } from '@clerk/nextjs';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function UpgradePage() {
  const { user } = useUser();
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    console.log("Button clicked");
    console.log("Publishable key exists:", !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    console.log("User ID:", user?.id);

    setLoading(true);
    setStatus('Creating checkout session...');

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });

      const data = await res.json();
      console.log("API response:", data);

      if (!res.ok) throw new Error(data.error || 'API error');

      const stripe = await stripePromise;
      console.log("Stripe.js loaded:", !!stripe);

      if (!stripe) throw new Error('Stripe.js failed to initialize');

      setStatus('Redirecting to Stripe...');
      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });

      if (error) throw error;
    } catch (err: any) {
      console.error("Checkout error:", err);
      setStatus('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
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
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 text-black font-bold text-xl py-5 rounded-2xl transition-all"
        >
          {loading ? 'Processing...' : 'Subscribe Now – $2.99/mo'}
        </button>

        {status && <p className="mt-6 text-sm text-zinc-400">{status}</p>}

        <p className="text-xs text-zinc-500 mt-8">Test Mode • Secure checkout via Stripe</p>
      </div>
    </div>
  );
}