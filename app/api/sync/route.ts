import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface SyncRequestBody {
  sources?: string[];
  neighborhoods?: string[];
  maxPrice?: number;
  minPrice?: number;
  bedrooms?: number;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SyncRequestBody;
  try {
    body = (await request.json()) as SyncRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { apiAdapters } = await import('@/lib/crawl/adapters/index');
    const { normalizeRawListing } = await import('@/lib/crawl/normalize');
    const { findDuplicates, mergeWithExisting, persistNewListing } = await import('@/lib/crawl/dedup');

    const syncParams = {
      neighborhoods: body.neighborhoods,
      minPrice: body.minPrice,
      maxPrice: body.maxPrice,
      minBedrooms: body.bedrooms,
    };

    // Filter adapters if specific sources requested
    const adapters = body.sources?.length
      ? apiAdapters.filter(a => body.sources!.includes(a.config.name))
      : apiAdapters;

    let listingsFound = 0;
    let listingsNew = 0;
    let listingsUpdated = 0;
    const errors: string[] = [];
    const rateLimits: Record<string, { remaining?: number; reset?: string }> = {};

    // Log sync run start
    const { data: crawlRun } = await supabase
      .from('crawl_runs')
      .insert({
        source_name: adapters.map(a => a.config.name).join(','),
        search_params: syncParams,
        status: 'running',
      })
      .select('id')
      .single();

    for (const adapter of adapters) {
      try {
        // Call adapter directly to get both listings and rate limit info
        if (!adapter.isConfigured()) {
          errors.push(`${adapter.config.name} is not configured`);
          continue;
        }

        const apiResult = await adapter.fetchListings(syncParams);
        listingsFound += apiResult.listings.length;
        errors.push(...apiResult.errors);

        rateLimits[adapter.config.name] = {
          remaining: apiResult.rateLimitRemaining,
          reset: apiResult.rateLimitReset,
        };

        for (const rawListing of apiResult.listings) {
          const normalized = normalizeRawListing(rawListing);
          const duplicate = await findDuplicates(normalized, supabase);

          if (duplicate) {
            await mergeWithExisting(duplicate.existing, normalized, supabase);
            listingsUpdated++;
          } else {
            await persistNewListing(normalized, supabase);
            listingsNew++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${adapter.config.name}: ${msg}`);
      }
    }

    // Update crawl run status
    if (crawlRun) {
      await supabase
        .from('crawl_runs')
        .update({
          status: errors.length > 0 && listingsFound === 0 ? 'failed' : 'completed',
          completed_at: new Date().toISOString(),
          listings_found: listingsFound,
          listings_new: listingsNew,
          listings_updated: listingsUpdated,
          error_message: errors.length > 0 ? errors.join('; ') : null,
        })
        .eq('id', crawlRun.id);
    }

    return NextResponse.json({
      syncRunId: crawlRun?.id ?? null,
      listingsFound,
      listingsNew,
      listingsUpdated,
      errors,
      rateLimits,
    });
  } catch (err) {
    console.error('[SyncRoute] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: lastRun } = await supabase
      .from('crawl_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      lastRun: lastRun ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
