'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildRollingPlan } from '@/lib/planner';
import { getProviderForServiceName } from '@/lib/streaming-providers';
import ShowCard from '@/components/ShowCard';
import RollingPlanTooltips from './RollingPlanTooltips';
import RollingPlanGridClient from './RollingPlanGridClient';
import CancelProvidersSidebar from '@/components/CancelProvidersSidebar';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';

import type { InitialPlanPayload } from '@/components/RollingCalendar';

function planToPayload(shows: any[]): InitialPlanPayload | null {
  if (shows.length === 0) return null;
  const normalized = shows.map((s, i) => ({
    ...s,
    watchLive: s.watchLive ?? s.watch_live ?? false,
    favorite: !!s.favorite,
    addedOrder: s.addedOrder ?? i,
  }));
  const { months, plan } = buildRollingPlan(normalized);
  return {
    months,
    plan: Object.fromEntries(
      Object.entries(plan).map(([k, v]) => [
        k,
        { service: v.service, alsoWatchLive: v.alsoWatchLive },
      ])
    ),
  };
}

type PlanView = 'all' | 'favorites' | 'watch_live';

interface DashboardClientProps {
  initialIsPaid: boolean;
  initialCancelAtPeriodEnd?: boolean;
  initialShows?: any[];
  initialPlan?: InitialPlanPayload | null;
  initialPlanFavorites?: InitialPlanPayload | null;
  initialPlanWatchLive?: InitialPlanPayload | null;
}

const PLAN_VIEW_KEY = 'streamrolling-plan-view';

export default function DashboardClient({
  initialIsPaid,
  initialCancelAtPeriodEnd = false,
  initialShows = [],
  initialPlan = null,
  initialPlanFavorites = null,
  initialPlanWatchLive = null,
}: DashboardClientProps) {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [shows, setShows] = useState<any[]>(initialShows);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(initialIsPaid);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(initialCancelAtPeriodEnd);
  const [cancelling, setCancelling] = useState(false);
  type ViewMode = 'cards' | 'compact' | 'list';
  const VIEW_MODE_KEY = 'streamrolling-dashboard-view';
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const [planView, setPlanView] = useState<PlanView>(() => {
    if (typeof window === 'undefined') return 'all';
    const s = localStorage.getItem(PLAN_VIEW_KEY);
    return s === 'favorites' || s === 'watch_live' ? s : 'all';
  });
  const setPlanViewPersisted = (v: PlanView) => {
    setPlanView(v);
    try {
      if (typeof window !== 'undefined') localStorage.setItem(PLAN_VIEW_KEY, v);
    } catch {}
  };

  const currentPlan = useMemo(() => {
    if (planView === 'all') return initialPlan;
    if (planView === 'favorites') {
      if (initialPlanFavorites) return initialPlanFavorites;
      const favs = shows.filter((s) => s.favorite === true);
      return planToPayload(favs);
    }
    if (planView === 'watch_live') {
      if (initialPlanWatchLive) return initialPlanWatchLive;
      const live = shows.filter(
        (s) => (s.watchLive === true || s.watch_live === true) && !s.window?.isComplete
      );
      return planToPayload(live);
    }
    return null;
  }, [planView, initialPlan, initialPlanFavorites, initialPlanWatchLive, shows]);

  const planTitle =
    planView === 'all'
      ? 'Your Rolling Plan'
      : planView === 'favorites'
        ? 'Your Rolling Plan (Favorites)'
        : 'Your Rolling Plan (Watch live)';

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(VIEW_MODE_KEY) : null;
      if (saved === 'cards' || saved === 'compact' || saved === 'list') setViewMode(saved);
    } catch {
      // ignore
    }
  }, []);

  const setViewModePersisted = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      if (typeof window !== 'undefined') localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // ignore
    }
  };

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
        const res = await fetch('/api/my-shows', { cache: 'no-store' });
        if (!res.ok) {
          setShows([]);
          return;
        }
        const loaded = await res.json();
        setShows(Array.isArray(loaded) ? loaded : []);
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
    const res = await fetch('/api/my-shows/remove-all', { method: 'POST' });
    if (res.ok) {
      setShows([]);
      router.refresh();
    }
  };

  const toggleFavorite = async (tmdbId: number, current: boolean) => {
    await fetch('/api/toggle-favorite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId, favorite: !current }),
    });
    setShows(shows.map(s => s.tmdb_id === tmdbId ? { ...s, favorite: !current } : s));
    router.refresh();
  };

  const toggleWatchLive = async (tmdbId: number, current: boolean) => {
    await fetch('/api/toggle-watch-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId, watchLive: !current }),
    });
    setShows(shows.map(s => s.tmdb_id === tmdbId ? { ...s, watchLive: !current } : s));
    router.refresh();
  };

  const removeShow = async (tmdbId: number) => {
    if (!confirm('Remove this show?')) return;
    await fetch('/api/remove-show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId }),
    });
    setShows(shows.filter(s => s.tmdb_id !== tmdbId));
    router.refresh();
  };

  const handleReorder = async (reordered: any[]) => {
    setShows(reordered);
    try {
      await fetch('/api/shows-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: reordered.map((s) => s.tmdb_id) }),
      });
      router.refresh();
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

        {/* Rolling Plan — view switcher (All | Favorites | Watch live) + grid */}
          <div className="relative min-w-0">
            {shows.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(
                    [
                      { id: 'all' as const, label: 'Overall' },
                      { id: 'favorites' as const, label: 'Favorites' },
                      { id: 'watch_live' as const, label: 'Watch live' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPlanViewPersisted(id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        planView === id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {currentPlan ? (
                  <div className="relative min-w-0">
                    <div className="pointer-events-none">
                      <RollingPlanGridClient plan={currentPlan} title={planTitle} />
                    </div>
                    <RollingPlanTooltips
                      shows={
                        planView === 'all'
                          ? shows
                          : planView === 'favorites'
                            ? shows.filter((s) => s.favorite)
                            : shows.filter(
                                (s) =>
                                  (s.watchLive ?? s.watch_live) && !s.window?.isComplete
                              )
                      }
                      plan={currentPlan}
                    />
                  </div>
                ) : (
                  <div className="mb-12 sm:mb-16">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">{planTitle}</h2>
                    <div className="bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8">
                      <p className="text-zinc-500 text-sm text-center py-8">
                        {planView === 'favorites'
                          ? 'Star some shows as favorites to see a favorites-only plan.'
                          : planView === 'watch_live'
                            ? 'Mark shows as Watch live to see a watch-live-only plan.'
                            : 'Add shows above to see your rolling plan.'}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="mb-12 sm:mb-16">
                <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Your Rolling Plan</h2>
                <div className="bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8">
                  <p className="text-zinc-500 text-sm text-center py-8">Add shows above to see your rolling plan.</p>
                </div>
              </div>
            )}
          </div>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mt-10 sm:mt-16 mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold">My Shows ({shows.length})</h2>
            <div className="flex rounded-xl border border-zinc-700 p-1 bg-zinc-900/80">
              {(['cards', 'compact', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewModePersisted(mode)}
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
                  <Link href={(show.media_type === 'movie' ? '/movie/' : '/show/') + (show.id ?? show.tmdb_id)} className="min-w-0 flex-1 flex items-center gap-4 py-2 pr-2">
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
