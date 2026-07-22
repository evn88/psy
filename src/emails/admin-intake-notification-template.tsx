import {
  EmailAction,
  EmailDetails,
  EmailFooter,
  EmailFrame,
  EmailHeading,
  EmailParagraph
} from '@/emails/email-layout';

interface AdminIntakeNotificationTemplateProps {
  userId: string;
  formId: string;
  dashboardUrl: string;
}

/**
 * Рендерит уведомление администратору о заполненной клиентом анкете.
 */
export const AdminIntakeNotificationTemplate = ({
  userId,
  formId,
  dashboardUrl
}: AdminIntakeNotificationTemplateProps) => {
  return (
    <EmailFrame
      preview="Новая анкета заполнена клиентом"
      footer={
        <EmailFooter>
          Это автоматическое уведомление. Управлять такими сообщениями можно в настройках
          уведомлений.
        </EmailFooter>
      }
    >
      <EmailHeading>Новая анкета</EmailHeading>
      <EmailParagraph>
        Клиент только что заполнил анкету. Ответы доступны в панели администратора.
      </EmailParagraph>
      <EmailDetails
        details={[
          { label: 'Анкета', value: formId },
          { label: 'ID клиента', value: userId }
        ]}
      />
      <EmailAction href={dashboardUrl}>Открыть ответы</EmailAction>
    </EmailFrame>
  );
};
