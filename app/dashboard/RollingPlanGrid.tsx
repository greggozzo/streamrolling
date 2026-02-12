/**
 * Server-rendered rolling plan grid. No client JS — calendar is in the initial HTML
 * so it displays in all browsers (Firefox, mobile).
 */
type PlanPayload = {
  months: { key: string; label: string }[];
  plan: Record<string, { service: string | null; alsoWatchLive?: string[] }>;
};

export default function RollingPlanGrid({ plan }: { plan: PlanPayload }) {
  const { months, plan: planMap } = plan;
  if (!months?.length) return null;

  return (
    <div className="mb-12 sm:mb-16">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Your Rolling Plan</h2>
      <div className="bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 overflow-visible">
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-start">
          {months.map((month) => {
            const entry = planMap[month.key];
            const service = entry?.service ?? null;
            const alsoWatchLive = entry?.alsoWatchLive;

            return (
              <div
                key={month.key}
                className="flex flex-col items-stretch text-center relative shrink-0 min-h-[5.5rem] w-[calc((100%-1rem)/3)] sm:w-[calc((100%-2.25rem)/4)] md:w-[calc((100%-3.75rem)/6)]"
              >
                <div
                  className="text-[10px] sm:text-xs text-zinc-500 mb-1.5 sm:mb-2 font-mono w-full truncate shrink-0"
                  title={month.label}
                >
                  {month.label}
                </div>
                {service ? (
                  <>
                    <div
                      className="w-full min-w-0 flex items-center justify-center bg-emerald-600 text-white text-[10px] sm:text-xs font-medium py-2.5 sm:py-3 px-1.5 sm:px-3 rounded-xl sm:rounded-2xl flex-shrink-0 overflow-hidden"
                      style={{ minHeight: 52 }}
                    >
                      <span className="truncate block w-full text-center px-0.5" title={service}>
                        {service}
                      </span>
                    </div>
                    {alsoWatchLive && alsoWatchLive.length > 0 && (
                      <p className="mt-1 sm:mt-1.5 text-[10px] text-amber-400/90 leading-tight px-0.5 sm:px-1">
                        You may need {alsoWatchLive.join(' & ')} this month too (watch live). We placed {service} here because it was added first.
                      </p>
                    )}
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
