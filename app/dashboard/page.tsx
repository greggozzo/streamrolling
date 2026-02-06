// app/dashboard/page.tsx
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { getShowDetails, getNextSeasonEpisodes } from '@/lib/tmdb';
import { calculateSubscriptionWindow } from '@/lib/recommendation';
import ShowCard from '@/components/ShowCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const { userId } = auth();

  if (!userId) {
    return <div className="p-12 text-center text-2xl">Please sign in to view your shows</div>;
  }

  // ← everything below only runs if userId exists
  const { data: saved } = await supabase
    .from('user_shows')
    .select('tmdb_id')
    .eq('user_id', userId);

  const tmdbIds = saved?.map((s: any) => s.tmdb_id) || [];

  const shows = await Promise.all(
    tmdbIds.map(async (id: number) => {
      const details = await getShowDetails(id.toString());
      const episodes = await getNextSeasonEpisodes(id.toString());
      const window = calculateSubscriptionWindow(episodes);
      return { ...details, window };
    })
  );

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
            <p className="text-emerald-400 mt-2">{tmdbIds.length} shows saved</p>
          </div>
          <Link href="/upgrade" className="bg-emerald-500 text-black px-8 py-3 rounded-2xl font-bold">
            Upgrade $2.99/mo →
          </Link>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <p className="text-2xl text-zinc-400">No shows saved yet. Search and add some!</p>
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