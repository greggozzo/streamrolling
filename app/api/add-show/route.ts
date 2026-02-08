// app/api/add-show/route.ts
import { getAuth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { userId } = getAuth(request);

  console.log("=== ADD-SHOW DEBUG ===");
  console.log("userId from getAuth:", userId || "undefined");
  console.log("Cookie header length:", request.headers.get('cookie')?.length || 0);

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tmdbId, mediaType = 'tv' } = await request.json();

  // Temporary bypass for YOUR user ID only (remove later)
  const isPaid = userId === "user_39H6E6HcchOPB0bkshyfERzCzWS";

  console.log(`User ${userId} → isPaid (temp): ${isPaid}`);

  if (!isPaid) {
    const { data: existing } = await supabase
      .from('user_shows')
      .select('id')
      .eq('user_id', userId);

    if (existing && existing.length >= 5) {
      return Response.json({ error: 'Free tier limit reached (5 shows). Upgrade for unlimited.' }, { status: 402 });
    }
  }

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