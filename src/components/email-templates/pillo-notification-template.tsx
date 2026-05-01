import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text
} from '@react-email/components';
import * as React from 'react';

interface PilloNotificationTemplateProps {
  preview: string;
  heading: string;
  greeting: string;
  message: string;
  details: Array<{ label: string; value: string }>;
  buttonText: string;
  actionUrl: string;
  footer: string;
}

/**
 * Рендерит email-уведомления мини-приложения Pillo.
 * @param props - локализованные тексты, детали приёма и ссылка действия.
 * @returns HTML-письмо для Resend.
 */
export const PilloNotificationTemplate = ({
  preview,
  heading,
  greeting,
  message,
  details,
  buttonText,
  actionUrl,
  footer
}: PilloNotificationTemplateProps) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>Pillo</Text>
          <Heading style={h1}>{heading}</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>{message}</Text>

          <Section style={detailsSection}>
            {details.map(item => (
              <Text key={item.label} style={detailRow}>
                <strong>{item.label}:</strong> {item.value}
              </Text>
            ))}
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={actionUrl}>
              {buttonText}
            </Button>
          </Section>

          <Text style={footerText}>{footer}</Text>
        </Container>
      </Body>
    </Html>
  );
};

const main: React.CSSProperties = {
  backgroundColor: '#f5f5f7',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: '36px 0'
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  boxShadow: '0 18px 48px rgba(15, 23, 42, 0.10)',
  margin: '0 auto',
  maxWidth: '520px',
  padding: '32px'
};

const logo: React.CSSProperties = {
  color: '#111827',
  fontSize: '18px',
  fontWeight: 700,
  margin: '0 0 16px',
  textAlign: 'center'
};

const h1: React.CSSProperties = {
  color: '#111827',
  fontSize: '24px',
  lineHeight: '30px',
  margin: '0 0 16px',
  textAlign: 'center'
};

const text: React.CSSProperties = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px'
};

const detailsSection: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '14px',
  margin: '20px 0',
  padding: '16px'
};

const detailRow: React.CSSProperties = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0 0 8px'
};

const buttonSection: React.CSSProperties = {
  margin: '28px 0',
  textAlign: 'center'
};

const button: React.CSSProperties = {
  backgroundColor: '#111827',
  borderRadius: '999px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 700,
  padding: '12px 28px',
  textDecoration: 'none'
};

const footerText: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '24px 0 0',
  textAlign: 'center'
};
