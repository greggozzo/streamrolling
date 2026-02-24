/**
 * Backend-only: upsert user_aggregate (Clerk username, email, IP, favorites).
 * Not exposed to the app. Call from server pages (dashboard, manage-subscriptions).
 * Requires SUPABASE_SERVICE_ROLE_KEY.
 */
import { headers } from 'next/headers';
import { clerkClient } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export type FavoriteItem = { tmdb_id: number; media_type: string; title?: string };

function getClientIp(headersList: Headers): string | null {
  const forwarded = headersList.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;
  return headersList.get('x-real-ip');
}

/**
 * Upsert one row in user_aggregate for the given user.
 * Pass favorites from loadUserShows (e.g. shows.filter(s => s.favorite).map(...)).
 * If favorites not provided and service role is set, fetches from user_shows.
 */
export async function upsertUserAggregate(
  userId: string,
  options: {
    headers?: Headers;
    favorites?: FavoriteItem[];
  } = {}
): Promise<void> {
  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return;
  }

  const headersList = options.headers ?? (await headers());
  const ip = getClientIp(headersList);
  const ipValue = ip && ip.length > 0 ? ip : null;

  let email: string | null = null;
  let username: string | null = null;
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const u = user as { primaryEmailAddress?: { emailAddress?: string }; username?: string };
    email = u.primaryEmailAddress?.emailAddress ?? null;
    username = u.username ?? null;
  } catch {
    // keep nulls
  }

  let favorites: FavoriteItem[] = options.favorites ?? [];
  if (favorites.length === 0) {
    const { data: rows } = await admin
      .from('user_shows')
      .select('tmdb_id, media_type')
      .eq('user_id', userId)
      .eq('favorite', true);
    if (rows?.length) {
      favorites = rows.map((r: { tmdb_id: number; media_type: string }) => ({
        tmdb_id: r.tmdb_id,
        media_type: r.media_type ?? 'tv',
        title: undefined,
      }));
    }
  }

  await admin.from('user_aggregate').upsert(
    {
      clerk_user_id: userId,
      email,
      username,
      last_seen_ip: ipValue,
      favorites,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'clerk_user_id' }
  );
}
