/**
 * GET: return current user's shows (same shape as loadUserShows).
 * Used by DashboardClient when RLS is enabled (no client-side Supabase for user_shows).
 */
import { getAuth } from '@clerk/nextjs/server';
import { loadUserShows } from '@/lib/load-user-shows';

export async function GET(request: Request) {
  const { userId } = await getAuth(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const shows = await loadUserShows(userId);
  return Response.json(shows, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
