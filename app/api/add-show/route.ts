// app/api/add-show/route.ts
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tmdbId, mediaType = 'tv' } = await request.json();

  // Read isPaid from privateMetadata (Clerk injects it into the session)
  const isPaid = (auth().sessionClaims?.privateMetadata as any)?.isPaid === true;

  console.log(`User ${userId} → isPaid: ${isPaid}`);

  // Free tier limit only for non-paid users
  if (!isPaid) {
    const { data: existing } = await supabase
      .from('user_shows')
      .select('id')
      .eq('user_id', userId);

    if (existing && existing.length >= 5) {
      return Response.json({ error: 'Free tier limit reached (5 shows). Upgrade for unlimited.' }, { status: 402 });
    }
  }

  // Save the show
  const { error } = await supabase
    .from('user_shows')
    .insert({
      user_id: userId,
      tmdb_id: tmdbId,
      media_type: mediaType,
    });

  if (error) {
    console.error("Supabase error:", error);
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true });
}