import { createClient } from '@/lib/supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// ─── Mark Stale Listings ────────────────────────────────────────

export async function markStaleListings(
  supabase: SupabaseServerClient,
): Promise<number> {
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from('properties')
    .update({ is_active: false })
    .eq('is_active', true)
    .lt('last_crawled_at', fourteenDaysAgo)
    .select('id');

  if (error) {
    console.error('[lifecycle] Error marking stale listings:', error);
    return 0;
  }

  return data?.length ?? 0;
}

// ─── Purge Expired Listings ─────────────────────────────────────

export async function purgeExpiredListings(
  supabase: SupabaseServerClient,
): Promise<number> {
  const ninetyDaysAgo = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from('properties')
    .delete()
    .eq('is_active', false)
    .lt('last_crawled_at', ninetyDaysAgo)
    .select('id');

  if (error) {
    console.error('[lifecycle] Error purging expired listings:', error);
    return 0;
  }

  return data?.length ?? 0;
}

// ─── Lifecycle Stats ────────────────────────────────────────────

export async function getLifecycleStats(
  supabase: SupabaseServerClient,
): Promise<{ active: number; stale: number; inactive: number; total: number }> {
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Active: is_active = true AND last_crawled_at within 14 days (or null last_crawled_at)
  const { count: activeCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .gte('last_crawled_at', fourteenDaysAgo);

  // Stale: is_active = true AND last_crawled_at older than 14 days
  const { count: staleCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .lt('last_crawled_at', fourteenDaysAgo);

  // Inactive: is_active = false
  const { count: inactiveCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', false);

  // Total
  const { count: totalCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });

  return {
    active: activeCount ?? 0,
    stale: staleCount ?? 0,
    inactive: inactiveCount ?? 0,
    total: totalCount ?? 0,
  };
}
