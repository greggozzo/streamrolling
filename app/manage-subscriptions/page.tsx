import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { loadUserShows } from '@/lib/load-user-shows';
import { buildRollingPlan, getNext12MonthKeys, formatMonth } from '@/lib/planner';
import {
  STREAMING_PROVIDERS,
  getProviderForServiceName,
  type StreamingProvider,
} from '@/lib/streaming-providers';

/** Order providers by rolling plan: services in month order (first appearance) first, then the rest in STREAMING_PROVIDERS order. */
function providersInPlanOrder(
  plan: Record<string, { service: string | null }>,
  monthKeys: string[]
): StreamingProvider[] {
  const seenIds = new Set<string>();
  const ordered: StreamingProvider[] = [];
  for (const key of monthKeys) {
    const service = plan[key]?.service ?? null;
    if (!service) continue;
    const provider = getProviderForServiceName(service);
    if (provider && !seenIds.has(provider.id)) {
      seenIds.add(provider.id);
      ordered.push(provider);
    }
  }
  for (const p of STREAMING_PROVIDERS) {
    if (!seenIds.has(p.id)) ordered.push(p);
  }
  return ordered;
}

/** Manage subscriptions: cancel links (and later affiliate subscribe links). All external links live here so emails only link to our domain. */
export default async function ManageSubscriptionsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const shows = await loadUserShows(userId);
  const months = getNext12MonthKeys();
  const currentMonthKey = months[0];
  const nextMonthKey = months[1];
  let cancelService: string | null = null;
  let cancelUrl: string | null = null;
  let subscribeService: string | null = null;
  let orderedProviders = STREAMING_PROVIDERS;
  if (shows.length > 0) {
    const { plan } = buildRollingPlan(shows);
    cancelService = plan[currentMonthKey]?.service ?? null;
    subscribeService = plan[nextMonthKey]?.service ?? null;
    if (cancelService) {
      const provider = getProviderForServiceName(cancelService);
      if (provider?.cancelUrl) cancelUrl = provider.cancelUrl;
    }
    orderedProviders = providersInPlanOrder(plan, months);
  }

  const cancelByLabel = `end of ${formatMonth(currentMonthKey)}`;
  const subscribeMonthLabel = formatMonth(nextMonthKey);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <Link
        href="/dashboard"
        className="text-zinc-500 hover:text-white text-sm mb-6 inline-block"
      >
        ← Back to My Shows
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Manage subscriptions</h1>
      <p className="text-zinc-500 mb-8">
        Cancel and subscribe links for streaming services. Use this page when you switch services each month.
      </p>

      {shows.length > 0 && (cancelService || subscribeService) && (
        <div className="bg-zinc-900 rounded-2xl p-6 sm:p-8 border border-zinc-800 mb-8">
          <h2 className="text-lg font-semibold mb-4">Your plan this month</h2>
          <div className="space-y-3">
            {cancelService && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-zinc-400">Cancel:</span>
                <span className="font-medium">{cancelService}</span>
                <span className="text-zinc-500 text-sm">by {cancelByLabel}</span>
                {cancelUrl ? (
                  <a
                    href={cancelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-sm font-medium underline"
                  >
                    Go to cancel page →
                  </a>
                ) : (
                  <span className="text-zinc-500 text-sm">(see table below for link)</span>
                )}
              </div>
            )}
            {subscribeService && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-zinc-400">Subscribe for {subscribeMonthLabel}:</span>
                <span className="font-medium">{subscribeService}</span>
                <span className="text-zinc-500 text-sm">(see Subscribe column below when available)</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="py-4 px-4 sm:px-6 font-semibold text-zinc-300">Service</th>
                <th className="py-4 px-4 sm:px-6 font-semibold text-zinc-300">Cancel</th>
                <th className="py-4 px-4 sm:px-6 font-semibold text-zinc-300">Subscribe</th>
              </tr>
            </thead>
            <tbody>
              {orderedProviders.map((p) => (
                <tr key={p.id} className="border-b border-zinc-800/80 last:border-0">
                  <td className="py-4 px-4 sm:px-6 font-medium">{p.name}</td>
                  <td className="py-4 px-4 sm:px-6">
                    <a
                      href={p.cancelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 underline"
                    >
                      Cancel
                    </a>
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    {p.subscribeUrl ? (
                      <a
                        href={p.subscribeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 underline"
                      >
                        Subscribe
                      </a>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-zinc-500 text-sm mt-4">
        Cancel links go to each service’s account or subscription page. Add your plan in My Shows to see which service to cancel this month.
      </p>
    </div>
  );
}
