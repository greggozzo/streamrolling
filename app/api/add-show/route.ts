// app/api/add-show/route.ts
import { getAuth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { userId } = getAuth(request);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { tmdbId, mediaType = 'tv' } = await request.json();

  // Check paid status from Clerk
  let isPaid = false;
  try {
    const user = await clerkClient.users.getUser(userId);
    isPaid = (user.privateMetadata as any)?.isPaid === true;
  } catch (err) {
    console.error("Clerk lookup failed:", err);
  }

  console.log(`User ${userId} → isPaid: ${isPaid}`);

  // Enforce 5-show limit ONLY for non-paid users
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
      media_type: mediaType 
    });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ success: true });
}