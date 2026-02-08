// lib/planner.ts

export interface Show {
  service: string;
  window: { primarySubscribe: string };
  favorite?: boolean;
  watchLive?: boolean;
}

export type Calendar = Record<string, string[]>; // month -> services[]


/* ---------------- helpers ---------------- */

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
  const months: string[] = [];
  const base = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    months.push(monthKey(d));
  }

  return months;
};

const normalizeMonth = (str: string): string | null => {
  if (!str || str === 'TBD') return null;

  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return null;

  return monthKey(date);
};


/* ---------------- scoring ---------------- */

const scoreShow = (show: Show) => {
  let score = 1;

  if (show.favorite) score += 3;
  if (show.watchLive) score += 5;

  return score;
};


/* ---------------- planner ---------------- */

export function buildSubscriptionPlan(shows: Show[]): Calendar {
  const months = getNext12MonthKeys();

  const calendar: Calendar = {};
  months.forEach(m => (calendar[m] = []));

  /*
    Step 1 — group by service + month
    service -> month -> score
  */
  const serviceMap: Record<string, Record<string, number>> = {};

  for (const show of shows) {
    const month = normalizeMonth(show.window.primarySubscribe);
    if (!month || !months.includes(month)) continue;

    if (!serviceMap[show.service]) serviceMap[show.service] = {};
    if (!serviceMap[show.service][month]) serviceMap[show.service][month] = 0;

    serviceMap[show.service][month] += scoreShow(show);
  }

  /*
    Step 2 — place services into calendar
  */
  for (const [service, monthScores] of Object.entries(serviceMap)) {
    const entries = Object.entries(monthScores);

    if (entries.length === 0) continue;

    // sort by highest priority first
    entries.sort((a, b) => b[1] - a[1]);

    // add service to all months it has shows
    for (const [month] of entries) {
      calendar[month].push(service);
    }
  }

  /*
    Step 3 — guarantee at least one month per service
  */
  for (const service of Object.keys(serviceMap)) {
    const alreadyPlaced = Object.values(calendar).some(list =>
      list.includes(service)
    );

    if (!alreadyPlaced) {
      calendar[months[0]].push(service);
    }
  }

  return calendar;
}
