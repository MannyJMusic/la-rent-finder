import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const fromEmail =
  process.env.FROM_EMAIL || 'LA Rent Finder <noreply@larentfinder.com>';

const client = apiKey ? new Resend(apiKey) : null;

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(apiKey);
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<EmailResult> {
  if (!client) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html: body,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown email error';
    return { success: false, error: errorMessage };
  }
}
