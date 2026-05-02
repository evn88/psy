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

interface WelcomeGoogleTranslations {
  heading: string;
  greeting: string;
  message: string;
  button: string;
  footer: string;
}

interface WelcomeGoogleEmailTemplateProps {
  name: string;
  dashboardUrl: string;
  translations: WelcomeGoogleTranslations;
}

/**
 * Шаблон welcome-email при регистрации через Google.
 * Поддерживает мультиязычность через объект translations.
 */
export const WelcomeGoogleEmailTemplate = ({
  name,
  dashboardUrl,
  translations
}: WelcomeGoogleEmailTemplateProps) => {
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

          <Section style={buttonSection}>
            <Button style={button} href={dashboardUrl}>
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

const buttonSection: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '28px 0'
};

const button: React.CSSProperties = {
  backgroundColor: '#00b894',
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
