import {
  EmailAction,
  EmailFallbackLink,
  EmailFooter,
  EmailFrame,
  EmailHeading,
  EmailParagraph
} from '@/emails/email-layout';

interface VerificationTranslations {
  heading: string;
  greeting: string;
  message: string;
  button: string;
  linkHint: string;
  expiry: string;
  footer: string;
}

interface VerificationEmailTemplateProps {
  name: string;
  verificationUrl: string;
  translations: VerificationTranslations;
}

/**
 * Шаблон письма для подтверждения email с локализованными текстами.
 */
export const VerificationEmailTemplate = ({
  verificationUrl,
  translations
}: VerificationEmailTemplateProps) => {
  return (
    <EmailFrame
      preview={translations.heading}
      footer={
        <>
          <EmailFooter>{translations.expiry}</EmailFooter>
          <EmailFooter>{translations.footer}</EmailFooter>
        </>
      }
    >
      <EmailHeading>{translations.heading}</EmailHeading>
      <EmailParagraph>{translations.greeting}</EmailParagraph>
      <EmailParagraph>{translations.message}</EmailParagraph>
      <EmailAction href={verificationUrl}>{translations.button}</EmailAction>
      <EmailFallbackLink hint={translations.linkHint} href={verificationUrl} />
    </EmailFrame>
  );
};
