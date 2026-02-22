/**
 * Supabase Admin Client (Service Role)
 * Bypasses Row-Level Security. Use ONLY in server-side background jobs
 * (cron, webhooks) where no user session is available.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client',
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Type alias compatible with SupabaseServerClient used in lib/crawl/ */
export type AdminClient = ReturnType<typeof createAdminClient>;
