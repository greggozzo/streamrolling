// components/RollingCalendar.tsx
'use client';

import { useMemo } from 'react';

interface Show {
  service: string;
  window: { primarySubscribe: string };
  favorite: boolean;
  watch_live: boolean;
  name?: string;
  title?: string;
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

  // Group shows by month (stack same service)
  const calendar: Record<string, { service: string; shows: Show[] }> = {};

  shows.forEach(show => {
    const month = show.window.primarySubscribe;
    if (!calendar[month]) {
      calendar[month] = { service: show.service, shows: [] };
    }
    calendar[month].shows.push(show);
  });

  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold mb-6">Your Rolling Plan</h2>
      <div className="bg-zinc-900 rounded-3xl p-8 grid grid-cols-12 gap-3">
        {months.map(month => {
          const entry = calendar[month];
          return (
            <div key={month} className="text-center group relative">
              <div className="text-xs text-zinc-500 mb-2 font-mono">{month}</div>

              {entry ? (
                <div className="bg-emerald-600 text-white text-sm font-medium py-4 px-5 rounded-2xl relative cursor-help"
                     title={entry.shows.map(s => s.name || s.title).join(', ')}>
                  {entry.service}
                  {entry.shows.length > 1 && (
                    <span className="absolute -top-1 -right-1 bg-white text-emerald-600 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                      {entry.shows.length}
                    </span>
                  )}
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