// app/movie/[id]/page.tsx
import { getMovieDetails } from '@/lib/tmdb';
import Image from 'next/image';
import AddToMyShowsButton from '@/components/AddToMyShowsButton';

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await getMovieDetails(id);

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
    : 'https://picsum.photos/id/1015/600/900';

  // Get primary streaming service
  const providers = movie['watch/providers']?.results?.US?.flatrate || [];
  const primaryService = providers[0]?.provider_name || 'Unknown Service';

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12">
        {/* Poster */}
        <div>
          <Image
            src={posterUrl}
            alt={movie.title}
            width={600}
            height={900}
            className="rounded-3xl shadow-2xl"
            unoptimized
          />
        </div>

        {/* Content */}
        <div className="space-y-10">
          <div>
            <h1 className="text-5xl font-bold mb-2">{movie.title}</h1>
            {movie.release_date && <p className="text-zinc-400">Released: {movie.release_date}</p>}
            {movie.vote_average && <p className="text-emerald-400">Rating: {movie.vote_average.toFixed(1)} / 10</p>}
            <p className="text-zinc-400 text-lg mt-4">{movie.overview}</p>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-8 space-y-8">
            <div>
              <p className="uppercase tracking-widest text-emerald-400 text-sm mb-1">RECOMMENDATION</p>
              <p className="text-4xl font-bold text-emerald-400">Watch now</p>
            </div>

            {/* Subscribe button with service name */}
            <a
              href="#" // ← we'll replace with real affiliate link later
              target="_blank"
              className="mt-6 block w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xl py-5 rounded-2xl text-center transition-colors"
            >
              Subscribe to {primaryService} →
            </a>

            <AddToMyShowsButton tmdbId={movie.id} mediaType="movie" />
          </div>
        </div>
      </div>
    </div>
  );
}