'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateSubscriptionWindow, calculateSubscriptionWindowFromDates } from '@/lib/recommendation';
import { pickPrimaryProvider, getProviderForServiceName } from '@/lib/streaming-providers';
import ShowCard from '@/components/ShowCard';
import RollingCalendar from '@/components/RollingCalendar';
import CancelProvidersSidebar from '@/components/CancelProvidersSidebar';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';

interface DashboardClientProps {
  initialIsPaid: boolean;
  initialCancelAtPeriodEnd?: boolean;
  /** Server-loaded shows so calendar shows services on first paint in all browsers (Firefox, mobile). */
  initialShows?: any[];
}

export default function DashboardClient({
  initialIsPaid,
  initialCancelAtPeriodEnd = false,
  initialShows = [],
}: DashboardClientProps) {
  const { userId, isLoaded } = useAuth();
  const [shows, setShows] = useState<any[]>(initialShows);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(initialIsPaid);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(initialCancelAtPeriodEnd);
  const [cancelling, setCancelling] = useState(false);
  type ViewMode = 'cards' | 'compact' | 'list';
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [draggedId, setDraggedId] = useState<number | null>(null);

  useEffect(() => {
    setIsPaid(initialIsPaid);
    setCancelAtPeriodEnd(initialCancelAtPeriodEnd);
  }, [initialIsPaid, initialCancelAtPeriodEnd]);

  useEffect(() => {
    if (!isLoaded || !userId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        let data: any[] | null = null;
        const { data: sortData, error: sortError } = await supabase
          .from('user_shows')
          .select('*')
          .eq('user_id', userId)
          .order('sort_order', { ascending: true });
        if (sortError) {
          const { data: fallback } = await supabase
            .from('user_shows')
            .select('*')
            .eq('user_id', userId)
            .order('id', { ascending: true });
          data = fallback;
        } else {
          data = sortData;
        }

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

          const flatrate = details['watch/providers']?.results?.US?.flatrate;
          const service = pickPrimaryProvider(flatrate);

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
      } catch (e) {
        console.error('[dashboard] load failed', e);
      } finally {
        setLoading(false);
      }
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

  const handleReorder = async (reordered: any[]) => {
    setShows(reordered);
    try {
      await fetch('/api/shows-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: reordered.map((s) => s.tmdb_id) }),
      });
    } catch (e) {
      console.error('Failed to save order', e);
    }
  };

  const onDragStart = (e: React.DragEvent, tmdbId: number) => {
    setDraggedId(tmdbId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(tmdbId));
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDragEnd = () => setDraggedId(null);
  const onDrop = (e: React.DragEvent, targetTmdbId: number) => {
    e.preventDefault();
    const sourceId = Number(e.dataTransfer.getData('text/plain'));
    if (!sourceId || sourceId === targetTmdbId) return;
    const idx = shows.findIndex((s) => s.tmdb_id === sourceId);
    const targetIdx = shows.findIndex((s) => s.tmdb_id === targetTmdbId);
    if (idx === -1 || targetIdx === -1) return;
    const next = [...shows];
    const [removed] = next.splice(idx, 1);
    next.splice(targetIdx, 0, removed);
    handleReorder(next);
    setDraggedId(null);
  };

  const cancelSubscription = async () => {
    if (!confirm('Cancel at end of billing period? You’ll keep access until then.')) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/cancel-subscription', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel');
      window.location.href = '/canceled-subscription';
      return;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setCancelling(false);
    }
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
          <RollingCalendar shows={shows} loading={loading} />

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mt-10 sm:mt-16 mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold">My Shows ({shows.length})</h2>
            <div className="flex rounded-xl border border-zinc-700 p-1 bg-zinc-900/80">
              {(['cards', 'compact', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    viewMode === mode ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {mode === 'cards' ? 'Cards' : mode === 'compact' ? 'Compact' : 'List'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex shrink-0">
          {isPaid && cancelAtPeriodEnd ? (
            <Link href="/upgrade" className="block w-full sm:w-auto text-center bg-amber-500 text-black px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl font-bold text-sm sm:text-base hover:bg-amber-400 transition-colors">
              Resubscribe →
            </Link>
          ) : isPaid ? (
            <button
              type="button"
              onClick={cancelSubscription}
              disabled={cancelling}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-500 disabled:opacity-70 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl font-bold text-sm sm:text-base"
            >
              {cancelling ? 'Cancelling…' : 'Cancel membership'}
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

        {/* Show Cards / List — draggable to reorder */}
        <div
          className={
            viewMode === 'list'
              ? 'flex flex-col gap-2'
              : viewMode === 'compact'
                ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4'
                : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8'
          }
        >
          {shows.map((show) => {
            const isDragging = draggedId === show.tmdb_id;
            const provider = getProviderForServiceName(show.service);
            const cardContent = (
              <>
                {viewMode !== 'list' && <ShowCard show={show} compact={viewMode === 'compact'} />}
                <div className={viewMode === 'compact' ? 'p-3' : 'p-6'}>
                  <p className={`text-emerald-400 font-bold ${viewMode === 'compact' ? 'text-sm' : ''} flex items-center gap-2 flex-wrap`}>
                    {provider ? (
                      <>
                        <img src={provider.logoUrl} alt="" className="h-5 w-auto object-contain rounded" />
                        <span>Subscribe to {provider.name} in {show.window.primarySubscribe}</span>
                      </>
                    ) : (
                      <span>Subscribe to {show.service} in {show.window.primarySubscribe}</span>
                    )}
                  </p>
                  <p className={`text-zinc-500 text-sm mt-1 ${viewMode === 'compact' ? 'text-xs' : ''}`}>
                    Cancel by {show.window.primaryCancel}
                  </p>
                  <div className={`flex flex-wrap gap-2 sm:gap-4 mt-5 ${viewMode === 'compact' ? 'mt-3' : ''}`}>
                    <button
                      onClick={() => toggleFavorite(show.tmdb_id, show.favorite)}
                      className={`text-2xl sm:text-3xl transition-all ${show.favorite ? 'text-yellow-400 scale-110' : 'text-zinc-600 hover:text-yellow-400'} ${viewMode === 'compact' ? 'text-xl' : ''}`}
                    >
                      ★
                    </button>
                    <button
                      onClick={() => toggleWatchLive(show.tmdb_id, show.watchLive ?? show.watch_live)}
                      disabled={show.window.isComplete}
                      className={`text-sm px-3 py-1.5 sm:px-5 sm:py-2 rounded-xl border transition-colors ${
                        show.watchLive ?? show.watch_live
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : show.window.isComplete
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed line-through'
                            : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                      } ${viewMode === 'compact' ? 'text-xs px-2 py-1' : ''}`}
                    >
                      {show.window.isComplete ? 'Completed' : 'Watch Live'}
                    </button>
                    <button
                      onClick={() => removeShow(show.tmdb_id)}
                      className={`text-red-400 hover:text-red-300 text-sm px-3 py-1.5 sm:px-5 sm:py-2 rounded-xl border border-red-900 hover:bg-red-950 transition-colors ${viewMode === 'compact' ? 'text-xs px-2 py-1' : ''}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </>
            );
            if (viewMode === 'list') {
              return (
                <div
                  key={show.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, show.tmdb_id)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, show.tmdb_id)}
                  onDragEnd={onDragEnd}
                  className={`flex items-center gap-3 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
                >
                  <span className="text-zinc-500 pl-2 shrink-0 select-none" aria-hidden>⋮⋮</span>
                  <Link href={show.media_type === 'movie' ? `/movie/${show.id}` : `/show/${show.id}`} className="min-w-0 flex-1 flex items-center gap-4 py-2 pr-2">
                    <img
                      src={show.poster_path ? `https://image.tmdb.org/t/p/w154${show.poster_path}` : 'https://picsum.photos/id/1015/92/138'}
                      alt={show.title}
                      className="w-12 h-[72px] object-cover rounded-lg shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{show.title}</p>
                      <p className="text-emerald-400 text-sm">
                        {provider ? (
                          <span className="flex items-center gap-1.5"><img src={provider.logoUrl} alt="" className="h-4 w-auto object-contain rounded" /> {provider.name} · Cancel by {show.window.primaryCancel}</span>
                        ) : (
                          <span>{show.service} · Cancel by {show.window.primaryCancel}</span>
                        )}
                      </p>
                    </div>
                  </Link>
                  <div className="flex flex-wrap gap-2 items-center shrink-0 pr-3">
                    <button onClick={() => toggleFavorite(show.tmdb_id, show.favorite)} className={`text-xl transition-all ${show.favorite ? 'text-yellow-400 scale-110' : 'text-zinc-600 hover:text-yellow-400'}`}>★</button>
                    <button onClick={() => toggleWatchLive(show.tmdb_id, show.watchLive ?? show.watch_live)} disabled={show.window.isComplete} className={`text-sm px-3 py-1.5 rounded-xl border transition-colors ${show.watchLive ?? show.watch_live ? 'bg-emerald-600 text-white border-emerald-600' : show.window.isComplete ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-zinc-700' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}>{show.window.isComplete ? 'Completed' : 'Watch Live'}</button>
                    <button onClick={() => removeShow(show.tmdb_id)} className="text-red-400 hover:text-red-300 text-sm px-3 py-1.5 rounded-xl border border-red-900 hover:bg-red-950">Remove</button>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={show.id}
                draggable
                onDragStart={(e) => onDragStart(e, show.tmdb_id)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, show.tmdb_id)}
                onDragEnd={onDragEnd}
                className={`bg-zinc-900 rounded-3xl overflow-hidden group relative cursor-grab active:cursor-grabbing ${viewMode === 'compact' ? 'rounded-2xl' : ''} ${isDragging ? 'opacity-50' : ''}`}
              >
                <span className="absolute top-2 left-2 z-10 text-zinc-500 bg-black/60 rounded px-1.5 py-0.5 text-sm select-none pointer-events-none">⋮⋮</span>
                {cardContent}
              </div>
            );
          })}
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
