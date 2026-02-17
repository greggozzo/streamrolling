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
  /** Official cancel/manage URL from streaming-providers (optional). */
  cancelUrl?: string | null;
  cancelBy: string;
  subscribeService: string | null;
  subscribeMonthLabel: string;
  subscribeMonthKey: string;
}

const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Streamrolling';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://streamrolling.com';

export function buildRollingReminderHtml(payload: RollingReminderPayload): string {
  const { cancelService, cancelUrl, cancelBy, subscribeService, subscribeMonthLabel } = payload;

  const cancelBlock =
    cancelService != null
      ? cancelUrl
        ? `<p style="margin:0 0 8px 0; font-size: 15px; color: #e4e4e7;">Cancel <a href="${escapeHtml(cancelUrl)}" style="color: #34d399; font-weight: 700; text-decoration: none;">${escapeHtml(cancelService)}</a> by ${escapeHtml(cancelBy)}.</p><p style="margin:0; font-size: 13px;"><a href="${escapeHtml(cancelUrl)}" style="color: #34d399; text-decoration: underline;">Go to cancel page →</a></p>`
        : `<p style="margin:0; font-size: 15px; color: #e4e4e7;">Cancel <strong>${escapeHtml(cancelService)}</strong> by ${escapeHtml(cancelBy)}.</p>`
      : '<p style="margin:0; font-size: 15px; color: #a1a1aa;">No subscription to cancel this month.</p>';

  const subscribeBlock =
    subscribeService != null
      ? `<p style="margin:0; font-size: 15px; color: #e4e4e7;">Subscribe to <strong style="color: #fff;">${escapeHtml(subscribeService)}</strong> for ${escapeHtml(subscribeMonthLabel)}.</p>`
      : '<p style="margin:0; font-size: 15px; color: #a1a1aa;">No new subscription needed for next month.</p>';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your rolling plan reminder</title>
</head>
<body style="margin:0; padding:0; background-color: #18181b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #18181b;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px;">
          <tr>
            <td style="background-color: #1e293b; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.4);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: #0f172a; padding: 24px 28px 20px; border-bottom: 1px solid #27272a;">
                    <div style="display: inline-block; background: #34d399; color: #022c22; font-weight: 800; font-size: 18px; letter-spacing: -0.02em; padding: 8px 14px; border-radius: 10px;">Streamrolling</div>
                    <h1 style="margin: 20px 0 0 0; font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.02em;">Your rolling plan reminder</h1>
                    <p style="margin: 8px 0 0 0; font-size: 15px; color: #a1a1aa;">Next step in your streaming plan.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                      <tr>
                        <td style="background: #27272a; border-radius: 12px; padding: 18px 20px; border-left: 4px solid #34d399;">
                          <p style="margin:0 0 6px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #34d399; font-weight: 600;">Cancel this month</p>
                          ${cancelBlock}
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background: #27272a; border-radius: 12px; padding: 18px 20px; border-left: 4px solid #71717a;">
                          <p style="margin:0 0 6px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; font-weight: 600;">Subscribe next month</p>
                          ${subscribeBlock}
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
                      <tr>
                        <td align="center">
                          <a href="${escapeHtml(BASE_URL)}/dashboard" style="display: inline-block; background: #34d399; color: #022c22; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 28px; border-radius: 10px;">View your plan</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 28px 24px; border-top: 1px solid #27272a;">
                    <p style="margin:0; font-size: 12px; color: #71717a;">You’re receiving this because you turned on email reminders. <a href="${escapeHtml(BASE_URL)}/settings/notifications" style="color: #34d399; text-decoration: underline;">Notification settings</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export function buildRollingReminderText(payload: RollingReminderPayload): string {
  const { cancelService, cancelUrl, cancelBy, subscribeService, subscribeMonthLabel } = payload;
  const cancelLine =
    cancelService != null
      ? cancelUrl
        ? `Cancel ${cancelService} by ${cancelBy}.\nCancel link: ${cancelUrl}`
        : `Cancel ${cancelService} by ${cancelBy}.`
      : 'No subscription to cancel this month.';
  const subscribeLine =
    subscribeService != null
      ? `Subscribe to ${subscribeService} for ${subscribeMonthLabel}.`
      : 'No new subscription needed for next month.';
  return `Your rolling plan reminder – ${SITE_NAME}\n\n${cancelLine}\n\n${subscribeLine}\n\nView your plan: ${BASE_URL}/dashboard\n\nTurn off these emails: ${BASE_URL}/settings/notifications`;
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

export type { IEmailTransport, MailPayload };
