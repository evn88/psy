import {
  EmailAction,
  EmailDetails,
  EmailFooter,
  EmailFrame,
  EmailHeading,
  EmailParagraph
} from '@/emails/email-layout';

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
    <EmailFrame
      preview={preview}
      footer={
        <EmailFooter>
          Это автоматическое уведомление о движении средств или минут в вашем аккаунте.
        </EmailFooter>
      }
    >
      <EmailHeading>{heading}</EmailHeading>
      <EmailParagraph>{greeting}</EmailParagraph>
      <EmailParagraph>{message}</EmailParagraph>
      <EmailDetails details={details} />
      <EmailAction href={actionUrl}>{actionText}</EmailAction>
    </EmailFrame>
  );
};
