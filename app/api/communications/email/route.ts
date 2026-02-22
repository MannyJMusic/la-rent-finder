import { createClient } from '@/lib/supabase/server';
import { isEmailConfigured, sendEmail } from '@/lib/services/resend';
import { NextRequest, NextResponse } from 'next/server';
import type { Json } from '@/lib/database.types';

interface SendEmailBody {
  apartment_id: string;
  subject: string;
  body: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reqBody = (await request.json()) as SendEmailBody;
    const { apartment_id, subject, body } = reqBody;

    if (!apartment_id || !subject || !body) {
      return NextResponse.json(
        { error: 'apartment_id, subject, and body are required' },
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

    if (isEmailConfigured() && apartment.contact_email) {
      const result = await sendEmail(apartment.contact_email, subject, body);
      if (result.success) {
        status = 'sent';
        metadata.resend_id = result.id ?? null;
      } else {
        status = 'failed';
        metadata.error = result.error ?? null;
      }
    } else {
      metadata.stub = true;
      metadata.note = 'Email service not configured - logged for future delivery';
    }

    const { data: communication, error: insertError } = await supabase
      .from('communications')
      .insert({
        user_id: user.id,
        apartment_id,
        type: 'email' as const,
        subject,
        body,
        recipient_email: apartment.contact_email,
        recipient_phone: null,
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
