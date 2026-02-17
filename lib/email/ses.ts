/**
 * AWS SES email transport. Set EMAIL_PROVIDER=ses and AWS region/credentials.
 */
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { IEmailTransport, MailPayload } from './types';

const FROM = process.env.EMAIL_FROM || process.env.SES_FROM || 'notifications@streamrolling.com';
const REGION = process.env.AWS_REGION || process.env.SES_REGION || 'us-east-1';

export function createSesTransport(): IEmailTransport {
  const client = new SESClient({ region: REGION });

  return {
    async send(payload: MailPayload) {
      const command = new SendEmailCommand({
        Source: payload.from || FROM,
        Destination: { ToAddresses: [payload.to] },
        Message: {
          Subject: { Data: payload.subject, Charset: 'UTF-8' },
          Body: {
            ...(payload.html && { Html: { Data: payload.html, Charset: 'UTF-8' } }),
            ...(payload.text && { Text: { Data: payload.text, Charset: 'UTF-8' } }),
          },
        },
      });
      await client.send(command);
    },
  };
}
