import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Link,
  Hr,
} from '@react-email/components';

interface OnboardingInviteEmailProps {
  inviteUrl: string;
  roleName: string;
  contextName?: string; // hub or group name
  inviterEmail: string;
  expiryHours?: number;
}

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export function OnboardingInviteEmail({
  inviteUrl,
  roleName,
  contextName,
  inviterEmail,
  expiryHours = 72,
}: OnboardingInviteEmailProps) {
  const contextText = contextName ? ` for ${contextName}` : '';

  return (
    <Html>
      <Head />
      <Preview>You've been invited to join Relay as {roleName}</Preview>
      <Body
        style={{
          fontFamily,
          lineHeight: '1.6',
          color: '#333',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        <Container style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Section style={{ textAlign: 'center' as const, marginBottom: '30px' }}>
            <Text
              style={{
                color: '#1a1a1a',
                fontSize: '24px',
                fontWeight: 'bold',
                margin: '0',
              }}
            >
              Relay
            </Text>
          </Section>

          <Section
            style={{
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              padding: '30px',
              marginBottom: '20px',
            }}
          >
            <Text style={{ marginTop: '0' }}>Hello,</Text>

            <Text>
              You've been invited by <strong>{inviterEmail}</strong> to join Relay as a{' '}
              <strong>{roleName}</strong>
              {contextText}.
            </Text>

            <Text>Click the button below to accept the invitation and set up your account:</Text>

            <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
              <Button
                href={inviteUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '12px 30px',
                  borderRadius: '6px',
                  fontWeight: '500',
                }}
              >
                Accept Invitation
              </Button>
            </Section>

            <Text style={{ color: '#666', fontSize: '14px' }}>
              This invitation will expire in <strong>{expiryHours} hours</strong>.
            </Text>

            <Text style={{ color: '#666', fontSize: '14px', marginBottom: '0' }}>
              If you didn't expect this invitation, you can safely ignore this email.
            </Text>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '0' }} />

          <Section
            style={{
              color: '#666',
              fontSize: '12px',
              textAlign: 'center' as const,
              paddingTop: '20px',
            }}
          >
            <Text style={{ margin: '0' }}>
              <strong>Relay</strong> - Connecting mutual aid groups with fund hubs
            </Text>
            <Text style={{ margin: '5px 0 0 0' }}>
              <Link
                href="https://relayfunds.org"
                style={{ color: '#2563eb', textDecoration: 'none' }}
              >
                relayfunds.org
              </Link>
            </Text>
          </Section>

          <Section
            style={{
              color: '#999',
              fontSize: '11px',
              textAlign: 'center' as const,
              marginTop: '20px',
            }}
          >
            <Text style={{ margin: '0' }}>
              If the button doesn't work, copy and paste this URL into your browser:
            </Text>
            <Text style={{ margin: '5px 0 0 0', wordBreak: 'break-all' as const }}>
              {inviteUrl}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
