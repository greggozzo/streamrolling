// components/RollingCalendar.tsx
'use client';

import { useMemo } from 'react';

interface Show {
  service: string;
  window: { primarySubscribe: string; isComplete: boolean };
  favorite: boolean;
  watch_live: boolean;
}

interface Props {
  shows: Show[];
}

const getNext12Months = () => {
  const months: string[] = [];
  let date = new Date();
  for (let i = 0; i < 12; i++) {
    months.push(date.toLocaleString('default', { month: 'short', year: 'numeric' }));
    date.setMonth(date.getMonth() + 1);
  }
  return months;
};

export default function RollingCalendar({ shows }: Props) {
  const months = useMemo(() => getNext12Months(), []);

  const calendar: Record<string, Show> = {};

  // Priority order:
  // 1. Favorite + Watch Live → absolute highest
  // 2. Favorite (normal)
  // 3. Watch Live (normal)
  // 4. Everything else → added order (oldest first)
  const sorted = [...shows].sort((a, b) => {
    const aScore = (a.favorite ? 100 : 0) + (a.watch_live ? 50 : 0);
    const bScore = (b.favorite ? 100 : 0) + (b.watch_live ? 50 : 0);
    if (aScore !== bScore) return bScore - aScore;
    return 0; // preserve addition order
  });

  sorted.forEach(show => {
    let month = show.window.primarySubscribe;
    let attempts = 0;

    while (calendar[month] && attempts < 12) {
      const idx = months.indexOf(month);
      month = months[(idx + 1) % 12];
      attempts++;
    }

    if (!calendar[month]) {
      calendar[month] = show;
    }
  });

  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold mb-6">Your Rolling Plan</h2>
      <div className="bg-zinc-900 rounded-3xl p-8 grid grid-cols-12 gap-3">
        {months.map(month => {
          const entry = calendar[month];
          return (
            <div key={month} className="text-center">
              <div className="text-xs text-zinc-500 mb-2 font-mono">{month}</div>
              {entry ? (
                <div className="bg-emerald-600 text-white text-sm font-medium py-4 px-5 rounded-2xl">
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