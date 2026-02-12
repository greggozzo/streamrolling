// app/show/[id]/page.tsx
import { getShowDetails, getNextSeasonEpisodes } from '@/lib/tmdb';
import { calculateSubscriptionWindow, calculateSubscriptionWindowFromDates } from '@/lib/recommendation';
import { getFlatrateFromRegions, pickPrimaryProvider, getProviderForServiceName } from '@/lib/streaming-providers';
import Image from 'next/image';
import AddToMyShowsButton from '@/components/AddToMyShowsButton';

export default async function ShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const show = await getShowDetails(id);
  const episodes = await getNextSeasonEpisodes(id);
  const window = episodes.length > 0
    ? calculateSubscriptionWindow(episodes)
    : calculateSubscriptionWindowFromDates(show.first_air_date, show.last_air_date);

  const flatrate = getFlatrateFromRegions(show['watch/providers']);
  const serviceName = pickPrimaryProvider(flatrate);
  const provider = getProviderForServiceName(serviceName);

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12">
        {/* Poster */}
        <div>
          <Image
            src={`https://image.tmdb.org/t/p/w780${show.poster_path}`}
            alt={show.name}
            width={600}
            height={900}
            className="rounded-3xl shadow-2xl"
          />
        </div>

        {/* Content */}
        <div className="space-y-10">
          <div>
            <h1 className="text-5xl font-bold mb-2">{show.name}</h1>
            <p className="text-zinc-400 text-lg">{show.overview?.slice(0, 180)}...</p>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-8 space-y-10">
            {/* Primary Recommendation */}
            <div>
              <p className="uppercase tracking-widest text-emerald-400 text-sm mb-1">Primary Recommendation</p>
              <p className="text-4xl font-bold text-emerald-400 flex items-center gap-3 flex-wrap">
                Subscribe to {provider ? (
                  <>
                    <Image src={provider.logoUrl} alt={provider.name} width={32} height={32} className="rounded object-contain h-8 w-auto" unoptimized />
                    <span>{provider.name}</span>
                  </>
                ) : (
                  <span>{serviceName}</span>
                )}{' '}
                in {window.primarySubscribe}
              </p>
              <p className="text-zinc-400 mt-2">{window.primaryNote}</p>
              <p className="text-sm text-zinc-500 mt-1">Cancel by {window.primaryCancel}</p>
            </div>

            {/* Alternative: watch live this month */}
            {!window.isComplete && window.secondarySubscribe && (
              <div className="border-t border-zinc-700 pt-8">
                <p className="uppercase tracking-widest text-zinc-500 text-sm mb-1">Alternative</p>
                <p className="text-3xl font-bold flex items-center gap-3 flex-wrap">
                  Subscribe to {provider ? (
                    <>
                      <Image src={provider.logoUrl} alt={provider.name} width={28} height={28} className="rounded object-contain h-7 w-auto" unoptimized />
                      <span>{provider.name}</span>
                    </>
                  ) : (
                    <span>{serviceName}</span>
                  )}{' '}
                  in {window.secondarySubscribe}
                </p>
                <p className="text-zinc-500 text-sm mt-1">Watch new episodes as they air</p>
              </div>
            )}

            <AddToMyShowsButton tmdbId={show.id} />
          </div>
        </div>
      </div>
    </div>
  );
}