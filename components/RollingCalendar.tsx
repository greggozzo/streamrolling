// components/RollingCalendar.tsx
'use client';

import { useMemo } from 'react';
import { buildSubscriptionPlan, getNext12MonthKeys, formatMonth, Show } from '@/lib/planner';

interface Props {
  shows: Show[];
}

export default function RollingCalendar({ shows }: Props) {
  const monthKeys = useMemo(() => getNext12MonthKeys(), []);
  const plan = useMemo(() => buildSubscriptionPlan(shows), [shows]);

  // Force show ALL shows per service/month in tooltip (even if planner only keeps 1)
  const fullPlan = useMemo(() => {
    const map: Record<string, { service: string; shows: Show[] }> = {};

    shows.forEach(show => {
      const key = show.window.primarySubscribe;
      if (!key || key === 'TBD') return;

      if (!map[key]) {
        map[key] = { service: show.service, shows: [] };
      }
      map[key].shows.push(show);
    });

    return map;
  }, [shows]);

  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold mb-6">Your Rolling Plan</h2>

      <div className="bg-zinc-900 rounded-3xl p-8 grid grid-cols-12 gap-3">
        {monthKeys.map(key => {
          const entry = plan[key];
          const fullEntry = fullPlan[key] || { service: null, shows: [] };

          return (
            <div key={key} className="text-center group relative">
              <div className="text-xs text-zinc-500 mb-2 font-mono">
                {formatMonth(key)}
              </div>

              {entry?.service ? (
                <>
                  <div className="bg-emerald-600 text-white text-sm font-medium py-4 px-5 rounded-2xl relative cursor-help">
                    {entry.service}

                    {fullEntry.shows.length > 1 && (
                      <span className="absolute -top-1 -right-1 bg-white text-emerald-600 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {fullEntry.shows.length}
                      </span>
                    )}
                  </div>

                  {/* Tooltip - shows ALL shows for this service/month */}
                  {fullEntry.shows.length > 0 && (
                    <div className="absolute hidden group-hover:block left-1/2 -translate-x-1/2 bottom-full mb-3 w-72 bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-left shadow-2xl z-50 pointer-events-none">
                      <div className="text-emerald-400 font-semibold text-xs mb-3">
                        {entry.service} — {formatMonth(key)}
                      </div>

                      <ul className="text-sm text-zinc-300 space-y-1 max-h-64 overflow-auto">
                        {fullEntry.shows.map((s: any, i: number) => (
                          <li key={i} className="flex items-center gap-2">
                            • {s.title}
                            {s.favorite && <span className="text-yellow-400">★</span>}
                            {s.watchLive && <span className="text-red-400">🔴 Live</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
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