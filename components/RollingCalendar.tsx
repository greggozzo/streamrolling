// components/RollingCalendar.tsx
'use client';

import { useMemo } from 'react';

interface Show {
  tmdb_id: number;
  service: string;
  window: { primarySubscribe: string; primaryCancel: string; isComplete: boolean };
  favorite: boolean;
}

interface RollingCalendarProps {
  shows: Show[];
  onAffiliateClick?: (service: string, month: string) => void;
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

export default function RollingCalendar({ shows, onAffiliateClick }: RollingCalendarProps) {
  const months = useMemo(() => getNext12Months(), []);

  // Smart rolling logic
  const calendar: Record<string, Show> = {};

  const favorites = shows.filter(s => s.favorite);
  const normals = shows.filter(s => !s.favorite);

  // Sort: already-aired favorites first → normal favorites → normals
  const sorted = [
    ...favorites.filter(s => s.window.isComplete),
    ...favorites.filter(s => !s.window.isComplete),
    ...normals,
  ];

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
                <button
                  onClick={() => onAffiliateClick?.(entry.service, month)}
                  className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-4 px-5 rounded-2xl transition-all active:scale-95"
                >
                  {entry.service}
                </button>
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