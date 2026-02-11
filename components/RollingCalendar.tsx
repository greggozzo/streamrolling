// components/RollingCalendar.tsx
'use client';

import { useMemo } from 'react';
import { buildRollingPlan, Show } from '@/lib/planner';

/** Get display name from a show (TMDB uses name for TV, title for movies; dashboard may pass either). */
function showDisplayName(s: Show | Record<string, unknown>): string {
  const t = s as Record<string, unknown>;
  return (t.title as string) || (t.name as string) || (t.original_title as string) || (t.original_name as string) || 'Unknown';
}

/** Normalize for service name comparison (casing, whitespace). */
function normalizeServiceName(name: string | null | undefined): string {
  return (name ?? '').toString().trim().toLowerCase();
}

/** True if this show belongs to the given service (handles different property names). */
function showBelongsToService(s: Record<string, unknown>, entryService: string): boolean {
  const service = (s.service ?? s.provider_name ?? '') as string;
  return normalizeServiceName(service) === normalizeServiceName(entryService);
}

interface Props {
  shows: Show[];
}

export default function RollingCalendar({ shows }: Props) {
  const { months, plan } = useMemo(() => buildRollingPlan(shows), [shows]);

  return (
    <div className="mb-12 sm:mb-16">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Your Rolling Plan</h2>

      <div className="bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 overflow-visible">
        {/* Flexbox layout for reliable rendering on mobile Safari/Chrome (CSS Grid can unreliable there) */}
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-start">
          {months.map((month) => {
            const entry = plan[month.key];

            return (
              <div
                key={month.key}
                className="flex flex-col items-stretch text-center relative group shrink-0 min-h-[5.5rem] w-[calc((100%-1rem)/3)] sm:w-[calc((100%-1.5rem)/4)] md:w-[calc((100%-1.5rem)/6)]"
              >
                <div className="text-[10px] sm:text-xs text-zinc-500 mb-1.5 sm:mb-2 font-mono w-full truncate shrink-0" title={month.label}>
                  {month.label}
                </div>

                {entry.service ? (
                  <>
                    <div
                      className="w-full min-w-0 flex items-center justify-center bg-emerald-600 text-white text-[10px] sm:text-xs font-medium py-2.5 sm:py-3 px-1.5 sm:px-3 rounded-xl sm:rounded-2xl cursor-pointer flex-shrink-0 overflow-hidden"
                      style={{ minHeight: 52 }}
                    >
                      <span className="truncate block w-full text-center px-0.5" title={entry.service}>
                        {entry.service}
                      </span>
                    </div>
                    {entry.alsoWatchLive && entry.alsoWatchLive.length > 0 && (
                      <p className="mt-1 sm:mt-1.5 text-[10px] text-amber-400/90 leading-tight px-0.5 sm:px-1">
                        You may need {entry.alsoWatchLive.join(' & ')} this month too (watch live). We placed {entry.service} here because it was added first.
                      </p>
                    )}

                    {(() => {
                      const showsForService = shows.filter((s) => showBelongsToService(s as unknown as Record<string, unknown>, entry.service!));
                      if (showsForService.length === 0) return null;
                      return (
                        <div
                          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-72 max-h-80 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-left text-xs shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 delay-75 z-[100]"
                          role="tooltip"
                        >
                          <div className="text-emerald-400 font-semibold mb-3 sticky top-0 bg-zinc-800 pb-1">
                            {entry.service} — {month.label}
                          </div>
                          <ul className="space-y-1.5 text-zinc-300">
                            {showsForService.map((s, i) => (
                              <li key={`${month.key}-${(s as any).tmdb_id ?? (s as any).id ?? i}`} className="flex items-center gap-2 flex-wrap">
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
                  <div
                    className="w-full flex items-center justify-center text-zinc-600 text-xs sm:text-sm py-2.5 sm:py-3 border border-dashed border-zinc-700 rounded-xl sm:rounded-2xl flex-shrink-0 overflow-hidden"
                    style={{ minHeight: 52 }}
                  >
                    Open
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}