import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApiClient } from '@/lib/crawl/api-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// ─── Types for Realty in US v3 response ──────────────────────

interface RealtyPhoto {
  href?: string;
}

interface RealtyResult {
  property_id?: string;
  location?: {
    address?: {
      line?: string;
      coordinate?: {
        lat?: number;
        lon?: number;
      };
    };
  };
  list_price?: number;
  description?: {
    beds?: number;
    baths?: number;
  };
  photos?: RealtyPhoto[];
}

interface RealtyApiResponse {
  data?: {
    home_search?: {
      results?: RealtyResult[];
    };
  };
}

// ─── Haversine distance (miles) ──────────────────────────────

function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Handler ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth: CRON_SECRET bearer token or authenticated user
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RAPIDAPI_KEY) {
    return NextResponse.json(
      { error: 'RAPIDAPI_KEY not configured' },
      { status: 500 },
    );
  }

  const supabase = createAdminClient();

  let body: { limit?: number } = {};
  try {
    body = (await request.json()) as { limit?: number };
  } catch {
    // empty body is fine
  }

  const batchLimit = Math.min(body.limit ?? 50, 200);

  try {
    // Fetch properties without photos, grouped by zip code
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, address, latitude, longitude, price, bedrooms, bathrooms')
      .eq('is_active', true)
      .or('photos.is.null,photos.eq.{}')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false })
      .limit(batchLimit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({
        enriched: 0,
        message: 'No properties without photos found',
      });
    }

    // Extract unique zip codes from addresses
    const zipMap = new Map<string, typeof properties>();
    for (const prop of properties) {
      const zipMatch = prop.address?.match(/\b(\d{5})\b/);
      const zip = zipMatch?.[1] ?? 'unknown';
      if (zip === 'unknown') continue;
      if (!zipMap.has(zip)) zipMap.set(zip, []);
      zipMap.get(zip)!.push(prop);
    }

    const client = new ApiClient();
    let enriched = 0;
    let searched = 0;
    const errors: string[] = [];

    for (const [zip, propsInZip] of zipMap) {
      try {
        // Search Realty in US for this zip code
        const requestBody = {
          status: ['for_rent'],
          limit: 200,
          offset: 0,
          postal_code: zip,
          sort: { direction: 'desc', field: 'list_date' },
        };

        const response = await client.fetchJson<RealtyApiResponse>(
          'https://realtor.p.rapidapi.com/properties/v3/list',
          {
            method: 'POST',
            headers: {
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
              'X-RapidAPI-Host': 'realtor.p.rapidapi.com',
            },
            body: requestBody,
            adapterName: 'RealtyEnrich',
            delayBetweenRequests: 6000,
          },
        );

        searched++;

        const realtyResults = response.data?.data?.home_search?.results ?? [];
        if (realtyResults.length === 0) continue;

        // For each property without photos, find the closest Realty in US match
        for (const prop of propsInZip) {
          const lat = Number(prop.latitude);
          const lon = Number(prop.longitude);
          if (isNaN(lat) || isNaN(lon)) continue;

          let bestMatch: RealtyResult | null = null;
          let bestDistance = Infinity;

          for (const result of realtyResults) {
            const rLat = result.location?.address?.coordinate?.lat;
            const rLon = result.location?.address?.coordinate?.lon;
            if (rLat == null || rLon == null) continue;

            // Must have photos
            const photos = (result.photos ?? []).filter((p) => p.href);
            if (photos.length === 0) continue;

            // Must be within 0.1 miles (~530 feet)
            const dist = haversineDistanceMiles(lat, lon, rLat, rLon);
            if (dist < bestDistance && dist < 0.1) {
              // Also check bedroom count matches if available
              const bedsMatch =
                prop.bedrooms == null ||
                result.description?.beds == null ||
                prop.bedrooms === result.description.beds;
              if (bedsMatch) {
                bestDistance = dist;
                bestMatch = result;
              }
            }
          }

          if (bestMatch) {
            const photos = (bestMatch.photos ?? [])
              .map((p) => p.href)
              .filter((h): h is string => Boolean(h));

            if (photos.length > 0) {
              const { error: updateError } = await supabase
                .from('properties')
                .update({
                  photos,
                  source_urls: [
                    `https://www.realtor.com/realestateandhomes-detail/${bestMatch.property_id ?? ''}`,
                  ],
                })
                .eq('id', prop.id);

              if (updateError) {
                errors.push(`Failed to update ${prop.id}: ${updateError.message}`);
              } else {
                enriched++;
                console.log(
                  `[PhotoEnrich] Matched ${prop.address} → ${photos.length} photos (${bestDistance.toFixed(3)} mi)`,
                );
              }
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`zip ${zip}: ${msg}`);
        console.error(`[PhotoEnrich] Error for zip ${zip}:`, msg);
      }
    }

    return NextResponse.json({
      enriched,
      searched,
      totalWithoutPhotos: properties.length,
      zipsSearched: zipMap.size,
      errors,
    });
  } catch (err) {
    console.error('[PhotoEnrich] Internal error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
