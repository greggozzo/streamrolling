// components/RollingCalendar.tsx
'use client';

import { useMemo, useEffect } from 'react';
import { buildSubscriptionPlan, getNext12MonthKeys, formatMonth, Show } from '@/lib/planner';

interface Props {
  shows: Show[];
}

export default function RollingCalendar({ shows }: Props) {
  const monthKeys = useMemo(() => getNext12MonthKeys(), []);
  const plan = useMemo(() => buildSubscriptionPlan(shows), [shows]);

  // Debug
  useEffect(() => {
    console.log("=== RollingCalendar Debug ===");
    console.log("Shows received:", shows.length);
    console.log("Month keys:", monthKeys);
    console.log("Plan from planner:", plan);
  }, [shows, monthKeys, plan]);

  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold mb-6">Your Rolling Plan</h2>

      <div className="bg-zinc-900 rounded-3xl p-8 grid grid-cols-12 gap-3">
        {monthKeys.map(key => {
          const entry = plan[key];

          return (
            <div key={key} className="text-center group relative">
              <div className="text-xs text-zinc-500 mb-2 font-mono">
                {formatMonth(key)}
              </div>

              {entry?.service ? (
                <div className="bg-emerald-600 text-white text-sm font-medium py-4 px-5 rounded-2xl relative cursor-help"
                     title={entry.shows?.map((s: any) => s.title).join(', ') || ''}>
                  {entry.service}
                </div>
              ) : (
                <div className="text-zinc-600 text-sm py-4 border border-dashed border-zinc-700 rounded-2xl">
                  Open
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}