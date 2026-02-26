'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { buildRollingPlan } from '@/lib/planner';

type PlanPreview = { months: { key: string; label: string }[]; plan: Record<string, { service: string | null }> } | null;

function MinimalPlanPreview({ plan, maxMonths = 6 }: { plan: PlanPreview; maxMonths?: number }) {
  if (!plan?.months?.length) return <span className="text-zinc-500 text-xs">No shows in this plan</span>;
  const slice = plan.months.slice(0, maxMonths);
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {slice.map((m) => {
        const service = plan.plan[m.key]?.service ?? null;
        return (
          <span
            key={m.key}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/50 px-2 py-0.5 text-[11px] tracking-tight border border-zinc-700/30"
          >
            <span className="text-zinc-500 tabular-nums min-w-[2rem]">{m.label}</span>
            <span className={service ? 'text-emerald-400 font-medium' : 'text-zinc-600'}>{service ?? '—'}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function NotificationSettingsPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [rollingPlanType, setRollingPlanType] = useState<'all' | 'favorites' | 'watch_live'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [shows, setShows] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      router.replace('/sign-in');
      return;
    }
    (async () => {
      try {
        const [prefsRes, statusRes, showsRes] = await Promise.all([
          fetch('/api/notification-preferences'),
          fetch('/api/subscription-status'),
          fetch('/api/my-shows', { cache: 'no-store' }),
        ]);
        if (prefsRes.ok) {
          const prefs = await prefsRes.json();
          setEnabled(prefs.email_rolling_reminder_enabled ?? true);
          const t = prefs.rolling_plan_type;
          if (t === 'favorites' || t === 'watch_live') setRollingPlanType(t);
          else setRollingPlanType('all');
        }
        if (statusRes.ok) {
          const status = await statusRes.json();
          setIsPaid(!!status.isPaid);
        }
        if (showsRes.ok) {
          const data = await showsRes.json();
          setShows(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, userId, router]);

  const planPreviews = useMemo(() => {
    const toPreview = (list: any[]): PlanPreview => {
      if (list.length === 0) return null;
      const normalized = list.map((s, i) => ({
        ...s,
        watchLive: s.watchLive ?? s.watch_live ?? false,
        favorite: !!s.favorite,
        addedOrder: s.addedOrder ?? i,
      }));
      const { months, plan } = buildRollingPlan(normalized);
      return {
        months,
        plan: Object.fromEntries(
          Object.entries(plan).map(([k, v]) => [k, { service: v.service }])
        ),
      };
    };
    const favorites = shows.filter((s) => s.favorite);
    const watchLive = shows.filter(
      (s) => (s.watchLive ?? s.watch_live) && !s.window?.isComplete
    );
    return {
      all: toPreview(shows),
      favorites: toPreview(favorites),
      watch_live: toPreview(watchLive),
    };
  }, [shows]);

  async function handleToggle(next: boolean) {
    setSaving(true);
    try {
      const res = await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_rolling_reminder_enabled: next }),
      });
      if (res.ok) setEnabled(next);
    } finally {
      setSaving(false);
    }
  }

  async function handlePlanTypeChange(next: 'all' | 'favorites' | 'watch_live') {
    setSaving(true);
    try {
      const res = await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rolling_plan_type: next }),
      });
      if (res.ok) setRollingPlanType(next);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    setTestMessage(null);
    setSendingTest(true);
    try {
      const res = await fetch('/api/test-rolling-reminder', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTestMessage(data.message ?? 'Test email sent. Pleaseheck your inbox.');
      } else {
        setTestMessage(data.error ?? 'Failed to send test email.');
      }
    } catch (e) {
      setTestMessage('Request failed.');
    } finally {
      setSendingTest(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <Link
        href="/dashboard"
        className="text-zinc-500 hover:text-white text-sm mb-6 inline-block"
      >
        ← Back to My Shows
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Email notifications</h1>
      <p className="text-zinc-500 mb-8">
        We send a reminder near the end of each month: cancel this month’s service and subscribe to next month’s.
      </p>

      <div className="bg-zinc-900 rounded-2xl p-6 sm:p-8 border border-zinc-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Rolling plan reminder</p>
            <p className="text-sm text-zinc-500 mt-1">
              Monthly email to switch services (about 2 days before month end).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={saving}
            onClick={() => handleToggle(!enabled)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 ${
              enabled ? 'bg-emerald-600' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${
                enabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <p className="font-medium mb-2">Which plan do you want to receive notifications for?</p>
          <p className="text-sm text-zinc-500 mb-3">Choose which rolling plan it’s based on.</p>
          <fieldset className="space-y-3" role="radiogroup" aria-label="Plan type for emails">
            {[
              { value: 'all' as const, label: 'Overall rolling plan (all shows)' },
              { value: 'favorites' as const, label: 'Favorites only' },
              { value: 'watch_live' as const, label: 'Watch live only' },
            ].map(({ value, label }) => (
              <label key={value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="rolling_plan_type"
                  value={value}
                  checked={rollingPlanType === value}
                  onChange={() => handlePlanTypeChange(value)}
                  disabled={saving}
                  className="rounded-full border-zinc-600 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm">{label}</span>
                  <MinimalPlanPreview plan={value === 'all' ? planPreviews.all : value === 'favorites' ? planPreviews.favorites : planPreviews.watch_live} />
                </div>
              </label>
            ))}
          </fieldset>
        </div>

        {!isPaid && (
          <p className="text-sm text-zinc-500 mt-4 pt-4 border-t border-zinc-800">
            Free accounts receive up to 2 reminder emails per 6 months. Upgrade for a reminder every month you have a plan.
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <p className="text-sm text-zinc-500 mb-2">Send yourself a test reminder email now.</p>
          <button
            type="button"
            onClick={handleSendTest}
            disabled={sendingTest}
            className="text-sm px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white"
          >
            {sendingTest ? 'Sending…' : 'Send test email'}
          </button>
          {testMessage && (
            <p className={`text-sm mt-2 ${testMessage.startsWith('Test email') ? 'text-emerald-400' : 'text-amber-400'}`}>
              {testMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
