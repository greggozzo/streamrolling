/**
 * SMTP email transport (e.g. SendGrid, Mailgun, or any SMTP with username/password).
 * Set EMAIL_PROVIDER=smtp and SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD.
 */
import nodemailer from 'nodemailer';
import type { IEmailTransport, MailPayload } from './types';

const FROM = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'notifications@streamrolling.com';

export function createSmtpTransport(): IEmailTransport {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP transport requires SMTP_HOST, SMTP_USER, and SMTP_PASSWORD environment variables.'
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return {
    async send(payload: MailPayload) {
      await transporter.sendMail({
        from: payload.from || FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
    },
  };
}
