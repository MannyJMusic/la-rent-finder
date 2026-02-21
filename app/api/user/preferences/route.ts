import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preferences: preferences || null });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface UpdatePreferencesBody {
  max_budget?: number | null;
  min_budget?: number | null;
  min_bedrooms?: number;
  max_bedrooms?: number | null;
  min_bathrooms?: number;
  max_bathrooms?: number | null;
  neighborhoods?: string[];
  amenities?: string[];
  pet_friendly?: boolean | null;
  parking_required?: boolean | null;
  furnished_preference?: string | null;
  lease_duration_months?: number | null;
  max_commute_minutes?: number | null;
  commute_address?: string | null;
  commute_lat?: number | null;
  commute_lon?: number | null;
  move_in_date?: string | null;
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as UpdatePreferencesBody;

    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          ...body,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preferences });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
