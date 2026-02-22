import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface SearchFilters {
  price_min?: number;
  price_max?: number;
  bedrooms?: number;
  bathrooms?: number;
  neighborhood?: string;
  pet_friendly?: boolean;
  parking?: boolean;
}

interface SearchBody {
  query: string;
  filters?: SearchFilters;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SearchBody;
    const { query, filters } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Build apartment query with filters
    let apartmentQuery = supabase
      .from('properties')
      .select('*');

    // Text search across title, description, address, and location
    apartmentQuery = apartmentQuery.or(
      `title.ilike.%${query}%,description.ilike.%${query}%,address.ilike.%${query}%,location.ilike.%${query}%`
    );

    if (filters) {
      if (filters.price_min !== undefined) {
        apartmentQuery = apartmentQuery.gte('price', filters.price_min);
      }
      if (filters.price_max !== undefined) {
        apartmentQuery = apartmentQuery.lte('price', filters.price_max);
      }
      if (filters.bedrooms !== undefined) {
        apartmentQuery = apartmentQuery.eq('bedrooms', filters.bedrooms);
      }
      if (filters.bathrooms !== undefined) {
        apartmentQuery = apartmentQuery.eq('bathrooms', filters.bathrooms);
      }
      if (filters.neighborhood) {
        apartmentQuery = apartmentQuery.ilike('location', `%${filters.neighborhood}%`);
      }
      if (filters.pet_friendly === true) {
        apartmentQuery = apartmentQuery.not('pet_policy', 'is', null);
      }
      if (filters.parking === true) {
        apartmentQuery = apartmentQuery.eq('parking_available', true);
      }
    }

    apartmentQuery = apartmentQuery.order('created_at', { ascending: false });

    const { data: results, error: queryError } = await apartmentQuery;

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    const resultsList = results || [];

    // Log the search
    await supabase.from('searches').insert({
      user_id: user.id,
      query_text: query,
      filters: (filters ?? null) as import('@/lib/database.types').Json,
      results_count: resultsList.length,
    });

    return NextResponse.json({
      query,
      filters: filters || null,
      results: resultsList,
      total: resultsList.length,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
