// app/upgrade/page.tsx
'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

export default function UpgradePage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to create session');

      // Modern way: manually redirect (more reliable now)
      window.location.href = data.url;

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong');
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

        {error && <p className="text-red-400 mb-6">{error}</p>}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 text-black font-bold text-xl py-5 rounded-2xl transition-all"
        >
          {loading ? 'Redirecting...' : 'Subscribe Now – $2.99/mo'}
        </button>

        <p className="text-xs text-zinc-500 mt-6">Test Mode • Secure checkout via Stripe</p>
      </div>
    </div>
  );
}