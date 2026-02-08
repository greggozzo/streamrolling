// components/RollingCalendar.tsx
'use client';

import { useMemo } from 'react';
import {
  buildSubscriptionPlan,
  getNext12MonthKeys,
  formatMonth,
  Show,
} from '@/lib/planner';

interface Props {
  shows: Show[];
}

export default function RollingCalendar({ shows }: Props) {
  const months = useMemo(() => getNext12MonthKeys(), []);
  const calendar = useMemo(() => buildSubscriptionPlan(shows), [shows]);

  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold mb-6">Your Rolling Plan</h2>

      <div className="bg-zinc-900 rounded-3xl p-8 grid grid-cols-12 gap-3">
        {months.map(month => {
          const { service, shows } = calendar[month];

          return (
            <div key={month} className="text-center group relative">
              <div className="text-xs text-zinc-500 mb-2 font-mono">
                {formatMonth(month)}
              </div>

              {service ? (
                <>
                  <div className="bg-emerald-600 text-white text-sm font-medium py-4 px-5 rounded-2xl cursor-pointer">
                    {service}
                  </div>

                  {/* Tooltip */}
                  {shows.length > 0 && (
                    <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-left text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition shadow-xl z-50">
                      <div className="font-semibold mb-2 text-zinc-300">
                        Shows this month
                      </div>

                      {shows.map(show => (
                        <div key={show.title} className="text-zinc-400 mb-1">
                          • {show.title}
                          {show.watchLive && ' 🔴'}
                          {show.favorite && !show.watchLive && ' ⭐'}
                        </div>
                      ))}
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
