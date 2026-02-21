import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apartmentIdsParam = request.nextUrl.searchParams.get('apartment_ids');
  if (!apartmentIdsParam) {
    return NextResponse.json(
      { error: 'apartment_ids query parameter is required (comma-separated)' },
      { status: 400 }
    );
  }

  const apartmentIds = apartmentIdsParam.split(',').map((id) => id.trim()).filter(Boolean);
  if (apartmentIds.length === 0) {
    return NextResponse.json({ error: 'At least one apartment_id is required' }, { status: 400 });
  }

  try {
    // Fetch all estimates for these apartments belonging to the user
    const { data: allEstimates, error } = await supabase
      .from('cost_estimates')
      .select('*')
      .eq('user_id', user.id)
      .in('listing_id', apartmentIds)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get the most recent estimate per apartment
    const latestByApartment = new Map<string, typeof allEstimates[number]>();
    for (const estimate of allEstimates || []) {
      if (estimate.listing_id && !latestByApartment.has(estimate.listing_id)) {
        latestByApartment.set(estimate.listing_id, estimate);
      }
    }

    const estimates = Array.from(latestByApartment.values());

    return NextResponse.json({ estimates });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
