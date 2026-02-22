import type { Json } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/server';
import type { NormalizedListing, DuplicateMatch } from './types';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// ─── Find Duplicates ────────────────────────────────────────────

export async function findDuplicates(
  listing: NormalizedListing,
  supabase: SupabaseServerClient,
): Promise<DuplicateMatch | null> {
  try {
    // Query 1: Exact normalized address match
    const { data: exactMatch } = await supabase
      .from('properties')
      .select('id, address, price, bedrooms')
      .eq('address', listing.address)
      .limit(1)
      .single();

    if (exactMatch) {
      return {
        existing: exactMatch.id,
        incoming: listing,
        confidence: 'high',
        reason: `Exact address match: "${listing.address}"`,
      };
    }

    // Query 2: Fuzzy match — similar address + price within 5% + same bedrooms
    const priceLow = listing.price * 0.95;
    const priceHigh = listing.price * 1.05;

    const { data: fuzzyMatches } = await supabase
      .from('properties')
      .select('id, address, price, bedrooms')
      .ilike('address', `%${listing.address.split(',')[0]}%`)
      .gte('price', priceLow)
      .lte('price', priceHigh)
      .eq('bedrooms', listing.bedrooms)
      .limit(1);

    if (fuzzyMatches && fuzzyMatches.length > 0) {
      return {
        existing: fuzzyMatches[0].id,
        incoming: listing,
        confidence: 'medium',
        reason: `Similar address "${fuzzyMatches[0].address}" with matching price ($${fuzzyMatches[0].price}) and bedrooms (${fuzzyMatches[0].bedrooms})`,
      };
    }

    return null;
  } catch (err) {
    console.error('[dedup] Error finding duplicates:', err);
    return null;
  }
}

// ─── Merge With Existing ────────────────────────────────────────

export async function mergeWithExisting(
  existingId: string,
  incoming: NormalizedListing,
  supabase: SupabaseServerClient,
): Promise<void> {
  try {
    // Fetch existing property
    const { data: existing } = await supabase
      .from('properties')
      .select('*')
      .eq('id', existingId)
      .single();

    if (!existing) {
      console.error(`[dedup] Property ${existingId} not found for merge`);
      return;
    }

    // Build update: keep richer data
    const updates: Record<string, unknown> = {
      last_crawled_at: incoming.last_crawled_at,
      is_active: true,
    };

    // Keep longer description
    if (
      incoming.description &&
      (!existing.description || incoming.description.length > existing.description.length)
    ) {
      updates.description = incoming.description;
    }

    // Keep more photos
    const existingPhotos = existing.photos ?? [];
    if (incoming.photos.length > existingPhotos.length) {
      updates.photos = incoming.photos;
    }

    // Update price if changed
    if (incoming.price !== existing.price) {
      updates.price = incoming.price;
    }

    // Merge amenities
    const existingAmenities = Array.isArray(existing.amenities)
      ? (existing.amenities as string[])
      : [];
    const mergedAmenities = Array.from(
      new Set([...existingAmenities, ...incoming.amenities]),
    ).sort();
    updates.amenities = mergedAmenities as unknown as Json;

    // Update source tracking fields
    updates.source_url = incoming.source_url;
    updates.raw_data = (incoming.raw_data ?? null) as unknown as Json;

    await supabase.from('properties').update(updates).eq('id', existingId);

    // Upsert into crawl_sources to track this source
    await supabase.from('crawl_sources').upsert(
      {
        property_id: existingId,
        source_name: incoming.source_name,
        source_url: incoming.source_url,
        source_id: incoming.source_id,
        last_seen_at: incoming.last_crawled_at,
        price_at_source: incoming.price,
        is_active: true,
      },
      { onConflict: 'property_id,source_name' },
    );
  } catch (err) {
    console.error('[dedup] Error merging with existing:', err);
  }
}

// ─── Persist New Listing ────────────────────────────────────────

export async function persistNewListing(
  listing: NormalizedListing,
  supabase: SupabaseServerClient,
): Promise<string> {
  const { data, error } = await supabase
    .from('properties')
    .insert({
      title: listing.title,
      description: listing.description,
      address: listing.address,
      location: listing.location,
      price: listing.price,
      latitude: listing.latitude,
      longitude: listing.longitude,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      square_feet: listing.square_feet,
      amenities: listing.amenities as unknown as Json,
      photos: listing.photos,
      pet_policy: listing.pet_policy,
      parking_available: listing.parking_available,
      available_date: listing.available_date,
      listing_url: listing.listing_url,
      property_type: listing.property_type,
      source_id: listing.source_id,
      source_name: listing.source_name,
      source_url: listing.source_url,
      last_crawled_at: listing.last_crawled_at,
      is_active: listing.is_active,
      raw_data: (listing.raw_data ?? null) as unknown as Json,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist listing: ${error?.message ?? 'no data returned'}`);
  }

  // Track in crawl_sources
  await supabase.from('crawl_sources').insert({
    property_id: data.id,
    source_name: listing.source_name,
    source_url: listing.source_url,
    source_id: listing.source_id,
    last_seen_at: listing.last_crawled_at,
    price_at_source: listing.price,
    is_active: true,
  });

  return data.id;
}
