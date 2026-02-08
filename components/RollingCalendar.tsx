'use client';

import { useMemo } from 'react';
import { buildRollingPlan, Show } from '@/lib/planner';

interface Props {
  shows: Show[];
}

export default function RollingCalendar({ shows }: Props) {
  const { months, plan } = useMemo(() => buildRollingPlan(shows), [shows]);

  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold mb-6">Your Rolling Plan</h2>

      <div className="bg-zinc-900 rounded-3xl p-8 grid grid-cols-12 gap-3">
        {months.map(month => {
          const entry = plan[month.key];

          return (
            <div key={month.key} className="relative text-center group">
              {/* month label */}
              <div className="text-xs text-zinc-500 mb-2 font-mono">
                {month.label}
              </div>

              {/* service block */}
              {entry.service ? (
                <>
                  <div className="bg-emerald-600 text-white text-sm font-medium py-4 px-5 rounded-2xl cursor-pointer">
                    {entry.service}
                  </div>

                  {/* tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-56
                                  bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-left
                                  opacity-0 group-hover:opacity-100 transition
                                  pointer-events-none z-50 shadow-xl">

                    <div className="text-xs text-zinc-400 mb-2">
                      Shows this month
                    </div>

                    <ul className="text-sm space-y-1">
                      {entry.shows.map(s => (
                        <li key={s.title}>• {s.title}</li>
                      ))}
                    </ul>
                  </div>
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
