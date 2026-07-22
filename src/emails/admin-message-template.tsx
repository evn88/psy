import {
  EmailFooter,
  EmailFrame,
  EmailHeading,
  EmailMessage,
  EmailParagraph
} from '@/emails/email-layout';

interface AdminMessageTemplateProps {
  subject: string;
  message: string;
}

/**
 * Рендерит адресное сообщение администрации сайта.
 */
export const AdminMessageTemplate = ({ subject, message }: AdminMessageTemplateProps) => {
  return (
    <EmailFrame
      preview={subject}
      footer={
        <EmailFooter>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</EmailFooter>
      }
    >
      <EmailHeading>Сообщение от администрации</EmailHeading>
      <EmailParagraph>Здравствуйте!</EmailParagraph>
      <EmailMessage>{message}</EmailMessage>
    </EmailFrame>
  );
};
