import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { PropertyType } from '@/lib/database.types';

interface CrawlRequestBody {
  neighborhoods?: string[];
  propertyTypes?: PropertyType[];
  sources?: string[];
  maxPrice?: number;
  minPrice?: number;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CrawlRequestBody;
  try {
    body = (await request.json()) as CrawlRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { crawlEngine, allAdapters, normalizeRawListing, findDuplicates, mergeWithExisting, persistNewListing } = await import('@/lib/crawl');

    const crawlParams = {
      neighborhoods: body.neighborhoods,
      propertyTypes: body.propertyTypes,
      minPrice: body.minPrice,
      maxPrice: body.maxPrice,
    };

    // Filter adapters if specific sources requested
    const adapters = body.sources?.length
      ? allAdapters.filter(a => body.sources!.includes(a.config.name))
      : allAdapters;

    let listingsFound = 0;
    let listingsNew = 0;
    let listingsUpdated = 0;
    const errors: string[] = [];

    // Log crawl run start
    const { data: crawlRun } = await supabase
      .from('crawl_runs')
      .insert({
        source_name: adapters.map(a => a.config.name).join(','),
        search_params: crawlParams,
        status: 'running',
      })
      .select('id')
      .single();

    for (const adapter of adapters) {
      try {
        const result = await crawlEngine.crawlSearchResults(adapter, crawlParams);
        listingsFound += result.listings.length;
        errors.push(...result.errors);

        for (const rawListing of result.listings) {
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
      crawlRunId: crawlRun?.id ?? null,
      listingsFound,
      listingsNew,
      listingsUpdated,
      errors,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
