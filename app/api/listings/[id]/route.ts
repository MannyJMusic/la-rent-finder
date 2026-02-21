import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch the apartment listing
    const { data: listing, error: listingError } = await supabase
      .from('apartments')
      .select('*')
      .eq('id', id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
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
