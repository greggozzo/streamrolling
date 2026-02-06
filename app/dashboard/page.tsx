'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateSubscriptionWindow } from '@/lib/recommendation';
import ShowCard from '@/components/ShowCard';
import Link from 'next/link';

// Dynamic 12 months starting from current month
const getNext12Months = () => {
  const months = [];
  let date = new Date();
  for (let i = 0; i < 12; i++) {
    months.push(date.toLocaleString('default', { month: 'short', year: 'numeric' }));
    date.setMonth(date.getMonth() + 1);
  }
  return months;
};

export default function Dashboard() {
  const { userId, isLoaded } = useAuth();
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const months = useMemo(() => getNext12Months(), []);

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
          const res = await fetch(
            `https://api.themoviedb.org/3/tv/${dbShow.tmdb_id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&append_to_response=watch/providers`
          );
          const details = await res.json();

          const epRes = await fetch(
            `https://api.themoviedb.org/3/tv/${dbShow.tmdb_id}/season/${details.number_of_seasons || 1}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
          );
          const season = await epRes.json();

          const window = calculateSubscriptionWindow(season.episodes || []);
          const providers = details['watch/providers']?.results?.US?.flatrate || [];
          const service = providers[0]?.provider_name || 'Unknown';

          return {
            ...details,
            window,
            service,
            favorite: dbShow.favorite || false,
            tmdb_id: dbShow.tmdb_id,
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

  const removeShow = async (tmdbId: number) => {
    if (!confirm('Remove this show?')) return;
    await fetch('/api/remove-show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId }),
    });
    setShows(shows.filter(s => s.tmdb_id !== tmdbId));
  };

  // Build rolling plan: favorites first, then shift others if conflict
  const calendar: Record<string, any> = {};

  const favorites = shows.filter(s => s.favorite);
  const normals = shows.filter(s => !s.favorite);

  [...favorites, ...normals].forEach(show => {
    let month = show.window.primarySubscribe;
    let attempts = 0;

    while (calendar[month] && attempts < 12) {
      const idx = months.indexOf(month);
      month = months[(idx + 1) % 12];
      attempts++;
    }

    if (!calendar[month]) {
      calendar[month] = show;
    }
  });

  if (!isLoaded) return <div className="p-20 text-center">Loading...</div>;
  if (!userId) return <div className="p-20 text-center text-2xl">Please sign in</div>;

  return (
    <div className="min-h-screen bg-zinc-950 py-12">
      <div className="max-w-7xl mx-auto px-6">

        {/* Rolling Plan Table */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Your Rolling Plan</h2>
          <div className="bg-zinc-900 rounded-3xl p-8 grid grid-cols-12 gap-3">
            {months.map(month => {
              const entry = calendar[month];
              return (
                <div key={month} className="text-center">
                  <div className="text-xs text-zinc-500 mb-2 font-mono">{month}</div>
                  {entry ? (
                    <div className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-4 px-5 rounded-2xl transition-all">
                      {entry.service}
                    </div>
                  ) : (
                    <div className="text-zinc-600 text-sm py-4 border border-dashed border-zinc-700 rounded-2xl">
                      Open
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* My Shows Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {shows.map(show => (
            <div key={show.id} className="bg-zinc-900 rounded-3xl overflow-hidden group relative">
              <ShowCard show={show} />

              <div className="p-6">
                <div className="flex justify-between items-center">
                  <p className="text-emerald-400 font-bold">Cancel {show.window.primaryCancel}</p>

                  <div className="flex gap-4">
                    <button
                      onClick={() => toggleFavorite(show.tmdb_id, show.favorite)}
                      className={`text-3xl transition-all ${show.favorite ? 'text-yellow-400 scale-110' : 'text-zinc-600 hover:text-yellow-400'}`}
                    >
                      ★
                    </button>

                    <button
                      onClick={() => removeShow(show.tmdb_id)}
                      className="text-red-400 hover:text-red-300 text-sm px-4 py-1 rounded-xl border border-red-900 hover:bg-red-950 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}