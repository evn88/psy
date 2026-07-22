import {
  EmailDetails,
  EmailFooter,
  EmailFrame,
  EmailHeading,
  EmailParagraph
} from '@/emails/email-layout';

interface AccountDeletedAdminTranslations {
  heading: string;
  message: string;
  dateLabel: string;
  footer: string;
}

interface AccountDeletedAdminTemplateProps {
  name: string;
  email: string;
  deletedAt: string;
  translations: AccountDeletedAdminTranslations;
}

/**
 * Шаблон письма администратору после удаления пользовательского аккаунта.
 */
export const AccountDeletedAdminTemplate = ({
  name,
  email,
  deletedAt,
  translations
}: AccountDeletedAdminTemplateProps) => {
  return (
    <EmailFrame
      preview={translations.heading}
      footer={<EmailFooter>{translations.footer}</EmailFooter>}
    >
      <EmailHeading>{translations.heading}</EmailHeading>
      <EmailParagraph>
        {translations.message.replace('{name}', name).replace('{email}', email)}
      </EmailParagraph>
      <EmailDetails
        details={[
          { label: 'Email', value: email },
          { label: translations.dateLabel, value: deletedAt }
        ]}
      />
    </EmailFrame>
  );
};
