/**
 * Email sending with pluggable transport (AWS SES or SMTP).
 * Configure via env: EMAIL_PROVIDER=ses | smtp, then provider-specific vars.
 */
import type { IEmailTransport, MailPayload } from './types';
import { createSesTransport } from './ses';
import { createSmtpTransport } from './smtp';
let cachedTransport: IEmailTransport | null = null;

export function getEmailTransport(): IEmailTransport | null {
  if (cachedTransport) return cachedTransport;
  const provider = (process.env.EMAIL_PROVIDER || 'ses').toLowerCase();
  if (provider === 'smtp') {
    try {
      cachedTransport = createSmtpTransport();
    } catch (e) {
      console.error('[email] SMTP transport init failed:', e);
      return null;
    }
  } else {
    cachedTransport = createSesTransport();
  }
  return cachedTransport;
}

export async function sendMail(payload: MailPayload): Promise<boolean> {
  const transport = getEmailTransport();
  if (!transport) {
    console.error('[email] No transport configured (EMAIL_PROVIDER and provider env vars)');
    return false;
  }
  try {
    await transport.send(payload);
    return true;
  } catch (e) {
    console.error('[email] Send failed:', e);
    return false;
  }
}

/** Payload for the rolling plan reminder email. */
export interface RollingReminderPayload {
  cancelService: string | null;
  cancelBy: string;
  subscribeService: string | null;
  subscribeMonthLabel: string;
  subscribeMonthKey: string;
}

const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Streamrolling';

export function buildRollingReminderHtml(payload: RollingReminderPayload): string {
  const { cancelService, cancelBy, subscribeService, subscribeMonthLabel } = payload;
  const cancelLine =
    cancelService != null
      ? `<p>Cancel <strong>${escapeHtml(cancelService)}</strong> by ${escapeHtml(cancelBy)}.</p>`
      : '<p>No subscription to cancel this month.</p>';
  const subscribeLine =
    subscribeService != null
      ? `<p>Subscribe to <strong>${escapeHtml(subscribeService)}</strong> for ${escapeHtml(subscribeMonthLabel)}.</p>`
      : '<p>No new subscription needed for next month.</p>';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h1 style="font-size: 1.25rem;">Your rolling plan reminder</h1>
  <p>Here’s your reminder for the next step in your streaming plan.</p>
  ${cancelLine}
  ${subscribeLine}
  <p style="margin-top: 24px;"><a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL || 'https://streamrolling.com')}/dashboard" style="color: #2563eb;">View your plan</a></p>
  <p style="margin-top: 32px; font-size: 0.875rem; color: #6b7280;">You’re receiving this because you turned on email reminders in ${escapeHtml(SITE_NAME)}. You can turn them off in <a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL || 'https://streamrolling.com')}/settings/notifications">notification settings</a>.</p>
</body>
</html>
`.trim();
}

export function buildRollingReminderText(payload: RollingReminderPayload): string {
  const { cancelService, cancelBy, subscribeService, subscribeMonthLabel } = payload;
  const cancelLine =
    cancelService != null
      ? `Cancel ${cancelService} by ${cancelBy}.`
      : 'No subscription to cancel this month.';
  const subscribeLine =
    subscribeService != null
      ? `Subscribe to ${subscribeService} for ${subscribeMonthLabel}.`
      : 'No new subscription needed for next month.';
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://streamrolling.com';
  return `Your rolling plan reminder\n\n${cancelLine}\n${subscribeLine}\n\nView your plan: ${base}/dashboard\n\nYou can turn off these emails in ${base}/settings/notifications`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendRollingReminder(
  to: string,
  payload: RollingReminderPayload
): Promise<boolean> {
  const subject = `Reminder: ${payload.subscribeMonthLabel} – ${SITE_NAME} rolling plan`;
  return sendMail({
    to,
    subject,
    html: buildRollingReminderHtml(payload),
    text: buildRollingReminderText(payload),
  });
}

export type { IEmailTransport, MailPayload, RollingReminderPayload };
