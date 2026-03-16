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
import { format } from 'date-fns';

interface AdminEventCancellationTranslationData {
  subject: string;
  greeting: string;
  message: string;
  details: {
    user: string;
    event: string;
    date: string;
    time: string;
    reason: string;
  };
  button: string;
  footer: string;
}

interface AdminEventCancellationTemplateProps {
  adminName: string;
  userName: string;
  userEmail: string;
  title: string;
  eventType: string;
  start: Date | string;
  end: Date | string;
  reason?: string;
  manageUrl: string;
  t: AdminEventCancellationTranslationData;
}

export const AdminEventCancellationTemplate = ({
  adminName,
  userName,
  userEmail,
  title,
  eventType,
  start,
  end,
  reason,
  manageUrl,
  t
}: AdminEventCancellationTemplateProps) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dateStr = format(startDate, 'dd.MM.yyyy');
  const timeStr = `${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`;

  const defaultT: AdminEventCancellationTranslationData = {
    subject: `Отмена записи: ${title}`,
    greeting: `Здравствуйте, ${adminName}!`,
    message: `Пользователь отменил свою запись.`,
    details: {
      user: 'Клиент:',
      event: 'Событие:',
      date: 'Дата:',
      time: 'Время:',
      reason: 'Причина отмены:'
    },
    button: 'Перейти в расписание',
    footer: 'Это автоматическое уведомление. Пожалуйста, не отвечайте на него.'
  };

  const texts = Object.keys(t).length > 0 ? t : defaultT;

  return (
    <Html>
      <Head />
      <Preview>{texts.subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{texts.greeting}</Heading>

          <Text style={text}>{texts.message}</Text>

          <Section style={detailsContainer}>
            <Text style={detailText}>
              <strong>{texts.details.user}</strong> {userName} ({userEmail})
            </Text>
            <Text style={detailText}>
              <strong>{texts.details.event}</strong> {title || eventType}
            </Text>
            <Text style={detailText}>
              <strong>{texts.details.date}</strong> {dateStr}
            </Text>
            <Text style={detailText}>
              <strong>{texts.details.time}</strong> {timeStr}
            </Text>

            {reason && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#fee2e2',
                  borderRadius: '4px',
                  border: '1px solid #fca5a5'
                }}
              >
                <Text style={{ ...detailText, margin: 0, color: '#991b1b', fontWeight: '500' }}>
                  {texts.details.reason}
                </Text>
                <Text style={{ ...detailText, margin: '4px 0 0 0', color: '#7f1d1d' }}>
                  {reason}
                </Text>
              </div>
            )}
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={manageUrl}>
              {texts.button}
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>{texts.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
};

export default AdminEventCancellationTemplate;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif'
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
  maxWidth: '580px'
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.25',
  padding: '0 48px'
};

const text = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '1.5',
  padding: '0 48px'
};

const detailsContainer = {
  padding: '24px 48px',
  backgroundColor: '#f8fafc',
  borderTop: '1px solid #e2e8f0',
  borderBottom: '1px solid #e2e8f0',
  margin: '24px 0'
};

const detailText = {
  margin: '0 0 12px 0',
  color: '#334155',
  fontSize: '15px'
};

const buttonContainer = {
  padding: '0 48px',
  textAlign: 'center' as const,
  marginTop: '32px',
  marginBottom: '32px'
};

const button = {
  backgroundColor: '#ef4444', // Red button for cancellation
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px'
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0'
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 48px'
};
