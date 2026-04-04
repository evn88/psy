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

interface AccountDeletedUserTranslations {
  heading: string;
  greeting: string;
  message: string;
  footer: string;
}

interface AccountDeletedUserTemplateProps {
  name: string;
  translations: AccountDeletedUserTranslations;
}

/**
 * Шаблон письма пользователю после успешного удаления аккаунта.
 */
export const AccountDeletedUserTemplate = ({
  name,
  translations
}: AccountDeletedUserTemplateProps) => {
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

          <Text style={text}>{translations.greeting.replace('{name}', name)}</Text>

          <Text style={text}>{translations.message}</Text>

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
