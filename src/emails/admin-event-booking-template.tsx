import {
  EmailAction,
  EmailDetails,
  EmailFooter,
  EmailFrame,
  EmailHeading,
  EmailParagraph
} from '@/emails/email-layout';

export interface AdminEventBookingTranslationData {
  subject: string;
  greeting: string;
  message: string;
  details: {
    user: string;
    event: string;
    date: string;
    time: string;
  };
  button: string;
  footer: string;
}

interface AdminEventBookingTemplateProps {
  adminName: string;
  userName: string;
  userEmail: string;
  title: string;
  dateText: string;
  timeText: string;
  manageUrl: string;
  t: AdminEventBookingTranslationData;
}

const defaultTranslations: AdminEventBookingTranslationData = {
  subject: 'Новая запись: {title}',
  greeting: 'Здравствуйте, {name}!',
  message: 'Пользователь записался на свободный слот в вашем расписании.',
  details: {
    user: 'Клиент:',
    event: 'Событие:',
    date: 'Дата:',
    time: 'Время:'
  },
  button: 'Перейти в расписание',
  footer: 'Это автоматическое уведомление. Пожалуйста, не отвечайте на него.'
};

/**
 * Рендерит письмо администратору о новой записи пользователя.
 */
export const AdminEventBookingTemplate = ({
  adminName,
  userName,
  userEmail,
  title,
  dateText,
  timeText,
  manageUrl,
  t
}: AdminEventBookingTemplateProps) => {
  const texts = Object.keys(t).length > 0 ? t : defaultTranslations;
  const preview = texts.subject.replace('{title}', title);
  const greeting = texts.greeting.replace('{name}', adminName);

  return (
    <EmailFrame preview={preview} footer={<EmailFooter>{texts.footer}</EmailFooter>}>
      <EmailHeading>{greeting}</EmailHeading>
      <EmailParagraph>{texts.message}</EmailParagraph>
      <EmailDetails
        details={[
          { label: texts.details.user, value: `${userName} (${userEmail})` },
          { label: texts.details.event, value: title },
          { label: texts.details.date, value: dateText },
          { label: texts.details.time, value: timeText }
        ]}
      />
      <EmailAction href={manageUrl}>{texts.button}</EmailAction>
    </EmailFrame>
  );
};

export default AdminEventBookingTemplate;
