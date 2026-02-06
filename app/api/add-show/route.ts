// app/api/add-show/route.ts
import { getAuth } from '@clerk/nextjs/server';     // ← correct import
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { userId } = getAuth(request);

  console.log("=== DEBUG ON streamrolling.com ===");
  console.log("userId from getAuth(request):", userId || "undefined");
  console.log("Cookie length:", request.headers.get('cookie')?.length || 0);

  if (!userId) {
    return Response.json({ error: 'Unauthorized - no userId from getAuth' }, { status: 401 });
  }

  const { tmdbId } = await request.json();

  // Optional free tier check
  const { data: existing } = await supabase
    .from('user_shows')
    .select('*')
    .eq('user_id', userId);

  if (existing && existing.length >= 5) {
    return Response.json({ error: 'Free tier limit reached (5 shows). Upgrade for unlimited.' }, { status: 402 });
  }

  const { error } = await supabase
    .from('user_shows')
    .insert({ user_id: userId, tmdb_id: tmdbId });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true });
}