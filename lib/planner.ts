/* =========================================================
   Types
========================================================= */

export interface Show {
  title: string; // ← needed for tooltip
  service: string;
  window: { primarySubscribe: string };
  favorite?: boolean;
  watchLive?: boolean;
}

export interface MonthPlan {
  service: string | null;
  shows: Show[];
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
    service -> month -> { score, shows[] }
  */
  const scores: Record<
    string,
    Record<string, { score: number; shows: Show[] }>
  > = {};

  for (const show of shows) {
    const month = normalizeMonth(show.window.primarySubscribe);
    if (!month || !months.includes(month)) continue;

    if (!scores[show.service]) scores[show.service] = {};
    if (!scores[show.service][month]) {
      scores[show.service][month] = { score: 0, shows: [] };
    }

    scores[show.service][month].score += scoreShow(show);
    scores[show.service][month].shows.push(show);
  }

  /*
    Sort services by total priority
  */
  const services = Object.entries(scores)
    .map(([service, monthData]) => {
      const totalScore = Object.values(monthData).reduce(
        (sum, m) => sum + m.score,
        0
      );

      const sortedMonths = Object.entries(monthData).sort(
        (a, b) => b[1].score - a[1].score
      );

      return {
        service,
        totalScore,
        choices: sortedMonths, // includes shows
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);


  /*
    Greedy placement
  */
  for (const { service, choices } of services) {
    let placed = false;

    for (const [month, data] of choices) {
      if (!calendar[month].service) {
        calendar[month] = {
          service,
          shows: data.shows,
        };
        placed = true;
        break;
      }
    }

    // fallback
    if (!placed) {
      const open = months.find(m => !calendar[m].service);
      if (open) {
        calendar[open] = {
          service,
          shows: [],
        };
      }
    }
  }

  return calendar;
}
