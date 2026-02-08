// app/api/add-show/route.ts
import { getAuth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  const { userId } = getAuth(request);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { tmdbId, mediaType = 'tv' } = await request.json();

  // Get user from Clerk to check if paid
  const user = await clerkClient.users.getUser(userId);
  const isPaid = (user.privateMetadata as any)?.isPaid === true;

  // Free tier limit only applies to non-paid users
  if (!isPaid) {
    const { data: existing } = await supabase
      .from('user_shows')
      .select('*')
      .eq('user_id', userId);

    if (existing && existing.length >= 5) {
      return Response.json({ error: 'Free tier limit reached (5 shows). Upgrade for unlimited.' }, { status: 402 });
    }
  }

  const { error } = await supabase
    .from('user_shows')
    .insert({ user_id: userId, tmdb_id: tmdbId, media_type: mediaType });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ success: true });
}