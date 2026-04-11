import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean }> {
  try {
    await resend.emails.send({
      from: 'Staff Manager <noreply@testbusters.it>',
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error('[email] send failed to', to, err);
    return { success: false };
  }
}
