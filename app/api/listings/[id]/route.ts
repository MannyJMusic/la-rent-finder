import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { realtyInUsAdapter } from '@/lib/crawl/adapters/realty-in-us';
import { normalizeAmenities } from '@/lib/crawl/normalize';
import type { Json } from '@/lib/database.types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch the property listing
    const { data: listing, error: listingError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // ─── On-demand detail enrichment ───────────────────────────
    // realty_in_us: enrich whenever description is missing (direct fetch via source_id)
    // other sources: only enrich when both description AND photos are missing (cross-source is expensive)
    const needsEnrichment =
      listing.description === null &&
      (listing.source_name === 'realty_in_us' ||
        (!listing.photos || (listing.photos as string[]).length === 0));

    if (needsEnrichment) {
      try {
        if (listing.source_name === 'realty_in_us' && listing.source_id) {
          // Direct enrichment — we have the Realty in US property_id
          const enrichment = await realtyInUsAdapter.fetchPropertyDetail(listing.source_id);

          const adminSupabase = createAdminClient();
          const updates: Record<string, unknown> = {};

          if (enrichment) {
            // Description: store actual text, or empty string to prevent retry
            updates.description = enrichment.description || '';

            // Photos: only replace if enrichment has more
            if (enrichment.photos.length > 0) {
              const existingPhotos = listing.photos ?? [];
              if (enrichment.photos.length > existingPhotos.length) {
                updates.photos = enrichment.photos;
              }
            }

            // Amenities: merge and normalize
            if (enrichment.amenities.length > 0) {
              const existingAmenities = Array.isArray(listing.amenities)
                ? (listing.amenities as string[])
                : [];
              const merged = normalizeAmenities([
                ...existingAmenities,
                ...enrichment.amenities,
              ]);
              updates.amenities = merged as unknown as Json;
            }

            if (enrichment.pet_policy) {
              updates.pet_policy = enrichment.pet_policy;
            }

            if (enrichment.landlord_name) {
              updates.landlord_name = enrichment.landlord_name;
            }
          } else {
            // API returned null — mark as enriched to prevent retry
            updates.description = '';
          }

          const { error: updateError } = await adminSupabase
            .from('properties')
            .update(updates)
            .eq('id', id);

          if (updateError) {
            console.error(`[DetailEnrich] Failed to update ${id}:`, updateError.message);
          } else {
            console.log(`[DetailEnrich] Enriched property ${id} (realty_in_us direct)`);
            Object.assign(listing, updates);
          }
        } else {
          // Cross-source enrichment — find a Realty in US match by address
          const { enrichListingViaRealtyInUs } = await import('@/lib/crawl/enrichment');
          const adminSupabase = createAdminClient();
          const result = await enrichListingViaRealtyInUs(id, listing, adminSupabase);

          if (result.enriched) {
            // Re-fetch to get updated data written by enrichListingViaRealtyInUs
            const { data: refreshed } = await adminSupabase
              .from('properties')
              .select('*')
              .eq('id', id)
              .single();
            if (refreshed) Object.assign(listing, refreshed);
          } else {
            // No Realty in US counterpart found — mark attempted to prevent infinite retry
            await adminSupabase
              .from('properties')
              .update({ description: '' })
              .eq('id', id);
            listing.description = '';
          }

          // Return early — DB update was already handled by enrichListingViaRealtyInUs
          const { data: scores } = await supabase
            .from('listing_scores')
            .select('*')
            .eq('listing_id', id)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: favorite } = await supabase
            .from('favorites')
            .select('apartment_id')
            .eq('apartment_id', id)
            .eq('user_id', user.id)
            .maybeSingle();

          return NextResponse.json({
            listing,
            scores: scores || null,
            is_saved: !!favorite,
          });
        }
      } catch (enrichErr) {
        console.error(`[DetailEnrich] Error enriching ${id}:`, enrichErr);
      }
    }

    // Fetch listing scores for this user
    const { data: scores } = await supabase
      .from('listing_scores')
      .select('*')
      .eq('listing_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check if user has saved this listing
    const { data: favorite } = await supabase
      .from('favorites')
      .select('apartment_id')
      .eq('apartment_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({
      listing,
      scores: scores || null,
      is_saved: !!favorite,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
