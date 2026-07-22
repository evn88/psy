import {
  EmailAction,
  EmailDetails,
  EmailFooter,
  EmailFrame,
  EmailHeading,
  EmailParagraph
} from '@/emails/email-layout';

interface PilloNotificationTemplateProps {
  preview: string;
  heading: string;
  greeting: string;
  message: string;
  details: Array<{ label: string; value: string }>;
  buttonText: string;
  actionUrl: string;
  secondaryButtonText?: string;
  secondaryActionUrl?: string;
  footer: string;
}

/**
 * Рендерит email-уведомления мини-приложения Pillo.
 * @param props - локализованные тексты, детали приёма и ссылка действия.
 * @returns HTML-письмо для Resend.
 */
export const PilloNotificationTemplate = ({
  preview,
  heading,
  greeting,
  message,
  details,
  buttonText,
  actionUrl,
  secondaryButtonText,
  secondaryActionUrl,
  footer
}: PilloNotificationTemplateProps) => {
  return (
    <EmailFrame
      preview={preview}
      brand="Vershkov · Pillo"
      footer={<EmailFooter>{footer}</EmailFooter>}
    >
      <EmailHeading>{heading}</EmailHeading>
      <EmailParagraph>{greeting}</EmailParagraph>
      <EmailParagraph>{message}</EmailParagraph>
      <EmailDetails details={details} />
      <EmailAction href={actionUrl}>{buttonText}</EmailAction>
      {secondaryButtonText && secondaryActionUrl ? (
        <EmailAction href={secondaryActionUrl} tone="secondary" compact>
          {secondaryButtonText}
        </EmailAction>
      ) : null}
    </EmailFrame>
  );
};
