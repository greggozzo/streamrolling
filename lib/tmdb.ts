// lib/tmdb.ts
const TMDB_KEY = process.env.TMDB_API_KEY!;
const BASE = 'https://api.themoviedb.org/3';

export async function getTrendingTV() {
  const res = await fetch(`${BASE}/trending/tv/week?api_key=${TMDB_KEY}&language=en-US`, {
    next: { revalidate: 86400 },
  });
  const json = await res.json();
  return json.results.slice(0, 12);
}

export async function getShowDetails(id: string) {
  const res = await fetch(`${BASE}/tv/${id}?api_key=${TMDB_KEY}&append_to_response=watch/providers`, {
    next: { revalidate: 3600 },
  });
  return res.json();
}

export async function getNextSeasonEpisodes(id: string) {
  const show = await getShowDetails(id);
  const seasonNumber = show.number_of_seasons || 1;
  const res = await fetch(`${BASE}/tv/${id}/season/${seasonNumber}?api_key=${TMDB_KEY}`, {
    next: { revalidate: 3600 },
  });
  const season = await res.json();
  return season.episodes || [];
}

export async function searchShows(query: string) {
  const res = await fetch(`${BASE}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US`);
  const json = await res.json();
  return json.results;
}

export async function searchMovies(query: string) {
  const res = await fetch(`${BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US`);
  const json = await res.json();
  return json.results;
}