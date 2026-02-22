import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { PropertyType } from '@/lib/database.types';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const price_min = searchParams.get('price_min') || searchParams.get('min_price');
  const price_max = searchParams.get('price_max') || searchParams.get('max_price');
  const bedrooms = searchParams.get('bedrooms') || searchParams.get('min_bedrooms');
  const bathrooms = searchParams.get('bathrooms');
  const neighborhood = searchParams.get('neighborhood');
  const pet_friendly = searchParams.get('pet_friendly');
  const parking = searchParams.get('parking');
  const property_type = searchParams.get('property_type');
  const sort = searchParams.get('sort') || 'date';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  try {
    let query = supabase.from('properties').select('*', { count: 'exact' });

    if (price_min) {
      query = query.gte('price', parseFloat(price_min));
    }
    if (price_max) {
      query = query.lte('price', parseFloat(price_max));
    }
    if (bedrooms) {
      query = query.eq('bedrooms', parseInt(bedrooms, 10));
    }
    if (bathrooms) {
      query = query.eq('bathrooms', parseInt(bathrooms, 10));
    }
    if (neighborhood) {
      query = query.ilike('location', `%${neighborhood}%`);
    }
    if (pet_friendly === 'true') {
      query = query.not('pet_policy', 'is', null);
    }
    if (parking === 'true') {
      query = query.eq('parking_available', true);
    }
    if (property_type) {
      const types = property_type.split(',').map(t => t.trim()).filter(Boolean) as PropertyType[];
      if (types.length === 1) {
        query = query.eq('property_type', types[0]);
      } else if (types.length > 1) {
        query = query.in('property_type', types);
      }
    }

    // Sorting
    switch (sort) {
      case 'price':
        query = query.order('price', { ascending: true });
        break;
      case 'score':
        query = query.order('availability_score', { ascending: false, nullsFirst: false });
        break;
      case 'date':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: listings, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      listings: listings || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
