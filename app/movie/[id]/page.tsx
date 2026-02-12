// app/movie/[id]/page.tsx
import { getMovieDetails } from '@/lib/tmdb';
import { calculateSubscriptionWindowFromDates } from '@/lib/recommendation';
import { getFlatrateFromRegions, pickPrimaryProvider, getProviderForServiceName } from '@/lib/streaming-providers';
import Image from 'next/image';
import AddToMyShowsButton from '@/components/AddToMyShowsButton';

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await getMovieDetails(id);

  const window = calculateSubscriptionWindowFromDates(movie.release_date);
  const flatrate = getFlatrateFromRegions(movie['watch/providers']);
  const serviceName = pickPrimaryProvider(flatrate);
  const provider = getProviderForServiceName(serviceName);
  const hasKnownService = serviceName !== 'Unknown';

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
    : 'https://picsum.photos/id/1015/600/900';

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
            {typeof movie.vote_average === 'number' && movie.vote_average > 0 && (
              <p className="text-emerald-400">Rating: {movie.vote_average.toFixed(1)} / 10</p>
            )}
            <p className="text-zinc-400 text-lg mt-4">{movie.overview}</p>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-8 space-y-10">
            <div>
              <p className="uppercase tracking-widest text-emerald-400 text-sm mb-1">Primary Recommendation</p>
              <p className="text-4xl font-bold text-emerald-400 flex items-center gap-3 flex-wrap">
                {hasKnownService ? (
                  <>
                    Subscribe to{' '}
                    {provider ? (
                      <>
                        <Image src={provider.logoUrl} alt={provider.name} width={32} height={32} className="rounded object-contain h-8 w-auto" unoptimized />
                        <span>{provider.name}</span>
                      </>
                    ) : (
                      <span>{serviceName}</span>
                    )}{' '}
                    in {window.primarySubscribe}
                  </>
                ) : (
                  <>Subscribe in {window.primarySubscribe}</>
                )}
              </p>
              <p className="text-zinc-400 mt-2">{window.primaryNote}</p>
              {!hasKnownService && (
                <p className="text-sm text-zinc-500 mt-1">Streaming service not yet listed for this title on TMDB.</p>
              )}
              <p className="text-sm text-zinc-500 mt-1">Cancel by {window.primaryCancel}</p>
            </div>

            <AddToMyShowsButton tmdbId={movie.id} mediaType="movie" />
          </div>
        </div>
      </div>
    </div>
  );
}