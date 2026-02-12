// lib/recommendation.ts
import {
  addMonths,
  format,
  parseISO,
  startOfMonth,
  isBefore,
} from 'date-fns';

/** Parse a date string (YYYY-MM-DD or MMM yyyy); returns null if invalid. */
function parseDateSafe(str: string | null | undefined): Date | null {
  if (!str || typeof str !== 'string') return null;
  const d = new Date(str.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Build subscription window from first/last air dates when episode list is empty (e.g. Severance). */
export function calculateSubscriptionWindowFromDates(
  firstAirDate: string | null | undefined,
  lastAirDate?: string | null
): ReturnType<typeof calculateSubscriptionWindow> {
  const first = parseDateSafe(firstAirDate);
  const last = parseDateSafe(lastAirDate ?? firstAirDate);
  if (!first && !last) {
    return {
      primarySubscribe: 'TBD',
      primaryCancel: 'TBD',
      primaryLabel: 'Subscribe in',
      primaryNote: '',
      secondarySubscribe: null,
      firstDate: 'TBD',
      lastDate: 'TBD',
      isComplete: false,
    };
  }
  const firstD = first ?? last!;
  const lastD = last ?? first!;
  const today = new Date();
  const isComplete = isBefore(lastD, today) || lastD.toDateString() === today.toDateString();
  const firstDate = format(firstD, 'MMM d');
  const lastDate = format(lastD, 'MMM d');

  if (isComplete) {
    let bingeMonth = startOfMonth(today);
    if (lastD.getMonth() === today.getMonth() && lastD.getDate() > 15) {
      bingeMonth = addMonths(bingeMonth, 1);
    }
    return {
      primarySubscribe: format(bingeMonth, 'MMMM yyyy'),
      primaryCancel: format(addMonths(bingeMonth, 1), 'MMMM yyyy'),
      primaryLabel: 'Watch now',
      primaryNote: 'Season is complete – binge it in one month',
      secondarySubscribe: null,
      firstDate,
      lastDate,
      isComplete: true,
    };
  } else {
    const bingeMonth = addMonths(lastD, 1);
    // Alternative = month when first episode airs (subscribe then to watch live)
    const firstEpisodeMonth = startOfMonth(firstD);
    return {
      primarySubscribe: format(bingeMonth, 'MMMM yyyy'),
      primaryCancel: format(addMonths(bingeMonth, 1), 'MMMM yyyy'),
      primaryLabel: 'Subscribe in',
      primaryNote: 'Binge the whole season in one month → cancel next month',
      secondarySubscribe: format(firstEpisodeMonth, 'MMMM yyyy'),
      firstDate,
      lastDate,
      isComplete: false,
    };
  }
}

export function calculateSubscriptionWindow(episodes: any[], fallbackFirst?: string, fallbackLast?: string) {
  if (!episodes || episodes.length === 0) {
    return calculateSubscriptionWindowFromDates(fallbackFirst, fallbackLast);
  }

  const today = new Date();
  const dates = episodes
    .map((e) => parseISO(e.air_date))
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  const first = dates[0];
  const last = dates[dates.length - 1];
  const isComplete = isBefore(last, today) || last.toDateString() === today.toDateString();

  const firstDate = format(first, 'MMM d');
  const lastDate = format(last, 'MMM d');

  if (isComplete) {
    let bingeMonth = startOfMonth(today);
    if (last.getMonth() === today.getMonth() && last.getDate() > 15) {
      bingeMonth = addMonths(bingeMonth, 1);
    }
    return {
      primarySubscribe: format(bingeMonth, 'MMMM yyyy'),
      primaryCancel: format(addMonths(bingeMonth, 1), 'MMMM yyyy'),
      primaryLabel: 'Watch now',
      primaryNote: 'Season is complete – binge it in one month',
      secondarySubscribe: null,
      firstDate,
      lastDate,
      isComplete: true,
    };
  } else {
    const bingeMonth = addMonths(last, 1);
    // Alternative = month when first episode airs (subscribe then to watch live)
    const firstEpisodeMonth = startOfMonth(first);
    return {
      primarySubscribe: format(bingeMonth, 'MMMM yyyy'),
      primaryCancel: format(addMonths(bingeMonth, 1), 'MMMM yyyy'),
      primaryLabel: 'Subscribe in',
      primaryNote: 'Binge the whole season in one month → cancel next month',
      secondarySubscribe: format(firstEpisodeMonth, 'MMMM yyyy'),
      firstDate,
      lastDate,
      isComplete: false,
    };
  }
}