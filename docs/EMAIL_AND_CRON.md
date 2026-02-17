# Email notifications and cron

## Overview

- **Rolling plan reminder**: Sent ~2 days before the end of each month (cron runs on the 28th at 09:00 UTC). Tells users to cancel this month’s service and subscribe to next month’s.
- **Free users**: Max **2** reminder emails per **6 months**.
- **Paid users**: One reminder **every month** they have a plan (no cap).
- Users can turn notifications on/off at **Settings → Notifications** (`/settings/notifications`).

## Email transport (pluggable)

Set `EMAIL_PROVIDER=ses` (default) or `EMAIL_PROVIDER=smtp`.

### AWS SES (API, not SMTP)

We use the **SES API** (AWS SDK `SendEmail`), not the SES SMTP endpoint. You need **IAM credentials**, not the “SMTP credentials” from the SES console.

- `EMAIL_PROVIDER=ses` (or leave unset)
- `EMAIL_FROM` or `SES_FROM`: verified sender address (e.g. `notifications@yourdomain.com`)
- `AWS_REGION` or `SES_REGION`: e.g. `us-east-1`
- **IAM credentials**: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for an IAM user/role with permission to send email, e.g.:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ses:SendEmail",
      "Resource": "*"
    }
  ]
}
```

Do **not** use the SES “SMTP credentials” (username/password from SES console); those are only for the SMTP interface.

### SMTP (e.g. SendGrid, Mailgun, or any SMTP)

- `EMAIL_PROVIDER=smtp`
- `SMTP_HOST`, `SMTP_PORT` (e.g. `587`), `SMTP_USER`, `SMTP_PASSWORD`
- Optional: `EMAIL_FROM` or `SMTP_FROM`

## Cron (Vercel)

- **Route**: `GET /api/cron/rolling-reminder`
- **Schedule**: `0 9 28 * *` (28th of every month at 09:00 UTC). Adjust in `vercel.json` if you want a different day or time.
- **Auth**: Set `CRON_SECRET` in Vercel env. Vercel sends `Authorization: Bearer <CRON_SECRET>` when invoking the cron; the route rejects requests without it.
- **Bi-monthly**: To add a mid-month reminder, add a second cron in `vercel.json` with a different path or the same path and schedule e.g. `0 9 14 * *`. You may want a separate route that sends a “friendly reminder” variant so the 14th email is different from the 28th.

## Database (Supabase)

Run the migration so the cron and settings page work:

```bash
# In Supabase SQL editor, run:
# supabase_migration_notifications.sql
```

Tables:

- `user_notification_preferences`: per-user toggle for email reminders.
- `notification_sent`: log of sent emails (used to enforce “2 per 6 months” for free users).

## Testing email on demand

- **In the app:** Go to **Settings → Notifications** and click **Send test email**. One reminder is sent to your account email; it does not count toward the 2-per-6-months limit.
- **API:** While signed in, `GET` or `POST` `/api/test-rolling-reminder`. Sends one reminder to the current user’s primary email. No auth header needed (uses your session).

## Required env for cron

- `CRON_SECRET`: secret for cron auth (e.g. `openssl rand -hex 32`).
- `SUPABASE_SERVICE_ROLE_KEY`: so the cron can list users with shows and prefs (never expose to client).
- Email: either SES or SMTP vars as above.
- `NEXT_PUBLIC_APP_URL`: base URL for links in emails (e.g. `https://streamrolling.com`).
