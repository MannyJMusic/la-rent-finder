import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

interface TwilioResult {
  success: boolean;
  sid?: string;
  error?: string;
}

export function isTwilioConfigured(): boolean {
  return Boolean(accountSid && authToken && fromNumber);
}

export async function sendSms(to: string, body: string): Promise<TwilioResult> {
  if (!client || !fromNumber) {
    return { success: false, error: 'Twilio is not configured' };
  }

  try {
    const message = await client.messages.create({
      to,
      from: fromNumber,
      body,
    });
    return { success: true, sid: message.sid };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown Twilio error';
    return { success: false, error: errorMessage };
  }
}

export async function initiateCall(
  to: string,
  twimlUrl?: string
): Promise<TwilioResult> {
  if (!client || !fromNumber) {
    return { success: false, error: 'Twilio is not configured' };
  }

  try {
    const call = await client.calls.create({
      to,
      from: fromNumber,
      url: twimlUrl || 'http://demo.twilio.com/docs/voice.xml',
    });
    return { success: true, sid: call.sid };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown Twilio error';
    return { success: false, error: errorMessage };
  }
}
