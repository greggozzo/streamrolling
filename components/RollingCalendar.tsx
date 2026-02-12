// components/RollingCalendar.tsx
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

function normalizeServiceName(name: string | null | undefined): string {
  return (name ?? '').toString().trim().toLowerCase();
}

function showBelongsToService(
  s: Record<string, unknown>,
  entryService: string
) {
  const service = (s.service ?? s.provider_name ?? '') as string;
  return normalizeServiceName(service) === normalizeServiceName(entryService);
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
    : clientPlan.months;

  const plan = hasClientData
    ? clientPlan.plan
    : hasServerPlan
    ? initialPlan!.plan
    : clientPlan.plan;

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
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-start">
            {months.map((month) => {
              const entry = plan[month.key];

              const showsForService = entry.service
                ? shows.filter((s) =>
                    showBelongsToService(
                      s as unknown as Record<string, unknown>,
                      entry.service!
                    )
                  )
                : [];

              const isOpen = openKey === month.key;

              return (
                <div
                  key={month.key}
                  className="relative flex flex-col items-stretch text-center shrink-0 min-h-[5.5rem]
                  w-[calc((100%-1rem)/3)]
                  sm:w-[calc((100%-1.5rem)/4)]
                  md:w-[calc((100%-1.5rem)/6)]"

                  /* desktop hover */
                  onMouseEnter={() => setOpenKey(month.key)}
                  onMouseLeave={() => setOpenKey(null)}

                  /* mobile tap */
                  onClick={() =>
                    setOpenKey(isOpen ? null : month.key)
                  }
                >
                  {/* Month label */}
                  <div
                    className="text-[10px] sm:text-xs text-zinc-500 mb-1.5 sm:mb-2 font-mono truncate"
                    title={month.label}
                  >
                    {month.label}
                  </div>

                  {/* Service block */}
                  {entry.service ? (
                    <>
                      <div
                        className="w-full flex items-center justify-center bg-emerald-600 text-white text-[10px] sm:text-xs font-medium py-2.5 sm:py-3 px-2 rounded-xl sm:rounded-2xl cursor-pointer overflow-hidden"
                        style={{ minHeight: 52 }}
                      >
                        <span
                          className="truncate block w-full text-center"
                          title={entry.service}
                        >
                          {entry.service}
                        </span>
                      </div>

                      {entry.alsoWatchLive &&
                        entry.alsoWatchLive.length > 0 && (
                          <p className="mt-1 text-[10px] text-amber-400/90 leading-tight px-1">
                            You may need{' '}
                            {entry.alsoWatchLive.join(' & ')} this
                            month too (watch live).
                          </p>
                        )}

                      {/* Tooltip */}
                      {showsForService.length > 0 && (
                        <div
                          className={`absolute bottom-full mb-3 left-0 right-0 mx-auto w-72 max-h-80 overflow-y-auto
                          bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-left text-xs shadow-2xl z-50
                          transition-opacity duration-150
                          ${
                            isOpen
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none'
                          }`}
                          role="tooltip"
                        >
                          <div className="text-emerald-400 font-semibold mb-3 sticky top-0 bg-zinc-800 pb-1">
                            {entry.service} — {month.label}
                          </div>

                          <ul className="space-y-1.5 text-zinc-300">
                            {showsForService.map((s, i) => (
                              <li
                                key={`${month.key}-${
                                  (s as any).tmdb_id ??
                                  (s as any).id ??
                                  i
                                }`}
                                className="flex items-center gap-2 flex-wrap"
                              >
                                <span className="text-zinc-500">•</span>
                                <span className="text-zinc-200">
                                  {showDisplayName(s)}
                                </span>

                                {(s as Show).favorite && (
                                  <span className="text-yellow-400">
                                    ★
                                  </span>
                                )}

                                {((s as Show).watchLive ||
                                  (s as any).watch_live) && (
                                  <span className="text-red-400">
                                    🔴 Live
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      className="w-full flex items-center justify-center text-zinc-600 text-xs sm:text-sm py-2.5 sm:py-3 border border-dashed border-zinc-700 rounded-xl sm:rounded-2xl"
                      style={{ minHeight: 52 }}
                    >
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
