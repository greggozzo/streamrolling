// app/api/add-show/route.ts
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { userId } = await getAuth(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tmdbId, mediaType = 'tv' } = await request.json();

  // Use Clerk metadata (set by Stripe webhooks) — no hardcoded user IDs
  let isPaid = false;
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const publicMeta = user.publicMetadata as Record<string, unknown> | undefined;
    const privateMeta = user.privateMetadata as Record<string, unknown> | undefined;
    const truthy = (v: unknown) => v === true || v === 'true';
    isPaid = truthy(publicMeta?.isPaid) || truthy(publicMeta?.is_paid) || truthy(privateMeta?.isPaid) || truthy(privateMeta?.is_paid);
  } catch (e) {
    console.error('[add-show] Clerk getUser failed:', e);
    // if Clerk fails (e.g. SocketError), treat as free to avoid granting paid by mistake
  }

  if (!isPaid) {
    const { data: existing } = await supabase
      .from('user_shows')
      .select('id')
      .eq('user_id', userId);

    if (existing && existing.length >= 5) {
      return Response.json({ error: 'Free tier limit reached (5 shows). Upgrade for unlimited.' }, { status: 402 });
    }
  }

  const { data: maxRow } = await supabase
    .from('user_shows')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { error } = await supabase
    .from('user_shows')
    .insert({
      user_id: userId,
      tmdb_id: tmdbId,
      media_type: mediaType,
      sort_order: nextOrder,
    });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ success: true });
}