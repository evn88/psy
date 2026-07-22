import { EmailFooter, EmailFrame, EmailHeading, EmailParagraph } from '@/emails/email-layout';

interface AccountDeletedUserTranslations {
  heading: string;
  greeting: string;
  message: string;
  footer: string;
}

interface AccountDeletedUserTemplateProps {
  name: string;
  translations: AccountDeletedUserTranslations;
}

/**
 * Шаблон письма пользователю после успешного удаления аккаунта.
 */
export const AccountDeletedUserTemplate = ({
  name,
  translations
}: AccountDeletedUserTemplateProps) => {
  return (
    <EmailFrame
      preview={translations.heading}
      footer={<EmailFooter>{translations.footer}</EmailFooter>}
    >
      <EmailHeading>{translations.heading}</EmailHeading>
      <EmailParagraph>{translations.greeting.replace('{name}', name)}</EmailParagraph>
      <EmailParagraph>{translations.message}</EmailParagraph>
    </EmailFrame>
  );
};
