import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { batchEnrichMissingPhotos } from '@/lib/crawl/enrichment';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — enrichment is slow (rate-limited)

export async function GET(request: NextRequest) {
  // --- Auth: CRON_SECRET bearer token ---
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[CronEnrich] CRON_SECRET env var is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminSupabase = createAdminClient();
    const batchSize = parseInt(
      request.nextUrl.searchParams.get('limit') || '20',
      10,
    );

    console.log(`[CronEnrich] Starting batch enrichment (limit=${batchSize})`);
    const result = await batchEnrichMissingPhotos(adminSupabase, batchSize);

    console.log(
      `[CronEnrich] Completed: processed=${result.processed} enriched=${result.enriched}` +
      ` skipped=${result.skipped} errors=${result.errors.length}`,
    );

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CronEnrich] Internal error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
