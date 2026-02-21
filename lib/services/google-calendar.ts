/**
 * Google Calendar Service
 *
 * Integrates with Google Calendar API v3 to:
 *  - Check real calendar availability via the FreeBusy API
 *  - Create calendar events for apartment viewings
 *
 * Uses OAuth2 with a refresh token (not interactive OAuth).
 * If credentials are not configured, all functions degrade gracefully:
 *  - getAvailableSlots() returns []
 *  - createCalendarEvent() returns { success: false, error: '...' }
 */

import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';
import type { TimeSlot } from '@/lib/agents/types';

// ─── Environment Variables ──────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN ?? '';
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

// ─── Types ──────────────────────────────────────────────────────

export interface CreateEventParams {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
}

export interface CreateEventResult {
  success: boolean;
  eventId?: string;
  htmlLink?: string;
  error?: string;
}

// ─── Configuration Check ────────────────────────────────────────

/**
 * Returns true when all required Google Calendar credentials are present.
 */
export function isGoogleCalendarConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN);
}

// ─── OAuth2 Client ──────────────────────────────────────────────

/**
 * Creates and returns an authenticated OAuth2 client using the
 * configured refresh token. The client automatically handles
 * access-token refreshing.
 *
 * Throws if credentials are not configured.
 */
export function getCalendarClient(): calendar_v3.Calendar {
  if (!isGoogleCalendarConfigured()) {
    throw new Error('Google Calendar credentials are not configured');
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// ─── Availability ───────────────────────────────────────────────

/**
 * Queries Google Calendar for busy periods between startDate and endDate,
 * then computes available TimeSlot[] within preferred viewing windows:
 *
 *   Weekdays:  5:00 PM - 7:00 PM  (evening viewings)
 *   Weekends: 10:00 AM - 4:00 PM  (daytime viewings)
 *
 * Slots are generated in increments of `durationMinutes` (default 60).
 *
 * Returns an empty array if Google Calendar is not configured.
 */
export async function getAvailableSlots(
  startDate: Date,
  endDate: Date,
  durationMinutes: number = 60,
): Promise<TimeSlot[]> {
  if (!isGoogleCalendarConfigured()) {
    return [];
  }

  let busyPeriods: Array<{ start: string; end: string }> = [];

  try {
    const calendar = getCalendarClient();

    const freeBusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: GOOGLE_CALENDAR_ID }],
      },
    });

    const calendars = freeBusyResponse.data.calendars;
    if (calendars && calendars[GOOGLE_CALENDAR_ID]) {
      busyPeriods = (calendars[GOOGLE_CALENDAR_ID].busy || []).map((b) => ({
        start: b.start || '',
        end: b.end || '',
      }));
    }
  } catch (err) {
    console.error('[GoogleCalendar] FreeBusy query failed:', err);
    // Return empty slots rather than crashing
    return [];
  }

  // Build candidate slots within preferred viewing windows
  const slots: TimeSlot[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
    const dateStr = formatDateStr(current);

    // Determine viewing windows for this day
    const windows = getViewingWindows(dayOfWeek);

    for (const window of windows) {
      // Generate slots within this window
      const windowSlots = generateWindowSlots(
        current,
        dateStr,
        window.startHour,
        window.startMinute,
        window.endHour,
        window.endMinute,
        durationMinutes,
      );

      for (const slot of windowSlots) {
        const slotStart = new Date(`${slot.date}T${slot.startTime}:00`);
        const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);

        // Skip slots in the past
        if (slotStart <= new Date()) {
          continue;
        }

        // Check against busy periods
        const isBusy = busyPeriods.some((busy) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          // Overlap check: slot overlaps if slotStart < busyEnd && slotEnd > busyStart
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        slots.push({
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          available: !isBusy,
        });
      }
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  return slots;
}

// ─── Event Creation ─────────────────────────────────────────────

/**
 * Creates a Google Calendar event for an apartment viewing.
 *
 * Returns a result object indicating success or failure.
 * If Google Calendar is not configured, returns a graceful failure.
 */
export async function createCalendarEvent(
  params: CreateEventParams,
): Promise<CreateEventResult> {
  if (!isGoogleCalendarConfigured()) {
    return {
      success: false,
      error: 'Google Calendar not configured',
    };
  }

  try {
    const calendar = getCalendarClient();

    const event: calendar_v3.Schema$Event = {
      summary: params.summary,
      description: params.description,
      start: {
        dateTime: params.startTime.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
      end: {
        dateTime: params.endTime.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'email', minutes: 1440 }, // 24 hours
        ],
      },
    };

    if (params.location) {
      event.location = params.location;
    }

    const response = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody: event,
    });

    return {
      success: true,
      eventId: response.data.id || undefined,
      htmlLink: response.data.htmlLink || undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error creating calendar event';
    console.error('[GoogleCalendar] Event creation failed:', err);
    return {
      success: false,
      error: message,
    };
  }
}

// ─── Internal Helpers ───────────────────────────────────────────

interface ViewingWindow {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

/**
 * Returns preferred viewing windows for a given day of week.
 *
 *   Monday-Friday (1-5): 5:00 PM - 7:00 PM
 *   Saturday-Sunday (0, 6): 10:00 AM - 4:00 PM
 */
function getViewingWindows(dayOfWeek: number): ViewingWindow[] {
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Weekend: 10 AM - 4 PM
    return [{ startHour: 10, startMinute: 0, endHour: 16, endMinute: 0 }];
  }
  // Weekday: 5 PM - 7 PM
  return [{ startHour: 17, startMinute: 0, endHour: 19, endMinute: 0 }];
}

/**
 * Generates TimeSlot candidates within a single viewing window.
 */
function generateWindowSlots(
  dayDate: Date,
  dateStr: string,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  durationMinutes: number,
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  let currentMinutes = startHour * 60 + startMinute;
  const windowEndMinutes = endHour * 60 + endMinute;

  while (currentMinutes + durationMinutes <= windowEndMinutes) {
    const slotStartHour = Math.floor(currentMinutes / 60);
    const slotStartMin = currentMinutes % 60;
    const slotEndMinutes = currentMinutes + durationMinutes;
    const slotEndHour = Math.floor(slotEndMinutes / 60);
    const slotEndMin = slotEndMinutes % 60;

    slots.push({
      date: dateStr,
      startTime: `${pad(slotStartHour)}:${pad(slotStartMin)}`,
      endTime: `${pad(slotEndHour)}:${pad(slotEndMin)}`,
      available: true, // Will be updated after busy-period check
    });

    currentMinutes += durationMinutes;
  }

  return slots;
}

/**
 * Formats a Date as 'YYYY-MM-DD'.
 */
function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
}

/**
 * Zero-pads a number to two digits.
 */
function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
