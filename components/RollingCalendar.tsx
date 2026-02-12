'use client';

import { useMemo, useState } from 'react';
import { buildRollingPlan, Show } from '@/lib/planner';

/* ---------------- helpers ---------------- */

function showDisplayName(s: Show | Record<string, unknown>): string {
  const t = s as Record<string, unknown>;
  return (
    (t.title as string) ||
    (t.name as string) ||
    (t.original_title as string) ||
    (t.original_name as string) ||
    'Unknown'
  );
}

function normalize(name?: string | null) {
  return (name ?? '').trim().toLowerCase();
}

function showBelongsToService(s: any, service: string) {
  return normalize(s.service ?? s.provider_name) === normalize(service);
}

/* ---------------- types ---------------- */

export type InitialPlanPayload = {
  months: { key: string; label: string }[];
  plan: Record<
    string,
    {
      service: string | null;
      alsoWatchLive?: string[];
    }
  >;
};

interface Props {
  shows: Show[];
  loading?: boolean;
  initialPlan?: InitialPlanPayload | null;
}

/* ---------------- component ---------------- */

export default function RollingCalendar({
  shows,
  loading = false,
  initialPlan = null,
}: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const clientPlan = useMemo(() => buildRollingPlan(shows), [shows]);

  const hasServerPlan = initialPlan && initialPlan.months?.length > 0;
  const hasClientData = shows.length > 0;

  const months = hasClientData
    ? clientPlan.months
    : hasServerPlan
    ? initialPlan!.months
    : [];

  const plan = hasClientData
    ? clientPlan.plan
    : hasServerPlan
    ? initialPlan!.plan
    : {};

  const hasPlanToShow = hasClientData || hasServerPlan;

  /* ---------------- render ---------------- */

  return (
    <div className="mb-12 sm:mb-16">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
        Your Rolling Plan
      </h2>

      <div className="bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">
            Loading your plan…
          </div>
        ) : !hasPlanToShow ? (
          <p className="text-zinc-500 text-sm text-center py-8">
            Add shows above to see your rolling plan.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {months.map((month) => {
              const entry = plan[month.key];
              const isOpen = openKey === month.key;

              const showsForService = entry.service
                ? shows.filter((s) =>
                    showBelongsToService(s, entry.service!)
                  )
                : [];

              return (
                <div
                  key={month.key}
                  className="relative flex flex-col text-center shrink-0
                  w-[calc((100%-1rem)/3)]
                  sm:w-[calc((100%-1.5rem)/4)]
                  md:w-[calc((100%-1.5rem)/6)]
                  min-h-[5.5rem]"
                >
                  {/* Month label */}
                  <div className="text-[10px] sm:text-xs text-zinc-500 mb-2 font-mono truncate">
                    {month.label}
                  </div>

                  {/* ---------------- SERVICE CELL ---------------- */}
                  {entry.service ? (
                    <>
                      {/* Click/hover target */}
                      <button
                        type="button"
                        className="w-full bg-emerald-600 text-white text-[10px] sm:text-xs font-medium py-2.5 sm:py-3 px-2 rounded-xl sm:rounded-2xl hover:bg-emerald-500 active:scale-95 transition"
                        onClick={() =>
                          setOpenKey(isOpen ? null : month.key)
                        }
                        onMouseEnter={() => setOpenKey(month.key)}
                        onMouseLeave={() => setOpenKey(null)}
                      >
                        <span className="truncate block w-full">
                          {entry.service}
                        </span>
                      </button>

                      {/* live note */}
                      {entry.alsoWatchLive &&
                        entry.alsoWatchLive.length > 0 && (
                          <p className="mt-1 text-[10px] text-amber-400/90 leading-tight">
                            You may need{' '}
                            {entry.alsoWatchLive.join(' & ')} this
                            month too.
                          </p>
                        )}

                      {/* ---------------- TOOLTIP ---------------- */}
                      {showsForService.length > 0 && (
                        <div
                          className={`absolute top-full mt-2 left-1/2 -translate-x-1/2
                          w-72 max-h-80 overflow-y-auto
                          bg-zinc-800 border border-zinc-700 rounded-2xl p-4
                          text-left text-xs shadow-2xl z-50
                          transition-opacity duration-150
                          ${
                            isOpen
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none'
                          }`}
                          role="tooltip"
                        >
                          <div className="text-emerald-400 font-semibold mb-3">
                            {entry.service} — {month.label}
                          </div>

                          <ul className="space-y-1.5 text-zinc-300">
                            {showsForService.map((s, i) => (
                              <li
                                key={i}
                                className="flex items-center gap-2"
                              >
                                <span className="text-zinc-500">•</span>

                                <span className="flex-1 truncate">
                                  {showDisplayName(s)}
                                </span>

                                {/* Favorite */}
                                {(s as Show).favorite && (
                                  <span className="text-yellow-400 text-[11px]">
                                    ★
                                  </span>
                                )}

                                {/* Live badge (CSS, not emoji) */}
                                {((s as Show).watchLive ||
                                  (s as any).watch_live) && (
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
                    <div className="w-full flex items-center justify-center text-zinc-600 text-xs sm:text-sm py-2.5 sm:py-3 border border-dashed border-zinc-700 rounded-xl sm:rounded-2xl">
                      Open
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
