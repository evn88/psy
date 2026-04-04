import {
  Body,
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

interface AccountDeletedAdminTranslations {
  heading: string;
  message: string;
  dateLabel: string;
  footer: string;
}

interface AccountDeletedAdminTemplateProps {
  name: string;
  email: string;
  deletedAt: string;
  translations: AccountDeletedAdminTranslations;
}

/**
 * Шаблон письма администратору после удаления пользовательского аккаунта.
 */
export const AccountDeletedAdminTemplate = ({
  name,
  email,
  deletedAt,
  translations
}: AccountDeletedAdminTemplateProps) => {
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

          <Text style={text}>
            {translations.message.replace('{name}', name).replace('{email}', email)}
          </Text>

          <Section style={infoSection}>
            <Text style={infoRow}>
              <strong>Email:</strong> {email}
            </Text>
            <Text style={infoRow}>
              <strong>{translations.dateLabel}:</strong> {deletedAt}
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footerStyle}>{translations.footer}</Text>
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
  color: '#1a1a2e',
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

const infoSection: React.CSSProperties = {
  backgroundColor: '#f8f8fc',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '16px 0'
};

const infoRow: React.CSSProperties = {
  color: '#4a4a68',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 4px'
};

const hr: React.CSSProperties = {
  borderColor: '#eaeaf0',
  margin: '24px 0'
};

const footerStyle: React.CSSProperties = {
  color: '#8e8ea0',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const
};
