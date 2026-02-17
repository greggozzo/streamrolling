/**
 * Load a user's shows with TMDB details (window, service). Used on server so the
 * dashboard and calendar render with data on first paint in all browsers.
 */
import { supabase } from '@/lib/supabase';
import { calculateSubscriptionWindow, calculateSubscriptionWindowFromDates } from '@/lib/recommendation';
import { getFlatrateFromRegions, pickPrimaryProvider } from '@/lib/streaming-providers';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

export async function loadUserShows(userId: string): Promise<any[]> {
  const { data: sortData, error: sortError } = await supabase
    .from('user_shows')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  let rows: any[] | null = sortError
    ? (await supabase.from('user_shows').select('*').eq('user_id', userId).order('id', { ascending: true })).data
    : sortData;

  if (!rows?.length) return [];

  const loaded = await Promise.all(
    rows.map(async (dbShow: any, index: number) => {
      const isMovie = dbShow.media_type === 'movie';
      const endpoint = isMovie
        ? `${TMDB_BASE}/movie/${dbShow.tmdb_id}`
        : `${TMDB_BASE}/tv/${dbShow.tmdb_id}`;

      const res = await fetch(`${endpoint}?api_key=${API_KEY}&append_to_response=watch/providers`);
      const details = await res.json();

      let window: { primarySubscribe: string; primaryCancel: string; secondarySubscribe?: string | null; isComplete: boolean };
      if (isMovie) {
        window = calculateSubscriptionWindowFromDates(details.release_date);
      } else {
        const seasonRes = await fetch(
          `${TMDB_BASE}/tv/${dbShow.tmdb_id}/season/${details.number_of_seasons || 1}?api_key=${API_KEY}`
        );
        const season = await seasonRes.json();
        const episodes = season.episodes || [];
        window =
          episodes.length > 0
            ? calculateSubscriptionWindow(episodes)
            : calculateSubscriptionWindowFromDates(details.first_air_date, details.last_air_date);
      }

      const flatrate = getFlatrateFromRegions(details['watch/providers']);
      const service = pickPrimaryProvider(flatrate);

      return {
        ...details,
        title: details.title || details.name || 'Unknown',
        window,
        service,
        favorite: !!dbShow.favorite,
        watchLive: !!dbShow.watch_live,
        tmdb_id: dbShow.tmdb_id,
        media_type: dbShow.media_type || (isMovie ? 'movie' : 'tv'),
        addedOrder: index,
      };
    })
  );

  return loaded;
}
