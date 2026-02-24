// app/api/toggle-favorite/route.ts
import { getAuth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { userId } = await getAuth(request);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { tmdbId, favorite } = await request.json();

  const { error } = await supabase
    .from('user_shows')
    .update({ favorite })
    .eq('user_id', userId)
    .eq('tmdb_id', tmdbId);

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ success: true });
}