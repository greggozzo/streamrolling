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
      className="absolute inset-0 pointer-events-none min-h-full"
      aria-hidden
    >
      {/* Same structure as RollingPlanGrid so overlay aligns exactly; min-h-full so all rows receive touch */}
      <div className="mb-12 sm:mb-16 min-h-full flex flex-col">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 invisible select-none shrink-0">
          Your Rolling Plan
        </h2>
        <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-8 flex-1 min-h-0 min-w-0">
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-start pointer-events-auto min-h-full content-start min-w-0">
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
                  className="flex flex-col items-stretch text-center relative shrink-0 min-h-[5.5rem] min-w-0 w-[calc((100%-1rem)/3)] sm:w-[calc((100%-2.25rem)/4)] md:w-[calc((100%-3.75rem)/6)]"
                >
                  {/* Match grid exactly: same month label classes so row heights align */}
                  <div
                    className="text-[10px] sm:text-xs mb-1.5 sm:mb-2 font-mono w-full truncate shrink-0 invisible select-none"
                    title={month.label}
                  >
                    {month.label}
                  </div>
                  {service ? (
                    <>
                      <button
                        type="button"
                        className="w-full min-h-[52px] rounded-xl sm:rounded-2xl bg-transparent hover:bg-white/5 transition-colors cursor-pointer border-0 flex-shrink-0"
                        onClick={() => setOpenKey(isOpen ? null : month.key)}
                        onMouseEnter={() => setOpenKey(month.key)}
                        onMouseLeave={() => setOpenKey(null)}
                        style={{ minHeight: 52 }}
                      >
                        <span className="sr-only">{service}</span>
                      </button>
                      {/* Match grid: same reserve space as RollingPlanGridClient */}
                      <div className="mt-1 sm:mt-1.5 min-h-[2.5rem] flex items-start justify-center shrink-0" />
                      {showsForService.length > 0 && (
                        <>
                          {/* Mobile: backdrop to close bottom sheet */}
                          <div
                            className={`sm:hidden fixed inset-0 bg-black/50 z-[99] transition-opacity duration-200 ${
                              isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                            }`}
                            aria-hidden
                            onClick={() => setOpenKey(null)}
                          />
                          {/* Mobile: fixed bottom sheet so full list is visible and scrollable */}
                          <div
                            className={`sm:hidden fixed inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto bg-zinc-800 border-t border-zinc-700 rounded-t-2xl p-4 pb-[env(safe-area-inset-bottom)] text-left text-xs shadow-2xl z-[100] transition-transform duration-200 ${
                              isOpen ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-full'
                            }`}
                            role="dialog"
                            aria-label={`${service} — ${month.label}`}
                          >
                            <div className="text-emerald-400 font-semibold mb-3 sticky top-0 bg-zinc-800 pt-1 pb-2">
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
                          {/* Desktop: absolute popover next to cell */}
                          <div
                            className={`hidden sm:block absolute top-full mt-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] max-h-80 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-left text-xs shadow-2xl z-50 transition-opacity duration-150 -translate-x-1/2 ${
                              isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                            }`}
                            style={{
                              left: 'clamp(10rem, 50%, calc(100% - 10rem))',
                            }}
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
                        </>
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
