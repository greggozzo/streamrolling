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
          const services = calendar[month];

          return (
            <div key={month} className="text-center">
              <div className="text-xs text-zinc-500 mb-2 font-mono">
                {formatMonth(month)}
              </div>

              {services.length ? (
                <div className="flex flex-col gap-2">
                  {services.map(s => (
                    <div
                      key={s}
                      className="bg-emerald-600 text-white text-sm font-medium py-2 px-3 rounded-xl"
                    >
                      {s}
                    </div>
                  ))}
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
