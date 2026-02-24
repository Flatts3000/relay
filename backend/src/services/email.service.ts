import { render } from '@react-email/render';
import { config } from '../config.js';
import { MagicLinkEmail } from '../emails/magic-link.js';
import { OnboardingInviteEmail } from '../emails/onboarding-invite.js';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Send an email using the configured provider.
 * console  → log to terminal (development)
 * resend   → Resend API (early production)
 * ses      → AWS SES (production)
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  if (config.email.provider === 'console') {
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

  if (config.email.provider === 'resend') {
    await sendWithResend(options);
    return;
  }

  await sendWithSES(options);
}

/**
 * Send email using Resend API.
 */
async function sendWithResend(options: EmailOptions): Promise<void> {
  // Dynamic import to avoid loading the SDK when not in use
  const { Resend } = await import('resend');

  const resend = new Resend(config.email.resendApiKey);

  const { error } = await resend.emails.send({
    from: `${config.email.fromName} <${config.email.fromAddress}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }
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

  const element = MagicLinkEmail({ magicLinkUrl });
  const html = await render(element);
  const text = await render(element, { plainText: true });

  await sendEmail({
    to: email,
    subject: 'Your Relay Login Link',
    text,
    html,
  });
}

/**
 * Send an onboarding invite email.
 */
export async function sendOnboardingInviteEmail(
  email: string,
  token: string,
  roleName: string,
  inviterEmail: string,
  contextName?: string
): Promise<void> {
  const inviteUrl = `${config.frontendUrl}/onboarding?token=${token}`;

  const element = OnboardingInviteEmail({
    inviteUrl,
    roleName,
    contextName,
    inviterEmail,
  });
  const html = await render(element);
  const text = await render(element, { plainText: true });

  await sendEmail({
    to: email,
    subject: `You've been invited to join Relay`,
    text,
    html,
  });
}
