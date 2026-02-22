import { createClient } from '@/lib/supabase/server';
import { isTwilioConfigured, initiateCall } from '@/lib/services/twilio';
import { NextRequest, NextResponse } from 'next/server';
import type { Json } from '@/lib/database.types';

interface InitiateCallBody {
  apartment_id: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reqBody = (await request.json()) as InitiateCallBody;
    const { apartment_id, notes } = reqBody;

    if (!apartment_id) {
      return NextResponse.json(
        { error: 'apartment_id is required' },
        { status: 400 }
      );
    }

    // Fetch the apartment to get contact info
    const { data: apartment, error: aptError } = await supabase
      .from('properties')
      .select('id, contact_email, contact_phone, landlord_name, title')
      .eq('id', apartment_id)
      .single();

    if (aptError || !apartment) {
      return NextResponse.json({ error: 'Apartment not found' }, { status: 404 });
    }

    let status: 'sent' | 'failed' | 'queued' = 'queued';
    let metadata: Record<string, Json> = {
      landlord_name: apartment.landlord_name,
      listing_title: apartment.title,
      talking_points: notes || null,
    };

    if (isTwilioConfigured() && apartment.contact_phone) {
      const result = await initiateCall(apartment.contact_phone);
      if (result.success) {
        status = 'sent';
        metadata.twilio_sid = result.sid ?? null;
      } else {
        status = 'failed';
        metadata.error = result.error ?? null;
      }
    } else {
      metadata.stub = true;
      metadata.note = 'AI call service not configured - logged for future execution';
    }

    const { data: communication, error: insertError } = await supabase
      .from('communications')
      .insert({
        user_id: user.id,
        apartment_id,
        type: 'call' as const,
        subject: null,
        body: notes || 'AI phone call inquiry',
        recipient_email: null,
        recipient_phone: apartment.contact_phone,
        status,
        metadata,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ communication }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
