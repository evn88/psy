import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section
} from '@react-email/components';

interface AdminIntakeNotificationTemplateProps {
  userId: string;
  formId: string;
  dashboardUrl: string;
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif'
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px'
};

const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '400',
  color: '#484848',
  padding: '17px 0 0'
};

const paragraph = {
  margin: '0 0 15px',
  fontSize: '15px',
  lineHeight: '1.4',
  color: '#3c4149'
};

const link = {
  color: '#067df7',
  textDecoration: 'none',
  fontWeight: '500'
};

export const AdminIntakeNotificationTemplate: React.FC<
  Readonly<AdminIntakeNotificationTemplateProps>
> = ({ userId, formId, dashboardUrl }) => (
  <Html>
    <Head />
    <Preview>Новая анкета заполнена клиентом</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Новая анкета ({formId})</Heading>
        <Text style={paragraph}>Клиент (ID: {userId}) только что заполнил анкету.</Text>
        <Section>
          <Text style={paragraph}>
            Вы можете просмотреть зашифрованные ответы в{' '}
            <Link href={dashboardUrl} style={link}>
              Панели Администратора
            </Link>
            .
          </Text>
        </Section>
        <Text style={{ ...paragraph, color: '#898989', fontSize: '13px', marginTop: '24px' }}>
          Это автоматическое уведомление, настроенное в вашем профиле администратора. Вы можете
          отключить его в настройках уведомлений.
        </Text>
      </Container>
    </Body>
  </Html>
);
