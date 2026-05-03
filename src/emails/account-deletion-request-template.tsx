import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text
} from '@react-email/components';
import * as React from 'react';

interface AccountDeletionRequestTranslations {
  heading: string;
  greeting: string;
  message: string;
  warning: string;
  button: string;
  linkHint: string;
  expiry: string;
  footer: string;
}

interface AccountDeletionRequestTemplateProps {
  name: string;
  deletionUrl: string;
  translations: AccountDeletionRequestTranslations;
}

/**
 * Шаблон письма для подтверждения удаления аккаунта.
 * Пользователь должен перейти по ссылке для завершения удаления.
 */
export const AccountDeletionRequestTemplate = ({
  name,
  deletionUrl,
  translations
}: AccountDeletionRequestTemplateProps) => {
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

          <Section style={warningSection}>
            <Text style={warningText}>{translations.warning}</Text>
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={deletionUrl}>
              {translations.button}
            </Button>
          </Section>

          <Text style={linkHintText}>{translations.linkHint}</Text>
          <Link style={link} href={deletionUrl}>
            {deletionUrl}
          </Link>

          <Hr style={hr} />

          <Text style={expiryText}>{translations.expiry}</Text>

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

const warningSection: React.CSSProperties = {
  backgroundColor: '#fff5f5',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '16px 0'
};

const warningText: React.CSSProperties = {
  color: '#c53030',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0'
};

const buttonSection: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '28px 0'
};

const button: React.CSSProperties = {
  backgroundColor: '#e53e3e',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px'
};

const linkHintText: React.CSSProperties = {
  color: '#8e8ea0',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 4px'
};

const link: React.CSSProperties = {
  color: '#e53e3e',
  fontSize: '13px',
  lineHeight: '20px',
  wordBreak: 'break-all' as const
};

const hr: React.CSSProperties = {
  borderColor: '#eaeaf0',
  margin: '24px 0'
};

const expiryText: React.CSSProperties = {
  color: '#8e8ea0',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 8px',
  textAlign: 'center' as const
};

const footerStyle: React.CSSProperties = {
  color: '#8e8ea0',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const
};
