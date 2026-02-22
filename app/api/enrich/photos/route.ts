import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApiClient } from '@/lib/crawl/api-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// ─── Types for Realty in US v3 responses ─────────────────────

interface RealtyPhoto {
  href?: string;
}

interface RealtyListResult {
  property_id?: string;
  primary_photo?: RealtyPhoto;
  photo_count?: number;
  location?: {
    address?: {
      line?: string;
      coordinate?: {
        lat?: number;
        lon?: number;
      };
    };
  };
  description?: {
    beds?: number;
    baths?: number;
  };
}

interface RealtyListResponse {
  data?: {
    home_search?: {
      results?: RealtyListResult[];
    };
  };
}

interface RealtyGetPhotosResponse {
  data?: {
    home_search?: {
      results?: Array<{
        property_id?: string;
        photos?: RealtyPhoto[];
      }>;
    };
  };
}

const RAPIDAPI_HOST = 'realty-in-us.p.rapidapi.com';
const RAPIDAPI_BASE = `https://${RAPIDAPI_HOST}`;

// ─── Haversine distance (miles) ──────────────────────────────

function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3958.8;
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
  const apiHeaders = {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
    'X-RapidAPI-Host': RAPIDAPI_HOST,
  };

  try {
    // Fetch properties without photos
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

    // Group by zip code
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
        // Step 1: Search Realty in US for this zip to find nearby properties
        const listResponse = await client.fetchJson<RealtyListResponse>(
          `${RAPIDAPI_BASE}/properties/v3/list`,
          {
            method: 'POST',
            headers: apiHeaders,
            body: {
              status: ['for_rent'],
              limit: 200,
              offset: 0,
              postal_code: zip,
              sort: { direction: 'desc', field: 'list_date' },
            },
            adapterName: 'RealtyEnrich',
            delayBetweenRequests: 6000,
          },
        );

        searched++;
        const realtyResults =
          listResponse.data?.data?.home_search?.results ?? [];
        if (realtyResults.length === 0) continue;

        // Step 2: For each property, find the closest match and get photos
        for (const prop of propsInZip) {
          const lat = Number(prop.latitude);
          const lon = Number(prop.longitude);
          if (isNaN(lat) || isNaN(lon)) continue;

          let bestMatch: RealtyListResult | null = null;
          let bestDistance = Infinity;

          for (const result of realtyResults) {
            const rLat = result.location?.address?.coordinate?.lat;
            const rLon = result.location?.address?.coordinate?.lon;
            if (rLat == null || rLon == null) continue;
            if (!result.property_id) continue;

            // Must have photos available
            if (!result.photo_count && !result.primary_photo?.href) continue;

            const dist = haversineDistanceMiles(lat, lon, rLat, rLon);
            if (dist < bestDistance && dist < 0.1) {
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

          if (!bestMatch?.property_id) continue;

          // Step 3: Fetch full photos via get-photos endpoint
          try {
            const photosResponse =
              await client.fetchJson<RealtyGetPhotosResponse>(
                `${RAPIDAPI_BASE}/properties/v3/get-photos?property_id=${bestMatch.property_id}`,
                {
                  headers: apiHeaders,
                  adapterName: 'RealtyEnrich',
                  delayBetweenRequests: 2000,
                },
              );

            const photoResults =
              photosResponse.data?.data?.home_search?.results ?? [];
            const fullPhotos = (photoResults[0]?.photos ?? [])
              .map((p) => p.href)
              .filter((h): h is string => Boolean(h));

            // Fall back to primary_photo if get-photos returned nothing
            const photos =
              fullPhotos.length > 0
                ? fullPhotos
                : bestMatch.primary_photo?.href
                  ? [bestMatch.primary_photo.href]
                  : [];

            if (photos.length > 0) {
              const { error: updateError } = await supabase
                .from('properties')
                .update({ photos })
                .eq('id', prop.id);

              if (updateError) {
                errors.push(
                  `Failed to update ${prop.id}: ${updateError.message}`,
                );
              } else {
                enriched++;
                console.log(
                  `[PhotoEnrich] Matched ${prop.address} → ${photos.length} photos (${bestDistance.toFixed(3)} mi)`,
                );
              }
            }
          } catch (photoErr) {
            // If get-photos fails, fall back to primary_photo
            if (bestMatch.primary_photo?.href) {
              await supabase
                .from('properties')
                .update({ photos: [bestMatch.primary_photo.href] })
                .eq('id', prop.id);
              enriched++;
              console.log(
                `[PhotoEnrich] Fallback: ${prop.address} → 1 primary photo`,
              );
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
