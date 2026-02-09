// lib/recommendation.ts
import {
  addMonths,
  format,
  parseISO,
  startOfMonth,
  isBefore,
} from 'date-fns';

export function calculateSubscriptionWindow(episodes: any[]) {
  if (!episodes || episodes.length === 0) {
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
    // Season is fully out → "Watch now"
    let bingeMonth = startOfMonth(today);

    // Special rule: if finale was in current month AND after the 15th → shift to next full month
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
    // Future or airing now → classic binge-after-finale
    const bingeMonth = addMonths(last, 1);

    return {
      primarySubscribe: format(bingeMonth, 'MMMM yyyy'),
      primaryCancel: format(addMonths(bingeMonth, 1), 'MMMM yyyy'),
      primaryLabel: 'Subscribe in',
      primaryNote: 'Binge the whole season in one month → cancel next month',
      secondarySubscribe: format(first, 'MMMM yyyy'),
      firstDate,
      lastDate,
      isComplete: false,
    };
  }
}