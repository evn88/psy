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

interface FinancialNotificationTemplateProps {
  preview: string;
  heading: string;
  greeting: string;
  message: string;
  details: Array<{ label: string; value: string }>;
  actionUrl: string;
  actionText: string;
}

/**
 * Универсальный шаблон обязательного финансового уведомления.
 */
export const FinancialNotificationTemplate = ({
  preview,
  heading,
  greeting,
  message,
  details,
  actionUrl,
  actionText
}: FinancialNotificationTemplateProps) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>Vershkov</Text>
          <Heading style={headingStyle}>{heading}</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>{message}</Text>
          <Section style={detailsSection}>
            {details.map(detail => (
              <Text key={detail.label} style={detailRow}>
                <strong>{detail.label}:</strong> {detail.value}
              </Text>
            ))}
          </Section>
          <Section style={buttonSection}>
            <Button href={actionUrl} style={button}>
              {actionText}
            </Button>
          </Section>
          <Text style={footer}>
            Это автоматическое уведомление о движении средств или минут в вашем аккаунте.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main: React.CSSProperties = {
  backgroundColor: '#f6f3ef',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  padding: '36px 0'
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  margin: '0 auto',
  maxWidth: '540px',
  padding: '34px'
};

const brand: React.CSSProperties = {
  color: '#900a0b',
  fontSize: '18px',
  fontWeight: 700,
  margin: '0 0 18px'
};

const headingStyle: React.CSSProperties = {
  color: '#18181b',
  fontSize: '25px',
  lineHeight: '32px',
  margin: '0 0 18px'
};

const text: React.CSSProperties = {
  color: '#3f3f46',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px'
};

const detailsSection: React.CSSProperties = {
  backgroundColor: '#fafafa',
  border: '1px solid #e4e4e7',
  borderRadius: '14px',
  margin: '22px 0',
  padding: '16px 18px'
};

const detailRow: React.CSSProperties = {
  color: '#3f3f46',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 7px'
};

const buttonSection: React.CSSProperties = {
  margin: '26px 0 8px',
  textAlign: 'center'
};

const button: React.CSSProperties = {
  backgroundColor: '#900a0b',
  borderRadius: '999px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 700,
  padding: '12px 24px',
  textDecoration: 'none'
};

const footer: React.CSSProperties = {
  color: '#71717a',
  fontSize: '12px',
  lineHeight: '19px',
  margin: '24px 0 0',
  textAlign: 'center'
};
