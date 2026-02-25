// app/page.tsx
import { getTrendingTV } from '@/lib/tmdb';
import ShowCard from '@/components/ShowCard';
import SearchBar from '@/components/SearchBar';

export default async function Home() {
  const trending = await getTrendingTV();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-900 py-32 text-center text-white">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-6xl md:text-7xl font-bold tracking-tighter mb-6 text-white">
            Never overpay for streaming again
          </h1>
          <p className="text-2xl text-white/90 mb-10">
            Pick your shows → we tell you the exact month to subscribe
          </p>
          <SearchBar />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold mb-8 flex items-center gap-3">
          🔥 Trending right now
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {trending.map((show: any) => (
            <ShowCard key={show.id} show={show} />
          ))}
        </div>
      </div>
    </div>
  );
}
