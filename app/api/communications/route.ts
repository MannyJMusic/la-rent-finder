import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const apartment_id = searchParams.get('apartment_id');
  const type = searchParams.get('type');
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  try {
    let query = supabase
      .from('communications')
      .select('*, properties(*)', { count: 'exact' })
      .eq('user_id', user.id);

    if (apartment_id) {
      query = query.eq('apartment_id', apartment_id);
    }
    if (type && ['email', 'sms', 'call'].includes(type)) {
      query = query.eq('type', type);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: communications, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      communications: communications || [],
      total: count || 0,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
