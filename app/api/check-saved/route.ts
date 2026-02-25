// app/api/check-saved/route.ts
import { getAuth } from '@clerk/nextjs/server';
import { getSupabaseForUserShows } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { userId } = await getAuth(request);
  if (!userId) return Response.json({ saved: false });

  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get('tmdbId');
  const supabase = getSupabaseForUserShows();

  const { data } = await supabase
    .from('user_shows')
    .select('id')
    .eq('user_id', userId)
    .eq('tmdb_id', Number(tmdbId));

  return Response.json({ saved: data && data.length > 0 });
}