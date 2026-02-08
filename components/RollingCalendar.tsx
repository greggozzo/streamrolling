// components/RollingCalendar.tsx
'use client';

import { useMemo } from 'react';

interface Show {
  service: string;
  window: { primarySubscribe: string };
  favorite: boolean;
  watch_live: boolean;
  name?: string;           // show title
  title?: string;          // movie title
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

  // Group by service + month
  const grouped: Record<string, Show[]> = {};

  shows.forEach(show => {
    const month = show.window.primarySubscribe;
    const key = `${show.service}---${month}`;

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(show);
  });

  // Build final calendar (one entry per service/month)
  const calendar: Record<string, { service: string; shows: Show[] }> = {};

  Object.keys(grouped).forEach(key => {
    const [service, month] = key.split('---');
    calendar[month] = { service, shows: grouped[key] };
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
                <div 
                  className="bg-emerald-600 text-white text-sm font-medium py-4 px-5 rounded-2xl cursor-pointer hover:bg-emerald-500 transition-all relative"
                  title={`${entry.shows.map(s => s.name || s.title).join(', ')}`}
                >
                  {entry.service}
                  {entry.shows.length > 1 && (
                    <span className="absolute -top-1 -right-1 bg-white text-emerald-600 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {entry.shows.length}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-zinc-600 text-sm py-4 border border-dashed border-zinc-700 rounded-2xl">
                  Open
                </div>
              )}

              {/* Hover tooltip */}
              {entry && entry.shows.length > 0 && (
                <div className="absolute hidden group-hover:block bg-zinc-950 border border-zinc-700 text-left text-xs rounded-xl p-4 w-80 -mt-2 z-50 shadow-2xl">
                  <div className="font-medium text-emerald-400 mb-2">{entry.service} — {month}</div>
                  <ul className="space-y-1 text-zinc-300">
                    {entry.shows.map(s => (
                      <li key={s.tmdb_id}>• {s.name || s.title}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}