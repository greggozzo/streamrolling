// app/show/[id]/page.tsx
import { getShowDetails, getNextSeasonEpisodes } from '@/lib/tmdb';
import { calculateSubscriptionWindow } from '@/lib/recommendation';
import Image from 'next/image';
import AddToMyShowsButton from '@/components/AddToMyShowsButton';

export default async function ShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const show = await getShowDetails(id);
  const episodes = await getNextSeasonEpisodes(id);
  const window = calculateSubscriptionWindow(episodes);

  // Get primary streaming service (first subscription provider)
  const providers = show['watch/providers']?.results?.US?.flatrate || [];
  const primaryService = providers[0] || { provider_name: 'the streaming service' };

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12">
        <div>
          <Image
            src={`https://image.tmdb.org/t/p/w780${show.poster_path}`}
            alt={show.name}
            width={600}
            height={900}
            className="rounded-3xl shadow-2xl"
          />
        </div>

        <div className="space-y-10">
          <div>
            <h1 className="text-5xl font-bold mb-2">{show.name}</h1>
            <p className="text-zinc-400 text-lg">{show.overview?.slice(0, 180)}...</p>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-8 space-y-10">
            <div>
              <p className="uppercase tracking-widest text-emerald-400 text-sm mb-1">PRIMARY RECOMMENDATION</p>
              <p className="text-4xl font-bold text-emerald-400">
                {window.primaryLabel} {window.primarySubscribe}
              </p>
              <p className="text-zinc-400 mt-2">{window.primaryNote}</p>
              <p className="text-sm text-zinc-500 mt-1">Cancel {window.primaryCancel}</p>
            </div>
         
	    {!window.isComplete && window.secondarySubscribe && (
 	     <div className="border-t border-zinc-700 pt-8">
               <p className="uppercase tracking-widest text-zinc-500 text-sm mb-1">Alternative (watch live)</p>
               <p className="text-3xl font-bold">
                 {window.isCurrentlyAiring ? 'Subscribe Now' : `Subscribe in ${window.secondarySubscribe}`}
               </p>
             </div>

            {/* Updated button with service name */}
            <a
              href="#" // ← we'll replace with real affiliate link later
              target="_blank"
              className="mt-6 block w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xl py-5 rounded-2xl text-center transition-colors"
            >
              Subscribe to {primaryService.provider_name} for {window.primarySubscribe}
            </a>

            <AddToMyShowsButton tmdbId={show.id} />
          </div>
        </div>
      </div>
    </div>
  );
}