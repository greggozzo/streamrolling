// components/RollingCalendar.tsx
'use client';

import { useMemo } from 'react';
import { buildRollingPlan, Show } from '@/lib/planner';

/** Get display name from a show (TMDB uses name for TV, title for movies; dashboard may pass either). */
function showDisplayName(s: Show | Record<string, unknown>): string {
  const t = s as Record<string, unknown>;
  return (t.title as string) || (t.name as string) || (t.original_title as string) || (t.original_name as string) || 'Unknown';
}

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

                  {/* Tooltip: list ALL shows for this service (from full list), not just this month */}
                  {(() => {
                    const showsForService = shows.filter(s => (s as Show).service === entry.service);
                    if (showsForService.length === 0) return null;
                    return (
                      <div
                        className="
                          absolute left-1/2 -translate-x-1/2 bottom-full mb-3
                          w-72 max-h-80 overflow-y-auto
                          bg-zinc-800 border border-zinc-700 rounded-2xl p-4
                          text-left text-xs shadow-2xl
                          opacity-0 invisible group-hover:opacity-100 group-hover:visible
                          transition-opacity duration-150 delay-75
                          pointer-events-none z-50
                        "
                        role="tooltip"
                      >
                        <div className="text-emerald-400 font-semibold mb-3 sticky top-0 bg-zinc-800 pb-1">
                          {entry.service} — {month.label}
                        </div>
                        <ul className="space-y-1.5 text-zinc-300">
                          {showsForService.map((s, i) => (
                            <li key={(s as any).tmdb_id ?? (s as any).id ?? i} className="flex items-center gap-2 flex-wrap">
                              <span className="text-zinc-500">•</span>
                              <span className="text-zinc-200">{showDisplayName(s)}</span>
                              {(s as Show).favorite && <span className="text-yellow-400" aria-label="Favorite">★</span>}
                              {((s as Show).watchLive || (s as any).watch_live) && <span className="text-red-400">🔴 Live</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
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