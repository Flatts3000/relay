import { config } from '../config.js';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Send an email using the configured provider.
 * In development: logs to console
 * In production: uses AWS SES
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  if (config.email.provider === 'console') {
    // Development mode: log to console
    console.log('──────────────────────────────────────────────');
    console.log('📧 EMAIL (dev mode - not actually sent)');
    console.log('──────────────────────────────────────────────');
    console.log(`To: ${options.to}`);
    console.log(`From: ${config.email.fromName} <${config.email.fromAddress}>`);
    console.log(`Subject: ${options.subject}`);
    console.log('──────────────────────────────────────────────');
    console.log(options.text);
    console.log('──────────────────────────────────────────────');
    return;
  }

  // Production mode: use AWS SES
  // Note: In production, AWS SDK would be imported dynamically
  // and SES credentials would come from the IAM role
  await sendWithSES(options);
}

/**
 * Send email using AWS SES.
 * Credentials come from IAM role in production (Fargate task role).
 */
async function sendWithSES(options: EmailOptions): Promise<void> {
  // Dynamic import to avoid loading AWS SDK in development
  const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');

  const client = new SESClient({ region: config.email.sesRegion });

  const command = new SendEmailCommand({
    Source: `${config.email.fromName} <${config.email.fromAddress}>`,
    Destination: {
      ToAddresses: [options.to],
    },
    Message: {
      Subject: {
        Data: options.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: options.text,
          Charset: 'UTF-8',
        },
        Html: {
          Data: options.html,
          Charset: 'UTF-8',
        },
      },
    },
  });

  await client.send(command);
}

/**
 * Generate magic link URL
 */
function getMagicLinkUrl(token: string): string {
  return `${config.frontendUrl}/login?token=${token}`;
}

/**
 * Send a magic link email for passwordless authentication.
 */
export async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  const magicLinkUrl = getMagicLinkUrl(token);
  const expiryMinutes = 15;

  const subject = 'Your Relay Login Link';

  const text = `
Hello,

Click the link below to sign in to Relay:

${magicLinkUrl}

This link will expire in ${expiryMinutes} minutes.

If you didn't request this link, you can safely ignore this email.

---
Relay - Connecting mutual aid groups with fund hubs
https://relayfunds.org
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Relay Login Link</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">Relay</h1>
  </div>

  <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <p style="margin-top: 0;">Hello,</p>

    <p>Click the button below to sign in to your Relay account:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLinkUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">
        Sign In to Relay
      </a>
    </div>

    <p style="color: #666; font-size: 14px;">
      This link will expire in <strong>${expiryMinutes} minutes</strong>.
    </p>

    <p style="color: #666; font-size: 14px; margin-bottom: 0;">
      If you didn't request this link, you can safely ignore this email.
    </p>
  </div>

  <div style="color: #666; font-size: 12px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
    <p style="margin: 0;">
      <strong>Relay</strong> - Connecting mutual aid groups with fund hubs
    </p>
    <p style="margin: 5px 0 0 0;">
      <a href="https://relayfunds.org" style="color: #2563eb; text-decoration: none;">relayfunds.org</a>
    </p>
  </div>

  <div style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">
    <p style="margin: 0;">
      If the button doesn't work, copy and paste this URL into your browser:
    </p>
    <p style="margin: 5px 0 0 0; word-break: break-all;">
      ${magicLinkUrl}
    </p>
  </div>
</body>
</html>
`.trim();

  await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}
