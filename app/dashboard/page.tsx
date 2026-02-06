'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getShowDetails, getNextSeasonEpisodes } from '@/lib/tmdb';
import { calculateSubscriptionWindow } from '@/lib/recommendation';
import ShowCard from '@/components/ShowCard';
import Link from 'next/link';

export default function Dashboard() {
  const { userId, isLoaded } = useAuth();
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      setLoading(false);
      return;
    }

    async function load() {
      const { data } = await supabase
        .from('user_shows')
        .select('tmdb_id')
        .eq('user_id', userId);

      const ids = data?.map((s: any) => s.tmdb_id) || [];

      const loaded = await Promise.all(
        ids.map(async (id: number) => {
          const details = await getShowDetails(id.toString());
          const episodes = await getNextSeasonEpisodes(id.toString());
          const window = calculateSubscriptionWindow(episodes);
          return { ...details, window };
        })
      );

      setShows(loaded);
      setLoading(false);
    }

    load();
  }, [userId, isLoaded]);

  if (!isLoaded) return <div className="p-20 text-center text-xl">Loading...</div>;
  if (!userId) return <div className="p-20 text-center text-2xl">Please sign in to view your shows</div>;

  const grouped = shows.reduce((acc: any, show: any) => {
    const month = show.window.primarySubscribe;
    if (!acc[month]) acc[month] = [];
    acc[month].push(show);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-zinc-950 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-5xl font-bold">My Shows</h1>
            <p className="text-emerald-400 mt-2">{shows.length} shows saved</p>
          </div>
          <Link href="/upgrade" className="bg-emerald-500 text-black px-8 py-3 rounded-2xl font-bold">
            Upgrade $2.99/mo →
          </Link>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <p className="text-2xl text-zinc-400">No shows saved yet.</p>
        ) : (
          <div className="space-y-16">
            {Object.entries(grouped).map(([month, monthShows]: [string, any]) => (
              <div key={month}>
                <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b border-emerald-900 pb-3">
                  {month} — Binge these shows
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                  {monthShows.map((show: any) => (
                    <div key={show.id} className="bg-zinc-900 rounded-3xl overflow-hidden">
                      <ShowCard show={show} />
                      <div className="p-6">
                        <p className="text-emerald-400 font-bold">Cancel {show.window.primaryCancel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}