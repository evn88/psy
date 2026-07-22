import { EmailFooter, EmailFrame, EmailHeading, EmailParagraph } from '@/emails/email-layout';

interface EmailTemplateProps {
  firstName: string;
}

/**
 * Минимальный шаблон для ручной проверки почтовой инфраструктуры.
 */
export const EmailTemplate = ({ firstName }: EmailTemplateProps) => {
  return (
    <EmailFrame
      preview={`Добро пожаловать, ${firstName}!`}
      footer={<EmailFooter>Это тестовое письмо Vershkov.</EmailFooter>}
    >
      <EmailHeading>Добро пожаловать!</EmailHeading>
      <EmailParagraph>{firstName}, почтовые уведомления Vershkov готовы к работе.</EmailParagraph>
    </EmailFrame>
  );
};
