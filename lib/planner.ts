// lib/planner.ts

export interface Show {
  title: string;
  service: string;
  window: {
    primarySubscribe: string; // "Feb 2026"
  };
}

/* ---------------------------------- */
/* Month helpers                      */
/* ---------------------------------- */

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

export const getNext12Months = () => {
  const months: { label: string; key: string }[] = [];

  const d = new Date();

  for (let i = 0; i < 12; i++) {
    const label = d.toLocaleString('default', {
      month: 'short',
      year: 'numeric',
    });

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    months.push({ label, key });

    d.setMonth(d.getMonth() + 1);
  }

  return months;
};

/* ---------------------------------- */
/* Safe month parsing                 */
/* ---------------------------------- */

const normalizeMonth = (str: string): string | null => {
  if (!str || str === 'TBD') return null;

  // "Feb 2026"
  const [m, y] = str.split(' ');
  const idx = MONTHS[m?.slice(0, 3)];

  if (idx === undefined) return null;

  return `${y}-${String(idx + 1).padStart(2, '0')}`;
};

/* ---------------------------------- */
/* Planner logic                      */
/* ---------------------------------- */

export interface MonthPlan {
  service: string | null;
  shows: Show[];
}

export const buildRollingPlan = (shows: Show[]) => {
  const months = getNext12Months();

  const plan: Record<string, MonthPlan> = {};

  months.forEach(m => {
    plan[m.key] = { service: null, shows: [] };
  });

  /* group shows by service + month */
  const grouped: Record<string, Show[]> = {};

  shows.forEach(show => {
    const monthKey = normalizeMonth(show.window.primarySubscribe);
    if (!monthKey) return;

    const key = `${monthKey}---${show.service}`;

    if (!grouped[key]) grouped[key] = [];

    grouped[key].push(show);
  });

  /* choose service with MOST shows each month */
  Object.entries(grouped).forEach(([key, groupShows]) => {
    const [monthKey, service] = key.split('---');

    const current = plan[monthKey];

    if (!current || groupShows.length > current.shows.length) {
      plan[monthKey] = {
        service,
        shows: groupShows,
      };
    }
  });

  return { months, plan };
};
