// components/RollingCalendar.tsx
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

      <div className="bg-zinc-900 rounded-3xl p-8 grid grid-cols-12 gap-3 overflow-visible">
        {months.map(month => {
          const entry = plan[month.key];

          return (
            <div key={month.key} className="text-center relative group">
              <div className="text-xs text-zinc-500 mb-2 font-mono">
                {month.label}
              </div>

              {entry.service ? (
                <>
                  <div className="bg-emerald-600 text-white text-sm font-medium py-4 px-5 rounded-2xl cursor-pointer">
                    {entry.service}
                  </div>

                  {/* Improved Tooltip */}
                  {entry.shows && entry.shows.length > 0 && (
                    <div className="
                      absolute
                      left-1/2 -translate-x-1/2
                      bottom-full
                      mb-3
                      w-64
                      bg-zinc-800
                      border border-zinc-700
                      rounded-2xl
                      p-4
                      text-left text-xs
                      shadow-2xl
                      opacity-0
                      group-hover:opacity-100
                      transition-all
                      pointer-events-none
                      z-50
                    ">
                      <div className="text-emerald-400 font-semibold mb-3">
                        {entry.service} — {month.label}
                      </div>

                      <ul className="space-y-1 text-zinc-300">
                        {entry.shows.map((s: any, i: number) => (
                          <li key={i} className="flex items-center gap-2">
                            • {s.name || s.title}
                            {s.favorite && <span className="text-yellow-400">★</span>}
                            {s.watch_live && <span className="text-red-400">🔴 Live</span>}
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