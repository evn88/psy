import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text
} from '@react-email/components';
import * as React from 'react';

interface EventCancellationTranslations {
  heading: string;
  greeting: string;
  message: string;
  dateLabel: string;
  timeLabel: string;
  typeLabel: string;
  reasonLabel: string;
  button: string;
  footer: string;
}

interface EventCancellationTemplateProps {
  name: string;
  title: string;
  eventTypeLabel: string;
  dateText: string;
  timeText: string;
  reason?: string;
  manageUrl: string;
  translations: EventCancellationTranslations;
}

/**
 * Рендерит письмо об отмене события.
 */
export const EventCancellationTemplate = ({
  name,
  title,
  eventTypeLabel,
  dateText,
  timeText,
  reason,
  manageUrl,
  translations
}: EventCancellationTemplateProps) => {
  return (
    <Html>
      <Head />
      <Preview>{translations.heading}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logo}>🧠 Vershkov.com</Text>
          </Section>

          <Heading style={h1}>{translations.heading}</Heading>
          <Text style={text}>{translations.greeting}</Text>
          <Text style={text}>{translations.message}</Text>

          <Section style={detailsSection}>
            <Text style={detailRow}>
              <strong>{translations.typeLabel}:</strong> {eventTypeLabel}
            </Text>
            <Text style={detailRow}>
              <strong>{translations.dateLabel}:</strong> {dateText}
            </Text>
            <Text style={detailRow}>
              <strong>{translations.timeLabel}:</strong> {timeText}
            </Text>
            {reason && (
              <Text style={detailRow}>
                <strong>{translations.reasonLabel}:</strong> {reason}
              </Text>
            )}
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={manageUrl}>
              {translations.button}
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>{translations.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
};

const main: React.CSSProperties = {
  backgroundColor: '#f4f4f7',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  padding: '40px 0'
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '32px 40px',
  borderRadius: '12px',
  maxWidth: '512px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
};

const logoSection: React.CSSProperties = {
  textAlign: 'center' as const,
  marginBottom: '24px'
};

const logo: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#1a1a2e',
  margin: '0'
};

const h1: React.CSSProperties = {
  color: '#d93025', // red heading for cancellation
  fontSize: '22px',
  fontWeight: '700',
  lineHeight: '28px',
  margin: '0 0 16px',
  textAlign: 'center' as const
};

const text: React.CSSProperties = {
  color: '#4a4a68',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px'
};

const detailsSection: React.CSSProperties = {
  backgroundColor: '#fcf3f3', // slightly reddish background
  padding: '16px',
  borderRadius: '8px',
  margin: '20px 0'
};

const detailRow: React.CSSProperties = {
  color: '#4a4a68',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 8px'
};

const buttonSection: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '28px 0'
};

const button: React.CSSProperties = {
  backgroundColor: '#6c5ce7', // can keep brand color or change to gray
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px'
};

const hr: React.CSSProperties = {
  borderColor: '#eaeaf0',
  margin: '24px 0'
};

const footer: React.CSSProperties = {
  color: '#8e8ea0',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const
};
