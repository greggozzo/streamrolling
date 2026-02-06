// app/api/toggle-watch-live/route.ts
import { getAuth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { userId } = getAuth(request);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { tmdbId, watchLive } = await request.json();

  await supabase
    .from('user_shows')
    .update({ watch_live: watchLive })
    .eq('user_id', userId)
    .eq('tmdb_id', tmdbId);

  return Response.json({ success: true });
}