/**
 * POST: delete all user_shows for the current user.
 * Used by DashboardClient "Remove all" when RLS is enabled.
 */
import { getAuth } from '@clerk/nextjs/server';
import { getSupabaseForUserShows } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const { userId } = await getAuth(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseForUserShows();
  const { error } = await supabase.from('user_shows').delete().eq('user_id', userId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
