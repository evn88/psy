import {
  EmailAction,
  EmailFooter,
  EmailFrame,
  EmailHeading,
  EmailParagraph
} from '@/emails/email-layout';

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
 * Шаблон приветственного письма после регистрации через Google.
 */
export const WelcomeGoogleEmailTemplate = ({
  dashboardUrl,
  translations
}: WelcomeGoogleEmailTemplateProps) => {
  return (
    <EmailFrame
      preview={translations.heading}
      footer={<EmailFooter>{translations.footer}</EmailFooter>}
    >
      <EmailHeading>{translations.heading}</EmailHeading>
      <EmailParagraph>{translations.greeting}</EmailParagraph>
      <EmailParagraph>{translations.message}</EmailParagraph>
      <EmailAction href={dashboardUrl}>{translations.button}</EmailAction>
    </EmailFrame>
  );
};
