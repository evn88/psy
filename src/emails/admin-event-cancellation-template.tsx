import {
  EmailAction,
  EmailDetails,
  EmailFooter,
  EmailFrame,
  EmailHeading,
  EmailNotice,
  EmailParagraph
} from '@/emails/email-layout';

export interface AdminEventCancellationTranslationData {
  subject: string;
  greeting: string;
  message: string;
  details: {
    user: string;
    event: string;
    date: string;
    time: string;
    reason: string;
  };
  button: string;
  footer: string;
}

interface AdminEventCancellationTemplateProps {
  adminName: string;
  userName: string;
  userEmail: string;
  title: string;
  dateText: string;
  timeText: string;
  reason?: string;
  manageUrl: string;
  t: AdminEventCancellationTranslationData;
}

const defaultTranslations: AdminEventCancellationTranslationData = {
  subject: 'Отмена записи: {title}',
  greeting: 'Здравствуйте, {name}!',
  message: 'Пользователь отменил свою запись.',
  details: {
    user: 'Клиент:',
    event: 'Событие:',
    date: 'Дата:',
    time: 'Время:',
    reason: 'Причина отмены:'
  },
  button: 'Перейти в расписание',
  footer: 'Это автоматическое уведомление. Пожалуйста, не отвечайте на него.'
};

/**
 * Рендерит письмо администратору об отмене записи пользователя.
 */
export const AdminEventCancellationTemplate = ({
  adminName,
  userName,
  userEmail,
  title,
  dateText,
  timeText,
  reason,
  manageUrl,
  t
}: AdminEventCancellationTemplateProps) => {
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
      {reason ? (
        <EmailNotice tone="danger">
          {texts.details.reason.replace(/:$/, '')}: {reason}
        </EmailNotice>
      ) : null}
      <EmailAction href={manageUrl}>{texts.button}</EmailAction>
    </EmailFrame>
  );
};

export default AdminEventCancellationTemplate;
