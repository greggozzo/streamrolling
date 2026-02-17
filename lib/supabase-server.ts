/**
 * Server-only Supabase client with service role key. Use only in cron/backend
 * when you need to list all users (e.g. notification job). Never expose to client.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdmin() {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this operation');
  }
  return createClient(supabaseUrl, serviceRoleKey);
}
