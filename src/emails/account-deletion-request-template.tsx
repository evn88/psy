import {
  EmailAction,
  EmailFallbackLink,
  EmailFooter,
  EmailFrame,
  EmailHeading,
  EmailNotice,
  EmailParagraph
} from '@/emails/email-layout';

interface AccountDeletionRequestTranslations {
  heading: string;
  greeting: string;
  message: string;
  warning: string;
  button: string;
  linkHint: string;
  expiry: string;
  footer: string;
}

interface AccountDeletionRequestTemplateProps {
  name: string;
  deletionUrl: string;
  translations: AccountDeletionRequestTranslations;
}

/**
 * Шаблон письма для подтверждения удаления аккаунта.
 */
export const AccountDeletionRequestTemplate = ({
  name,
  deletionUrl,
  translations
}: AccountDeletionRequestTemplateProps) => {
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
      <EmailParagraph>{translations.greeting.replace('{name}', name)}</EmailParagraph>
      <EmailParagraph>{translations.message}</EmailParagraph>
      <EmailNotice tone="danger">{translations.warning}</EmailNotice>
      <EmailAction href={deletionUrl} tone="danger">
        {translations.button}
      </EmailAction>
      <EmailFallbackLink hint={translations.linkHint} href={deletionUrl} />
    </EmailFrame>
  );
};
