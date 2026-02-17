/**
 * Email transport abstraction so we can switch between AWS SES and SMTP
 * (e.g. another provider with username/password) via env config.
 */

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface IEmailTransport {
  send(payload: MailPayload): Promise<void>;
}
