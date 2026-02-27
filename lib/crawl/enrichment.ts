/**
 * Cross-source enrichment: finds a Realty in US listing that matches a
 * RentCast (or other source) listing by ZIP + address, then fetches full
 * details (photos, description, amenities) and persists them to the DB.
 */

import { realtyInUsAdapter } from '@/lib/crawl/adapters/realty-in-us';
import { normalizeAddress, normalizeAmenities } from '@/lib/crawl/normalize';
import type { AdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/database.types';

// Minimal shape of a DB properties row needed for enrichment
// Uses loose types to be compatible with both DB row types and test inputs
interface ListingForEnrichment {
  address: string | null;
  source_name: string | null;
  source_id: string | null;
  description: string | null;
  photos: unknown;
  amenities: unknown;
  pet_policy: string | null;
}

export interface EnrichmentResult {
  enriched: boolean;
  reason?: string;
  source_id?: string;
}

export interface BatchEnrichResult {
  processed: number;
  enriched: number;
  skipped: number;
  errors: string[];
}

/**
 * Attempt to enrich a listing (any source) by finding a matching Realty in US
 * listing via ZIP code + address fuzzy match, then fetching full detail data.
 *
 * On success: updates the DB row and returns { enriched: true }.
 * On failure: returns { enriched: false, reason }.
 */
export async function enrichListingViaRealtyInUs(
  listingId: string,
  listing: ListingForEnrichment,
  adminSupabase: AdminClient,
): Promise<EnrichmentResult> {
  // 1. Extract ZIP from address
  const zip = listing.address ? (listing.address.match(/\b(\d{5})\b/)?.[1] ?? null) : null;
  if (!zip) {
    return { enriched: false, reason: 'no_zip' };
  }

  // 2. Fetch Realty in US listings for that ZIP
  let apiListings;
  try {
    const result = await realtyInUsAdapter.fetchListings({ zipCodes: [zip] });
    apiListings = result.listings;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Enrichment] Failed to fetch listings for zip ${zip}:`, msg);
    return { enriched: false, reason: `fetch_error: ${msg}` };
  }

  if (!apiListings || apiListings.length === 0) {
    return { enriched: false, reason: 'no_results_for_zip' };
  }

  // 3. Find best address match
  const normalizedTarget = listing.address ? normalizeAddress(listing.address) : '';
  const targetLower = normalizedTarget.toLowerCase();

  // Extract just the street part (before the first comma) for comparison
  const targetStreet = targetLower.split(',')[0].trim();

  let bestMatch: { sourceId: string; score: number } | null = null;

  for (const candidate of apiListings) {
    if (!candidate.sourceId || !candidate.address) continue;
    const candidateNorm = normalizeAddress(candidate.address).toLowerCase();
    const candidateStreet = candidateNorm.split(',')[0].trim();

    // Exact full-address match
    if (candidateNorm === targetLower) {
      bestMatch = { sourceId: candidate.sourceId, score: 2 };
      break;
    }

    // Street-level match (ignore city/state/zip suffix differences)
    if (candidateStreet === targetStreet && targetStreet.length > 0) {
      bestMatch = { sourceId: candidate.sourceId, score: 1 };
      // Keep looking for exact match
    }

    // Substring containment (one address contains the other)
    if (
      bestMatch === null &&
      targetStreet.length > 4 &&
      (candidateNorm.includes(targetStreet) || targetLower.includes(candidateStreet))
    ) {
      bestMatch = { sourceId: candidate.sourceId, score: 0 };
    }
  }

  if (!bestMatch) {
    return { enriched: false, reason: 'no_match' };
  }

  // 4. Fetch full property detail
  let enrichment;
  try {
    enrichment = await realtyInUsAdapter.fetchPropertyDetail(bestMatch.sourceId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Enrichment] Failed to fetch detail for ${bestMatch.sourceId}:`, msg);
    return { enriched: false, reason: `detail_error: ${msg}` };
  }

  // 5. Build and apply updates (same pattern as app/api/listings/[id]/route.ts)
  const updates: Record<string, unknown> = {};

  if (enrichment) {
    updates.description = enrichment.description || '';

    if (enrichment.photos.length > 0) {
      const existingPhotos = Array.isArray(listing.photos) ? (listing.photos as string[]) : [];
      if (enrichment.photos.length > existingPhotos.length) {
        updates.photos = enrichment.photos;
      }
    }

    if (enrichment.amenities.length > 0) {
      const existingAmenities = Array.isArray(listing.amenities)
        ? (listing.amenities as string[])
        : [];
      const merged = normalizeAmenities([...existingAmenities, ...enrichment.amenities]);
      updates.amenities = merged as unknown as Json;
    }

    if (enrichment.pet_policy && !listing.pet_policy) {
      updates.pet_policy = enrichment.pet_policy;
    }
  } else {
    // API returned null — mark attempted to prevent retry
    updates.description = '';
  }

  const { error: updateError } = await adminSupabase
    .from('properties')
    .update(updates)
    .eq('id', listingId);

  if (updateError) {
    console.error(`[Enrichment] DB update failed for ${listingId}:`, updateError.message);
    return { enriched: false, reason: `db_error: ${updateError.message}` };
  }

  const hadPhotos = enrichment && enrichment.photos.length > 0;
  console.log(
    `[Enrichment] Enriched ${listingId} via realty_in_us ${bestMatch.sourceId}` +
    ` (photos=${hadPhotos ? enrichment!.photos.length : 0})`,
  );

  return { enriched: true, source_id: bestMatch.sourceId };
}

/**
 * Batch-enrich listings that have no description and no photos.
 * Rate-limited to stay within Realty in US 10 req/min quota.
 */
export async function batchEnrichMissingPhotos(
  adminSupabase: AdminClient,
  limit = 20,
): Promise<BatchEnrichResult> {
  const errors: string[] = [];
  let processed = 0;
  let enriched = 0;
  let skipped = 0;

  // Query listings that need enrichment
  const { data: rows, error: queryError } = await adminSupabase
    .from('properties')
    .select('id, address, source_name, source_id, photos, description, amenities, pet_policy')
    .eq('is_active', true)
    .is('description', null)
    .filter('photos', 'eq', '{}')
    .limit(limit);

  if (queryError) {
    errors.push(`Query error: ${queryError.message}`);
    return { processed: 0, enriched: 0, skipped: 0, errors };
  }

  if (!rows || rows.length === 0) {
    return { processed: 0, enriched: 0, skipped: 0, errors };
  }

  for (const row of rows) {
    processed++;
    try {
      const result = await enrichListingViaRealtyInUs(
        row.id,
        {
          address: row.address,
          source_name: row.source_name,
          source_id: row.source_id,
          description: row.description,
          photos: row.photos,
          amenities: row.amenities,
          pet_policy: row.pet_policy,
        },
        adminSupabase,
      );

      if (result.enriched) {
        enriched++;
      } else {
        skipped++;
        console.log(`[Enrichment] Skipped ${row.id}: ${result.reason}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${row.id}: ${msg}`);
      skipped++;
    }

    // Rate limit: Realty in US allows 10 req/min; fetchListings + fetchPropertyDetail = 2 calls
    // 6s delay keeps us well within quota
    if (processed < rows.length) {
      await new Promise((r) => setTimeout(r, 6000));
    }
  }

  return { processed, enriched, skipped, errors };
}
