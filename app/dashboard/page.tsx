'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateSubscriptionWindow } from '@/lib/recommendation';
import ShowCard from '@/components/ShowCard';
import RollingCalendar from '@/components/RollingCalendar';
import Link from 'next/link';

export default function Dashboard() {
  const { userId, isLoaded } = useAuth();
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !userId) {
      setLoading(false);
      return;
    }

    async function load() {
      const { data } = await supabase
        .from('user_shows')
        .select('*')
        .eq('user_id', userId);

      const loaded = await Promise.all(
        (data || []).map(async (dbShow: any) => {
          const isMovie = dbShow.media_type === 'movie';
          const endpoint = isMovie 
            ? `https://api.themoviedb.org/3/movie/${dbShow.tmdb_id}`
            : `https://api.themoviedb.org/3/tv/${dbShow.tmdb_id}`;

          const res = await fetch(
            `${endpoint}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&append_to_response=watch/providers`
          );
          const details = await res.json();

          // Only fetch episodes for TV shows
          let window = { primarySubscribe: 'TBD', primaryCancel: 'TBD', isComplete: false };
          if (!isMovie) {
            const epRes = await fetch(
              `https://api.themoviedb.org/3/tv/${dbShow.tmdb_id}/season/${details.number_of_seasons || 1}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
            );
            const season = await epRes.json();
            window = calculateSubscriptionWindow(season.episodes || []);
          }

          const providers = details['watch/providers']?.results?.US?.flatrate || [];
          const service = providers[0]?.provider_name || 'Unknown';

          return {
            ...details,
            window,
            service,
            favorite: dbShow.favorite || false,
            watch_live: dbShow.watch_live || false,
            tmdb_id: dbShow.tmdb_id,
            media_type: dbShow.media_type || 'tv',
          };
        })
      );

      setShows(loaded);
      setLoading(false);
    }

    load();
  }, [userId, isLoaded]);

  const toggleFavorite = async (tmdbId: number, current: boolean) => {
    await fetch('/api/toggle-favorite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId, favorite: !current }),
    });
    setShows(shows.map(s => s.tmdb_id === tmdbId ? { ...s, favorite: !current } : s));
  };

  const toggleWatchLive = async (tmdbId: number, current: boolean) => {
    await fetch('/api/toggle-watch-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId, watchLive: !current }),
    });
    setShows(shows.map(s => s.tmdb_id === tmdbId ? { ...s, watch_live: !current } : s));
  };

  const removeShow = async (tmdbId: number) => {
    if (!confirm('Remove this show?')) return;
    await fetch('/api/remove-show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId }),
    });
    setShows(shows.filter(s => s.tmdb_id !== tmdbId));
  };

  if (!isLoaded) return <div className="p-20 text-center">Loading...</div>;
  if (!userId) return <div className="p-20 text-center text-2xl">Please sign in</div>;

  return (
    <div className="min-h-screen bg-zinc-950 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <RollingCalendar shows={shows} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {shows.map(show => (
            <div key={show.id} className="bg-zinc-900 rounded-3xl overflow-hidden group relative">
              <ShowCard show={show} />

              <div className="p-6 space-y-4">
                <p className="text-emerald-400 font-bold">Cancel {show.window.primaryCancel}</p>

                <div className="flex gap-4 flex-wrap">
                  <button
                    onClick={() => toggleFavorite(show.tmdb_id, show.favorite)}
                    className={`text-3xl transition-all ${show.favorite ? 'text-yellow-400 scale-110' : 'text-zinc-600 hover:text-yellow-400'}`}
                  >
                    ★
                  </button>

                  <button
                    onClick={() => toggleWatchLive(show.tmdb_id, show.watch_live)}
                    className={`text-sm px-5 py-2 rounded-xl border transition-colors ${show.watch_live ? 'bg-emerald-600 text-white border-emerald-600' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                    Watch Live
                  </button>

                  <button
                    onClick={() => removeShow(show.tmdb_id)}
                    className="text-red-400 hover:text-red-300 text-sm px-5 py-2 rounded-xl border border-red-900 hover:bg-red-950 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}