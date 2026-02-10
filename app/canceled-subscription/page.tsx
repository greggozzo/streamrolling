'use client';

import Link from 'next/link';

export default function CanceledSubscriptionPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white py-20">
      <div className="max-w-lg mx-auto px-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Subscription cancellation scheduled</h1>
        <p className="text-xl text-zinc-300 mb-8">
          Your subscription will cancel at the end of your current billing period. You’ll keep full access until then.
        </p>

        <div className="bg-zinc-900 rounded-3xl p-10 mb-10 text-left">
          <p className="text-zinc-300 mb-6">
            No further charges will be made. If you change your mind before the period ends, you can resubscribe from your dashboard.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-block bg-emerald-500 text-black px-8 py-3 rounded-2xl font-bold hover:bg-emerald-400 transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
