// app/movie/[id]/page.tsx
import { getShowDetails } from '@/lib/tmdb';           // reuse same function
import Image from 'next/image';
import AddToMyShowsButton from '@/components/AddToMyShowsButton';

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await getShowDetails(id);               // TMDb uses same endpoint for movies

  const providers = movie['watch/providers']?.results?.US?.flatrate || [];
  const primaryService = providers[0]?.provider_name || 'the service';

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12">
        <div>
          <Image
            src={`https://image.tmdb.org/t/p/w780${movie.poster_path}`}
            alt={movie.title}
            width={600}
            height={900}
            className="rounded-3xl shadow-2xl"
          />
        </div>

        <div className="space-y-10">
          <div>
            <h1 className="text-5xl font-bold mb-2">{movie.title}</h1>
            <p className="text-zinc-400 text-lg">{movie.overview?.slice(0, 180)}...</p>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-8">
            <p className="uppercase tracking-widest text-emerald-400 text-sm mb-2">RECOMMENDATION</p>
            <p className="text-4xl font-bold text-emerald-400">Watch now / Subscribe this month</p>

            <a
              href="#" 
              target="_blank"
              className="mt-8 block w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xl py-5 rounded-2xl text-center"
            >
              Subscribe to {primaryService} →
            </a>

            <AddToMyShowsButton tmdbId={movie.id} />
          </div>
        </div>
      </div>
    </div>
  );
}