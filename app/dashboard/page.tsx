 'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateSubscriptionWindow, calculateSubscriptionWindowFromDates } from '@/lib/recommendation';
import ShowCard from '@/components/ShowCard';
import RollingCalendar from '@/components/RollingCalendar';
import CancelProvidersSidebar from '@/components/CancelProvidersSidebar';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';

export default function Dashboard() {
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // publicMetadata is readable on the frontend; privateMetadata is server-only
  const isPaid = (user?.publicMetadata as Record<string, unknown> | undefined)?.isPaid === true;

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
        (data || []).map(async (dbShow: any, index: number) => {
          const isMovie = dbShow.media_type === 'movie';
          const endpoint = isMovie 
            ? `https://api.themoviedb.org/3/movie/${dbShow.tmdb_id}`
            : `https://api.themoviedb.org/3/tv/${dbShow.tmdb_id}`;

          const res = await fetch(`${endpoint}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&append_to_response=watch/providers`);
          const details = await res.json();

          let window: { primarySubscribe: string; primaryCancel: string; secondarySubscribe?: string | null; isComplete: boolean };
          if (isMovie) {
            window = calculateSubscriptionWindowFromDates(details.release_date);
          } else {
            const epRes = await fetch(
              `https://api.themoviedb.org/3/tv/${dbShow.tmdb_id}/season/${details.number_of_seasons || 1}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
            );
            const season = await epRes.json();
            const episodes = season.episodes || [];
            window = episodes.length > 0
              ? calculateSubscriptionWindow(episodes)
              : calculateSubscriptionWindowFromDates(details.first_air_date, details.last_air_date);
          }

          const providers = details['watch/providers']?.results?.US?.flatrate || [];
          const service = providers[0]?.provider_name || 'Unknown';

          return {
            ...details,
            title: details.title || details.name || 'Unknown',
            window,
            service,
            favorite: !!dbShow.favorite,
            watchLive: !!dbShow.watch_live,
            tmdb_id: dbShow.tmdb_id,
            addedOrder: index,
          };
        })
      );

      setShows(loaded);
      setLoading(false);
    }

    load();
  }, [userId, isLoaded]);

  const removeAllShows = async () => {
    if (!confirm('Remove ALL shows? This cannot be undone.')) return;
    await supabase.from('user_shows').delete().eq('user_id', userId);
    setShows([]);
  };

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
    setShows(shows.map(s => s.tmdb_id === tmdbId ? { ...s, watchLive: !current } : s));
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
    <div className="min-h-screen bg-zinc-950 py-6 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row gap-8 lg:gap-10">
        {/* Main content first on mobile, left column on desktop */}
        <div className="min-w-0 flex-1 order-1">
        {/* Search Bar */}
        <div className="mb-6 sm:mb-10">
          <SearchBar />
        </div>

        {/* Rolling Plan */}
        <RollingCalendar shows={shows} />

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mt-10 sm:mt-16 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold">My Shows ({shows.length})</h2>

          <div className="flex shrink-0">
          {isPaid ? (
            <button
              onClick={() => window.location.href = 'https://billing.stripe.com/p/login/test_...'} // replace with your Stripe Customer Portal URL
              className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl font-bold text-sm sm:text-base"
            >
              Cancel
            </button>
          ) : (
            <Link href="/upgrade" className="block w-full sm:w-auto text-center bg-emerald-500 text-black px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl font-bold text-sm sm:text-base">
              Upgrade $2.99/mo →
            </Link>
          )}
          </div>
        </div>

        {/* Remove All Button */}
        {shows.length > 0 && (
          <button
            onClick={removeAllShows}
            className="mb-6 sm:mb-8 text-red-400 hover:text-red-300 text-sm underline"
          >
            Remove All Shows
          </button>
        )}

        {/* Show Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
          {shows.map(show => (
            <div key={show.id} className="bg-zinc-900 rounded-3xl overflow-hidden group relative">
              <ShowCard show={show} />

              <div className="p-6">
                <p className="text-emerald-400 font-bold">
                  Cancel {show.service} by {show.window.primaryCancel}
                </p>

                <div className="flex gap-4 mt-5">
                  <button
                    onClick={() => toggleFavorite(show.tmdb_id, show.favorite)}
                    className={`text-3xl transition-all ${show.favorite ? 'text-yellow-400 scale-110' : 'text-zinc-600 hover:text-yellow-400'}`}
                  >
                    ★
                  </button>

                  <button
                    onClick={() => toggleWatchLive(show.tmdb_id, show.watchLive ?? show.watch_live)}
                    disabled={show.window.isComplete}
                    className={`text-sm px-5 py-2 rounded-xl border transition-colors ${
                      show.watchLive ?? show.watch_live
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : show.window.isComplete
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed line-through'
                          : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {show.window.isComplete ? 'Completed' : 'Watch Live'}
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

        {/* Cancel subscription: sidebar on desktop, grid below main on mobile */}
        <div className="order-2 w-full lg:w-auto">
          <CancelProvidersSidebar />
        </div>
      </div>
    </div>
  );
}