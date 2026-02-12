'use client';

import { useState } from 'react';
import type { InitialPlanPayload } from '@/components/RollingCalendar';
import type { Show } from '@/lib/planner';

function showDisplayName(s: Show | Record<string, unknown>): string {
  const t = s as Record<string, unknown>;
  return (t.title as string) || (t.name as string) || (t.original_title as string) || (t.original_name as string) || 'Unknown';
}

function normalize(name?: string | null) {
  return (name ?? '').trim().toLowerCase();
}

function showBelongsToService(s: any, service: string) {
  return normalize(s.service ?? s.provider_name) === normalize(service);
}

/** Same layout as RollingPlanGrid; transparent overlay with tooltips only. Renders on top of server grid. */
export default function RollingPlanTooltips({
  shows,
  plan,
}: {
  shows: any[];
  plan: InitialPlanPayload;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const { months, plan: planMap } = plan;
  if (!months?.length) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden
    >
      {/* Same structure as RollingPlanGrid so overlay aligns exactly */}
      <div className="mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 invisible select-none">
          Your Rolling Plan
        </h2>
        <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-8">
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-start pointer-events-auto">
            {months.map((month) => {
              const entry = planMap[month.key];
              const service = entry?.service ?? null;
              const showsForService =
                service && shows.length > 0
                  ? shows.filter((s) => showBelongsToService(s, service))
                  : [];
              const isOpen = openKey === month.key;

              return (
                <div
                  key={month.key}
                  className="flex flex-col items-stretch text-center relative shrink-0 min-h-[5.5rem] w-[calc((100%-1rem)/3)] sm:w-[calc((100%-1.5rem)/4)] md:w-[calc((100%-1.5rem)/6)]"
                >
                  <div className="shrink-0 h-[1.25rem] sm:h-5 w-full" />
                  {service ? (
                    <>
                      <button
                        type="button"
                        className="w-full min-h-[52px] rounded-xl sm:rounded-2xl bg-transparent hover:bg-white/5 transition-colors cursor-pointer border-0"
                        onClick={() => setOpenKey(isOpen ? null : month.key)}
                        onMouseEnter={() => setOpenKey(month.key)}
                        onMouseLeave={() => setOpenKey(null)}
                        style={{ minHeight: 52 }}
                      >
                        <span className="sr-only">{service}</span>
                      </button>
                      {entry?.alsoWatchLive && entry.alsoWatchLive.length > 0 && (
                        <div className="mt-1 sm:mt-1.5 h-4" />
                      )}
                      {showsForService.length > 0 && (
                        <div
                          className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 max-h-80 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-left text-xs shadow-2xl z-50 transition-opacity duration-150 ${
                            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                          }`}
                          role="tooltip"
                        >
                          <div className="text-emerald-400 font-semibold mb-3">
                            {service} — {month.label}
                          </div>
                          <ul className="space-y-1.5 text-zinc-300">
                            {showsForService.map((s, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="text-zinc-500">•</span>
                                <span className="flex-1 truncate">{showDisplayName(s)}</span>
                                {(s as Show).favorite && <span className="text-yellow-400">★</span>}
                                {((s as Show).watchLive || (s as any).watch_live) && (
                                  <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-md">
                                    LIVE
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full min-h-[52px]" style={{ minHeight: 52 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
