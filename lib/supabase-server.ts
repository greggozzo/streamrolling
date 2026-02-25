/**
 * Server-only Supabase client with service role key. Use only in cron/backend
 * when you need to list all users (e.g. notification job). Never expose to client.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function getSupabaseAdmin() {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this operation');
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Returns a Supabase client that can read/write user_shows.
 * Uses service role when SUPABASE_SERVICE_ROLE_KEY is set (required once RLS is enabled).
 * Falls back to anon when key is not set (for backward compatibility before RLS).
 */
export function getSupabaseForUserShows() {
  if (serviceRoleKey) {
    return createClient(supabaseUrl, serviceRoleKey);
  }
  return createClient(supabaseUrl, anonKey);
}
