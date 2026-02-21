import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  isGoogleCalendarConfigured,
  createCalendarEvent,
} from '@/lib/services/google-calendar';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*, apartments(*)')
      .eq('user_id', user.id)
      .order('scheduled_time', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointments: appointments || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface CreateAppointmentBody {
  apartment_id: string;
  scheduled_time: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateAppointmentBody;
    const { apartment_id, scheduled_time, notes } = body;

    if (!apartment_id || !scheduled_time) {
      return NextResponse.json(
        { error: 'apartment_id and scheduled_time are required' },
        { status: 400 }
      );
    }

    // Verify the apartment exists
    const { data: apartment, error: aptError } = await supabase
      .from('apartments')
      .select('id')
      .eq('id', apartment_id)
      .single();

    if (aptError || !apartment) {
      return NextResponse.json({ error: 'Apartment not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        user_id: user.id,
        apartment_id,
        scheduled_time,
        notes: notes || null,
        status: 'scheduled',
      })
      .select('*, apartments(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ─── Google Calendar Sync ──────────────────────────────────
    // Create a calendar event if Google Calendar is configured.
    // Failures here are non-blocking; we log the error but still
    // return the successfully-created appointment.
    let calendarEventId: string | undefined;
    let calendarHtmlLink: string | undefined;

    if (isGoogleCalendarConfigured() && data) {
      try {
        const startTime = new Date(scheduled_time);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour default

        // Build a descriptive summary and location from the apartment data
        const apartmentData = data.apartments as Record<string, unknown> | null;
        const address = (apartmentData?.address as string) || 'TBD';
        const title = (apartmentData?.title as string) || 'Apartment';

        const calendarResult = await createCalendarEvent({
          summary: `Apartment Viewing: ${title}`,
          description: [
            `Apartment viewing scheduled via LA Rent Finder.`,
            ``,
            `Property: ${title}`,
            `Address: ${address}`,
            notes ? `Notes: ${notes}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          startTime,
          endTime,
          location: address,
        });

        if (calendarResult.success) {
          calendarEventId = calendarResult.eventId;
          calendarHtmlLink = calendarResult.htmlLink;

          // Store the Google Calendar event ID in the appointment notes/metadata
          const updatedNotes = [
            notes || '',
            `[Google Calendar Event: ${calendarEventId}]`,
          ]
            .filter(Boolean)
            .join(' | ');

          await supabase
            .from('appointments')
            .update({ notes: updatedNotes })
            .eq('id', String((data as Record<string, unknown>).id));
        } else {
          console.error(
            '[Appointments] Google Calendar event creation failed:',
            calendarResult.error,
          );
        }
      } catch (calendarErr) {
        console.error(
          '[Appointments] Google Calendar sync error (non-blocking):',
          calendarErr,
        );
      }
    }

    return NextResponse.json(
      {
        appointment: data,
        ...(calendarEventId && {
          googleCalendar: {
            eventId: calendarEventId,
            htmlLink: calendarHtmlLink,
          },
        }),
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
