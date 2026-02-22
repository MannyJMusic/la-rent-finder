import { createClient } from '@/lib/supabase/server';
import { isTwilioConfigured, sendSms } from '@/lib/services/twilio';
import { NextRequest, NextResponse } from 'next/server';
import type { Json } from '@/lib/database.types';

interface SendSmsBody {
  apartment_id: string;
  body: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reqBody = (await request.json()) as SendSmsBody;
    const { apartment_id, body } = reqBody;

    if (!apartment_id || !body) {
      return NextResponse.json(
        { error: 'apartment_id and body are required' },
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
    };

    if (isTwilioConfigured() && apartment.contact_phone) {
      const result = await sendSms(apartment.contact_phone, body);
      if (result.success) {
        status = 'sent';
        metadata.twilio_sid = result.sid ?? null;
      } else {
        status = 'failed';
        metadata.error = result.error ?? null;
      }
    } else {
      metadata.stub = true;
      metadata.note = 'SMS service not configured - logged for future delivery';
    }

    const { data: communication, error: insertError } = await supabase
      .from('communications')
      .insert({
        user_id: user.id,
        apartment_id,
        type: 'sms' as const,
        subject: null,
        body,
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
