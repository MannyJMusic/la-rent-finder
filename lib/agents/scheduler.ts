/**
 * Appointment Scheduler Agent
 *
 * Receives scheduling requests from the orchestrator and:
 *  1. Suggests available time slots (stub - would integrate with Google Calendar)
 *  2. Drafts inquiry emails for landlords/property managers
 *  3. Drafts SMS messages for quick outreach
 *  4. Returns structured appointment data
 *
 * Currently operates in "draft" mode - it generates suggestions and
 * draft messages but does not actually send emails or create calendar
 * events. Those integrations would be added via Google Calendar API
 * and an email service (SendGrid, Resend, etc.).
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  BaseAgent,
  getAnthropicClient,
  streamText,
  MODELS,
} from './framework';
import type {
  AgentConfig,
  AppointmentData,
  StreamEvent,
  SubAgentContext,
  TimeSlot,
} from './types';
import {
  isGoogleCalendarConfigured,
  getAvailableSlots,
} from '@/lib/services/google-calendar';
import { createClient } from '@/lib/supabase/server';

// ─── Configuration ──────────────────────────────────────────────

const SCHEDULER_SYSTEM_PROMPT = `You are an appointment scheduling assistant for an LA rental apartment finder. Your job is to help users schedule property viewings.

When the user wants to schedule a viewing, you should:
1. Suggest reasonable time slots (weekday evenings 5-7 PM, weekends 10 AM - 4 PM)
2. Draft a professional but friendly email to the landlord/property manager
3. Draft a brief SMS message for quick outreach
4. Provide clear next steps

For the email draft, use this format:
- Subject line
- Professional greeting
- Express interest in the specific property
- Propose 2-3 viewing times
- Mention the renter briefly (they're a responsible tenant looking for a home)
- Professional sign-off

For the SMS draft, keep it under 160 characters.

Respond with JSON in this exact format (no markdown, no explanation):
{
  "emailSubject": "string",
  "emailBody": "string",
  "smsMessage": "string",
  "suggestedDate": "YYYY-MM-DD",
  "suggestedTime": "HH:MM",
  "notes": "string"
}`;

const SCHEDULER_CONFIG: AgentConfig = {
  name: 'AppointmentScheduler',
  model: MODELS.SONNET,
  systemPrompt: SCHEDULER_SYSTEM_PROMPT,
  maxTokens: 1024,
  temperature: 0.5,
  timeoutMs: 20_000,
};

// ─── Email Templates ────────────────────────────────────────────

const EMAIL_TEMPLATES = {
  initial_inquiry: (params: {
    propertyAddress: string;
    proposedTimes: string[];
    renterName?: string;
  }) => ({
    subject: `Viewing Request - ${params.propertyAddress}`,
    body: `Dear Property Manager,

I am writing to express my interest in the rental listing at ${params.propertyAddress}. I would love to schedule a viewing at your earliest convenience.

Would any of the following times work?
${params.proposedTimes.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

I am a responsible tenant with excellent references and a stable income. I would be happy to provide any additional information you may need.

Thank you for your time, and I look forward to hearing from you.

Best regards,
${params.renterName || '[Your Name]'}`,
  }),

  follow_up: (params: {
    propertyAddress: string;
    originalDate: string;
    renterName?: string;
  }) => ({
    subject: `Follow-up: Viewing Request - ${params.propertyAddress}`,
    body: `Dear Property Manager,

I hope this message finds you well. I am following up on my viewing request for the rental at ${params.propertyAddress}, which I sent on ${params.originalDate}.

I remain very interested in this property and would appreciate the opportunity to schedule a viewing. Please let me know if there are any available times that work for you.

Thank you again for your consideration.

Best regards,
${params.renterName || '[Your Name]'}`,
  }),

  confirmation: (params: {
    propertyAddress: string;
    confirmedTime: string;
    renterName?: string;
  }) => ({
    subject: `Confirmed: Viewing at ${params.propertyAddress}`,
    body: `Dear Property Manager,

Thank you for confirming the viewing at ${params.propertyAddress} for ${params.confirmedTime}. I will be there on time.

Is there anything I should bring or any specific instructions for accessing the property?

Looking forward to seeing the apartment.

Best regards,
${params.renterName || '[Your Name]'}`,
  }),
};

// ─── Scheduler Agent ────────────────────────────────────────────

export class AppointmentSchedulerAgent extends BaseAgent {
  private client: Anthropic;

  constructor() {
    super(SCHEDULER_CONFIG);
    this.client = getAnthropicClient();
  }

  async *execute(context: SubAgentContext): AsyncGenerator<StreamEvent> {
    yield this.statusEvent('scheduling');

    // Pre-fetch real calendar availability when Google Calendar is configured
    let calendarSlots: TimeSlot[] | null = null;
    if (isGoogleCalendarConfigured()) {
      try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14); // Look 2 weeks ahead
        calendarSlots = await getAvailableSlots(startDate, endDate, 60);
      } catch (err) {
        console.error('[Scheduler] Failed to fetch Google Calendar availability:', err);
        // Fall through to mock slot generation
      }
    }

    // Generate suggested time slots (uses real calendar data when available)
    const suggestedSlots = this.generateTimeSlots(context, calendarSlots);

    // Generate drafts via Claude or use templates
    let draftEmail: string;
    let draftSms: string;

    try {
      const drafts = await this.generateDrafts(context, suggestedSlots);
      draftEmail = drafts.email;
      draftSms = drafts.sms;
    } catch (err) {
      console.error('[Scheduler] Draft generation failed, using templates:', err);
      const templateDrafts = this.generateTemplateDrafts(context, suggestedSlots);
      draftEmail = templateDrafts.email;
      draftSms = templateDrafts.sms;
    }

    // Build appointment data
    const appointmentData: AppointmentData = {
      listingId: context.extractedParams.listingIds?.[0],
      suggestedSlots,
      draftEmail,
      draftSms,
      status: 'suggested',
    };

    // Persist the appointment to the appointments table if we have a listing and a slot
    const firstSlot = suggestedSlots.find((s) => s.available);
    if (appointmentData.listingId && firstSlot) {
      await this.persistAppointment(
        context.userId,
        appointmentData.listingId,
        firstSlot,
        draftEmail,
      );
    }

    // Emit the structured appointment event
    yield {
      type: 'appointment',
      appointment: appointmentData,
      agentName: this.name,
    };

    // Generate a conversational summary
    const summary = this.formatSummary(appointmentData, suggestedSlots);
    yield* streamText(summary, this.name, 20);
  }

  // ─── Persistence ──────────────────────────────────────────────

  private async persistAppointment(
    userId: string,
    listingId: string,
    slot: TimeSlot,
    draftEmail?: string,
  ): Promise<void> {
    try {
      const supabase = await createClient();
      const scheduledTime = new Date(`${slot.date}T${slot.startTime}:00`);

      await supabase.from('appointments').insert({
        user_id: userId,
        apartment_id: listingId,
        scheduled_time: scheduledTime.toISOString(),
        status: 'pending',
        notes: draftEmail
          ? `Draft email prepared. Awaiting confirmation.`
          : null,
      });
    } catch (err) {
      console.error('[Scheduler] Failed to persist appointment:', err);
      // Non-fatal
    }
  }

  // ─── Time Slot Generation ─────────────────────────────────────

  private generateTimeSlots(
    context: SubAgentContext,
    calendarSlots?: TimeSlot[] | null,
  ): TimeSlot[] {
    // If real Google Calendar slots are available, use them (filtered by user preferences)
    if (calendarSlots && calendarSlots.length > 0) {
      return this.mergeWithCalendarSlots(context, calendarSlots);
    }

    // Fallback: generate mock slots when Google Calendar is not configured
    return this.generateMockTimeSlots(context);
  }

  /**
   * Merges user-requested date/time preferences with real Google Calendar
   * availability data. Prioritizes slots that match user preferences, then
   * fills remaining suggestions from available calendar slots.
   */
  private mergeWithCalendarSlots(
    context: SubAgentContext,
    calendarSlots: TimeSlot[],
  ): TimeSlot[] {
    const availableSlots = calendarSlots.filter((s) => s.available);
    const requestedDate = context.extractedParams.requestedDate;
    const requestedTime = context.extractedParams.requestedTime;

    if (requestedDate) {
      // User specified a date - prefer slots on that date
      const matchingDateSlots = availableSlots.filter((s) => s.date === requestedDate);

      if (requestedTime) {
        // Sort by proximity to requested time
        const requestedMinutes = timeToMinutes(requestedTime);
        matchingDateSlots.sort((a, b) => {
          const diffA = Math.abs(timeToMinutes(a.startTime) - requestedMinutes);
          const diffB = Math.abs(timeToMinutes(b.startTime) - requestedMinutes);
          return diffA - diffB;
        });
      }

      // If we have matching-date slots, use them; otherwise fall back to all available
      if (matchingDateSlots.length > 0) {
        return matchingDateSlots.slice(0, 5);
      }
    }

    // No specific date requested, or no matching slots on that date:
    // Return the first available slots chronologically
    return availableSlots.slice(0, 5);
  }

  /**
   * Original mock slot generation logic, used as fallback when
   * Google Calendar is not configured or the API call fails.
   */
  private generateMockTimeSlots(context: SubAgentContext): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const now = new Date();

    // Requested date from user
    const requestedDate = context.extractedParams.requestedDate;
    const requestedTime = context.extractedParams.requestedTime;

    if (requestedDate) {
      // User specified a date - offer slots around their preference
      const timeStr = requestedTime || '14:00';
      const [hours] = timeStr.split(':').map(Number);

      // Offer the requested time and two alternatives
      slots.push({
        date: requestedDate,
        startTime: timeStr,
        endTime: `${hours + 1}:00`,
        available: true,
      });

      // Earlier option
      if (hours > 10) {
        slots.push({
          date: requestedDate,
          startTime: `${hours - 2}:00`,
          endTime: `${hours - 1}:00`,
          available: true,
        });
      }

      // Later option
      if (hours < 18) {
        slots.push({
          date: requestedDate,
          startTime: `${hours + 2}:00`,
          endTime: `${hours + 3}:00`,
          available: true,
        });
      }
    } else {
      // No date specified - suggest next available slots
      // Weekday evening slots
      for (let daysAhead = 1; daysAhead <= 7 && slots.length < 4; daysAhead++) {
        const date = new Date(now);
        date.setDate(date.getDate() + daysAhead);
        const dayOfWeek = date.getDay();
        const dateStr = date.toISOString().split('T')[0];

        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          // Weekday - offer evening slot
          slots.push({
            date: dateStr,
            startTime: '17:30',
            endTime: '18:30',
            available: true,
          });
        } else {
          // Weekend - offer morning and afternoon
          slots.push({
            date: dateStr,
            startTime: '10:00',
            endTime: '11:00',
            available: true,
          });
          slots.push({
            date: dateStr,
            startTime: '14:00',
            endTime: '15:00',
            available: true,
          });
        }
      }
    }

    return slots.slice(0, 5); // Max 5 suggestions
  }

  // ─── Draft Generation via Claude ──────────────────────────────

  private async generateDrafts(
    context: SubAgentContext,
    slots: TimeSlot[],
  ): Promise<{ email: string; sms: string }> {
    const slotDescriptions = slots
      .filter((s) => s.available)
      .map((s) => {
        const date = new Date(s.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        return `${dayName}, ${s.date} at ${s.startTime}`;
      });

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: this.config.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `The user wants to schedule a viewing. Here are the details:

User message: "${context.userMessage}"
${context.extractedParams.listingIds?.length ? `Listing ID: ${context.extractedParams.listingIds[0]}` : ''}
Available time slots:
${slotDescriptions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Generate a professional inquiry email and a brief SMS message.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from scheduler');
    }

    const raw = textBlock.text.trim();
    const jsonStr = raw.startsWith('{')
      ? raw
      : raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(jsonStr) as {
        emailSubject: string;
        emailBody: string;
        smsMessage: string;
      };

      return {
        email: `Subject: ${parsed.emailSubject}\n\n${parsed.emailBody}`,
        sms: parsed.smsMessage,
      };
    } catch {
      // If JSON parsing fails, use the raw text as email and generate simple SMS
      return {
        email: raw,
        sms: 'Hi! I am interested in viewing your rental listing. Are you available this week? Please let me know. Thank you!',
      };
    }
  }

  // ─── Template-Based Drafts (fallback) ─────────────────────────

  private generateTemplateDrafts(
    context: SubAgentContext,
    slots: TimeSlot[],
  ): { email: string; sms: string } {
    const proposedTimes = slots
      .filter((s) => s.available)
      .slice(0, 3)
      .map((s) => {
        const date = new Date(s.date);
        const dayName = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
        return `${dayName} at ${s.startTime}`;
      });

    const template = EMAIL_TEMPLATES.initial_inquiry({
      propertyAddress: 'the listed property',
      proposedTimes,
    });

    return {
      email: `Subject: ${template.subject}\n\n${template.body}`,
      sms: 'Hi! I\'m interested in your rental listing and would love to schedule a viewing. Are you available this week? Thanks!',
    };
  }

  // ─── Summary Formatting ───────────────────────────────────────

  private formatSummary(
    appointment: AppointmentData,
    slots: TimeSlot[],
  ): string {
    const availableSlots = slots.filter((s) => s.available);
    const parts: string[] = [];

    parts.push("Here's what I've prepared for scheduling a viewing:\n");

    parts.push('**Suggested Time Slots:**');
    availableSlots.forEach((slot, i) => {
      const date = new Date(slot.date);
      const dayName = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      parts.push(`  ${i + 1}. ${dayName} at ${slot.startTime} - ${slot.endTime}`);
    });

    parts.push('\n**Draft Email:**');
    parts.push(
      'I\'ve prepared an inquiry email you can send to the landlord/property manager. ' +
        'You can review and customize it before sending.',
    );

    parts.push('\n**Draft SMS:**');
    parts.push(
      'I\'ve also prepared a brief text message for quick outreach.',
    );

    parts.push(
      '\nWould you like me to adjust the times, modify the email draft, or help with anything else?',
    );

    return parts.join('\n');
  }
}

// ─── Module-level Helpers ──────────────────────────────────────

/**
 * Converts a 'HH:MM' time string to total minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}
