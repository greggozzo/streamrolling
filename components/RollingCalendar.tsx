// components/RollingCalendar.tsx
'use client';

import { useMemo, useEffect } from 'react';

interface Show {
  service: string;
  window: { primarySubscribe: string };
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

const normalizeMonth = (str: string): string => {
  if (!str) return '';
  const [m, y] = str.split(' ');
  return `${m.slice(0, 3)} ${y}`;
};

export default function RollingCalendar({ shows }: Props) {
  const months = useMemo(() => getNext12Months(), []);

  useEffect(() => {
    console.log("=== ROLLING CALENDAR DEBUG ===");
    console.log("Shows received:", shows.length);
    console.log("Raw primarySubscribe values:", shows.map(s => s.window.primarySubscribe));
    console.log("Normalized values:", shows.map(s => normalizeMonth(s.window.primarySubscribe)));
    console.log("Calendar months:", months);
  }, [shows, months]);

  const calendar: Record<string, string> = {};

  shows.forEach(show => {
    const normalized = normalizeMonth(show.window.primarySubscribe);
    if (normalized && !calendar[normalized]) {
      calendar[normalized] = show.service;
    }
  });

  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold mb-6">Your Rolling Plan</h2>
      <div className="bg-zinc-900 rounded-3xl p-8 grid grid-cols-12 gap-3">
        {months.map(month => {
          const service = calendar[month];
          return (
            <div key={month} className="text-center">
              <div className="text-xs text-zinc-500 mb-2 font-mono">{month}</div>
              {service ? (
                <div className="bg-emerald-600 text-white text-sm font-medium py-4 px-5 rounded-2xl">
                  {service}
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