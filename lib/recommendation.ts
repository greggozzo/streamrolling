// lib/recommendation.ts

export function calculateSubscriptionWindow(episodes: any[], isMovie = false) {
  // === Case 1: Movie / Stand-up Special ===
  if (isMovie || !episodes || episodes.length === 0) {
    return {
      primarySubscribe: "Watch Now",
      primaryCancel: "N/A",
      isComplete: true,
      primaryLabel: "Watch Now",
      secondarySubscribe: null,
    };
  }

  // === Case 2: TV Show ===
  const firstAir = new Date(episodes[0].air_date);
  const lastAir = new Date(episodes[episodes.length - 1].air_date);

  const firstMonth = firstAir.toLocaleString('default', { month: 'long', year: 'numeric' });
  const lastMonth = lastAir.toLocaleString('default', { month: 'long', year: 'numeric' });

  const isComplete = lastAir < new Date();

  if (isComplete) {
    return {
      primarySubscribe: firstMonth,
      primaryCancel: lastMonth,
      isComplete: true,
      primaryLabel: "Binge Now",
      secondarySubscribe: null,
    };
  }

  return {
    primarySubscribe: lastMonth,
    primaryCancel: lastMonth,
    isComplete: false,
    primaryLabel: "Subscribe in",
    secondarySubscribe: firstMonth,
  };
}