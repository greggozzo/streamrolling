/* =========================================================
   Types
========================================================= */

export interface Show {
  title: string;
  service: string;
  window: {
    primarySubscribe: string;
    secondarySubscribe?: string;
  };
  favorite: boolean;
  watchLive: boolean;
  /** Order added (0 = first); used to break ties when two Watch Live services want the same month. */
  addedOrder?: number;
}

export interface MonthPlan {
  service: string | null;
  shows: Show[];
  /** Other services that also have Watch Live shows this month; user may need to subscribe to both. */
  alsoWatchLive?: string[];
}

export type Calendar = Record<string, MonthPlan>;


/* =========================================================
   Month helpers
========================================================= */

export const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const formatMonth = (key: string) => {
  const [y, m] = key.split('-').map(Number);

  return new Date(y, m - 1).toLocaleString('default', {
    month: 'short',
    year: 'numeric',
  });
};

export const getNext12MonthKeys = () => {
  const base = new Date();

  return Array.from({ length: 12 }).map((_, i) =>
    monthKey(new Date(base.getFullYear(), base.getMonth() + i, 1))
  );
};


/* =========================================================
   Helpers
========================================================= */

const normalizeMonth = (str: string): string | null => {
  if (!str || str === 'TBD') return null;

  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;

  return monthKey(d);
};

const scoreShow = (show: Show) => {
  if (show.watchLive) return 10;
  if (show.favorite) return 5;
  return 1;
};


/* =========================================================
   MAIN OPTIMIZER (with show tracking)
========================================================= */

export function buildSubscriptionPlan(shows: Show[]): Calendar {
  const months = getNext12MonthKeys();

  const calendar: Calendar = {};

  months.forEach(m => {
    calendar[m] = {
      service: null,
      shows: [],
    };
  });

  /*
    service -> month -> { score, shows[], minAddedOrder }
  */
  const scores: Record<
    string,
    Record<string, { score: number; shows: Show[]; minAddedOrder: number }>
  > = {};

  const currentMonthKey = months[0]; // first of next 12 = this month

  for (const show of shows) {
    let subscribeMonthStr: string;
    if (show.watchLive && show.window.secondarySubscribe) {
      subscribeMonthStr = show.window.secondarySubscribe;
    } else {
      subscribeMonthStr = show.window.primarySubscribe;
    }
    let month = normalizeMonth(subscribeMonthStr);
    // Watch Live + currently airing: if debut month is in the past, use current month so the show gets a slot
    if (show.watchLive && month && !months.includes(month)) {
      month = currentMonthKey;
    }
    if (!month || !months.includes(month)) continue;

    const order = show.addedOrder ?? Infinity;
    if (!scores[show.service]) scores[show.service] = {};
    if (!scores[show.service][month]) {
      scores[show.service][month] = { score: 0, shows: [], minAddedOrder: Infinity };
    }

    const bucket = scores[show.service][month];
    bucket.score += scoreShow(show);
    bucket.shows.push(show);
    bucket.minAddedOrder = Math.min(bucket.minAddedOrder, order);
  }

  /*
    Month-first placement: for each month, assign to the service that wants it most.
    Tiebreak: prefer Watch Live show that was added first (lower addedOrder).
    Track other services that had Watch Live for this month (user may need both).
  */
  const assignedServices = new Set<string>();

  for (const monthKey of months) {
    let best: { service: string; score: number; minAddedOrder: number; data: { shows: Show[] } } | null = null;

    for (const [service, monthData] of Object.entries(scores)) {
      if (assignedServices.has(service)) continue;
      const data = monthData[monthKey];
      if (!data) continue;

      const better =
        !best ||
        data.score > best.score ||
        (data.score === best.score && data.minAddedOrder < best.minAddedOrder);
      if (better) {
        best = { service, score: data.score, minAddedOrder: data.minAddedOrder, data };
      }
    }

    if (best) {
      assignedServices.add(best.service);
      const otherWatchLive = Object.entries(scores)
        .filter(([svc]) => svc !== best!.service)
        .map(([svc, monthData]) => {
          const d = monthData[monthKey];
          return d?.shows.some(s => s.watchLive) ? svc : null;
        })
        .filter((s): s is string => s !== null);
      calendar[monthKey] = {
        service: best.service,
        shows: best.data.shows,
        alsoWatchLive: otherWatchLive.length > 0 ? otherWatchLive : undefined,
      };
    }
  }

  /*
    Fallback: services that didn't get a month get the first open slot
  */
  for (const [service, monthData] of Object.entries(scores)) {
    if (assignedServices.has(service)) continue;
    const open = months.find(m => !calendar[m].service);
    if (open) {
      calendar[open] = { service, shows: [] };
    }
  }

  return calendar;
}

/** Builds the rolling plan and month list for the calendar UI. */
export function buildRollingPlan(shows: Show[]) {
  const plan = buildSubscriptionPlan(shows);
  const monthKeys = getNext12MonthKeys();
  const months = monthKeys.map(key => ({
    key,
    label: formatMonth(key),
  }));
  return { months, plan };
}
