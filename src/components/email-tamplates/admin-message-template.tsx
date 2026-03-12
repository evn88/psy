import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';
import * as React from 'react';

interface AdminMessageTemplateProps {
  subject: string;
  message: string;
}

export function AdminMessageTemplate({ subject, message }: AdminMessageTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Сообщение от администратора сайта vershkov.com</Heading>

          <Text style={text}>Здравствуйте,</Text>

          <Text style={messageBody}>{message}</Text>

          <Text style={footer}>
            Это автоматическое сообщение. Пожалуйста, не отвечайте на него.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif'
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px'
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '40px',
  margin: '0 0 20px',
  padding: '0 24px'
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 24px'
};

const messageBody = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 24px',
  whiteSpace: 'pre-wrap' as const,
  backgroundColor: '#f9f9f9',
  borderLeft: '4px solid #eaeaea',
  margin: '20px 24px'
};

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 24px 0'
};
