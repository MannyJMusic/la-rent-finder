import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // --- Auth: CRON_SECRET bearer token ---
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[CronSync] CRON_SECRET env var is not set');
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- Initialize admin client (bypasses RLS) ---
  const supabase = createAdminClient();

  try {
    const { apiAdapters } = await import('@/lib/crawl/adapters/index');
    const { normalizeRawListing } = await import('@/lib/crawl/normalize');
    const {
      findDuplicates,
      mergeWithExisting,
      persistNewListing,
    } = await import('@/lib/crawl/dedup');
    const { markStaleListings } = await import('@/lib/crawl/lifecycle');

    // Broad search: no filters for maximum variety.
    // Both adapters fall back to city-wide "Los Angeles, CA" when empty.
    const syncParams = {};

    let listingsFound = 0;
    let listingsNew = 0;
    let listingsUpdated = 0;
    const errors: string[] = [];
    const rateLimits: Record<string, { remaining?: number; reset?: string }> =
      {};

    // Log crawl run start
    const { data: crawlRun } = await supabase
      .from('crawl_runs')
      .insert({
        source_name: apiAdapters.map((a) => a.config.name).join(','),
        search_params: syncParams,
        status: 'running',
      })
      .select('id')
      .single();

    for (const adapter of apiAdapters) {
      try {
        if (!adapter.isConfigured()) {
          errors.push(`${adapter.config.name} is not configured`);
          continue;
        }

        // Guard RentCast monthly quota (50 free calls/month)
        if (
          adapter.config.name === 'rentcast' &&
          rateLimits['rentcast']?.remaining !== undefined &&
          rateLimits['rentcast'].remaining < 5
        ) {
          errors.push('rentcast: skipped — rate limit remaining < 5');
          continue;
        }

        const apiResult = await adapter.fetchListings(syncParams);
        listingsFound += apiResult.listings.length;
        errors.push(...apiResult.errors);

        rateLimits[adapter.config.name] = {
          remaining: apiResult.rateLimitRemaining,
          reset: apiResult.rateLimitReset,
        };

        // Use 'as any' for the supabase param because dedup/lifecycle
        // define SupabaseServerClient from the SSR createClient return type,
        // which is structurally identical to the admin client but TypeScript
        // treats them as different nominal types.
        for (const rawListing of apiResult.listings) {
          const normalized = normalizeRawListing(rawListing);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const duplicate = await findDuplicates(normalized, supabase as any);

          if (duplicate) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await mergeWithExisting(duplicate.existing, normalized, supabase as any);
            listingsUpdated++;
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await persistNewListing(normalized, supabase as any);
            listingsNew++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${adapter.config.name}: ${msg}`);
      }
    }

    // Lifecycle maintenance: deactivate listings not seen in 14 days
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const staleCount = await markStaleListings(supabase as any);

    // Update crawl run record
    if (crawlRun) {
      await supabase
        .from('crawl_runs')
        .update({
          status:
            errors.length > 0 && listingsFound === 0 ? 'failed' : 'completed',
          completed_at: new Date().toISOString(),
          listings_found: listingsFound,
          listings_new: listingsNew,
          listings_updated: listingsUpdated,
          listings_deactivated: staleCount,
          error_message: errors.length > 0 ? errors.join('; ') : null,
        })
        .eq('id', crawlRun.id);
    }

    console.log(
      `[CronSync] Completed: found=${listingsFound} new=${listingsNew} updated=${listingsUpdated} stale=${staleCount}`,
    );

    return NextResponse.json({
      ok: true,
      syncRunId: crawlRun?.id ?? null,
      listingsFound,
      listingsNew,
      listingsUpdated,
      listingsDeactivated: staleCount,
      errors,
      rateLimits,
    });
  } catch (err) {
    console.error('[CronSync] Internal error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
