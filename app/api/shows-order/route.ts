import { getAuth } from '@clerk/nextjs/server';
import { getSupabaseForUserShows } from '@/lib/supabase-server';

/** POST body: { order: number[] } — tmdb_ids in the desired dashboard order. */
export async function POST(request: Request) {
  const { userId } = await getAuth(request);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { order?: number[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const order = body.order;
  if (!Array.isArray(order) || order.some((id) => typeof id !== 'number')) {
    return Response.json({ error: 'Body must be { order: number[] }' }, { status: 400 });
  }

  const supabase = getSupabaseForUserShows();
  for (let i = 0; i < order.length; i++) {
    const { error } = await supabase
      .from('user_shows')
      .update({ sort_order: i })
      .eq('user_id', userId)
      .eq('tmdb_id', order[i]);
    if (error) {
      // Column may not exist until migration is run; don't break the app
      console.warn('[shows-order]', error.message);
      return Response.json({ success: true, persisted: false });
    }
  }
  return Response.json({ success: true, persisted: true });
}
