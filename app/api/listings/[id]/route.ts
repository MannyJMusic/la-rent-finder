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
    if (
      listing.source_name === 'realty_in_us' &&
      listing.description === null &&
      listing.source_id
    ) {
      try {
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
          console.log(`[DetailEnrich] Enriched property ${id}`);
          // Merge into the listing object for the response
          Object.assign(listing, updates);
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
