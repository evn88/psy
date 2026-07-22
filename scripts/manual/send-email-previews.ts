import path from 'node:path';
import { render } from '@react-email/render';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import type { ReactElement } from 'react';
import { AccountDeletedAdminTemplate } from '@/emails/account-deleted-admin-template';
import { AccountDeletedUserTemplate } from '@/emails/account-deleted-user-template';
import { AccountDeletionRequestTemplate } from '@/emails/account-deletion-request-template';
import { AdminEventBookingTemplate } from '@/emails/admin-event-booking-template';
import { AdminEventCancellationTemplate } from '@/emails/admin-event-cancellation-template';
import { AdminIntakeNotificationTemplate } from '@/emails/admin-intake-notification-template';
import { AdminMessageTemplate } from '@/emails/admin-message-template';
import { BlogNotificationEmail } from '@/emails/blog-notification-template';
import { EventCancellationTemplate } from '@/emails/event-cancellation-template';
import { EventNotificationTemplate } from '@/emails/event-notification-template';
import { FinancialNotificationTemplate } from '@/emails/financial-notification-template';
import { PilloNotificationTemplate } from '@/emails/pillo-notification-template';
import { EmailTemplate } from '@/emails/test-template';
import { VerificationEmailTemplate } from '@/emails/verification-email-template';
import { WelcomeGoogleEmailTemplate } from '@/emails/welcome-google-email-template';
import emailRu from '../../messages/email-ru.json';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const from = 'Vershkov.com <noreply@vershkov.com>';
const recipient = process.env.EMAIL_PREVIEW_TO ?? process.env.ADMIN_EMAIL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vershkov.com';

interface PreviewEmail {
  name: string;
  subject: string;
  react: ReactElement;
}

const getUrl = (pathname: string): string => new URL(pathname, appUrl).toString();

/**
 * Формирует контрольный набор всех почтовых шаблонов с безопасными тестовыми данными.
 */
const createPreviewEmails = (): PreviewEmail[] => {
  const previewName = 'Анна';
  const eventTranslations = emailRu.eventNotification;
  const cancellationTranslations = emailRu.eventCancellation;

  return [
    {
      name: 'account-deleted-admin',
      subject: '[Preview] Удаление аккаунта, администратор',
      react: AccountDeletedAdminTemplate({
        name: previewName,
        email: 'anna@example.com',
        deletedAt: '22 июля 2026, 10:30',
        translations: emailRu.adminAccountDeleted
      })
    },
    {
      name: 'account-deleted-user',
      subject: '[Preview] Удаление аккаунта, пользователь',
      react: AccountDeletedUserTemplate({
        name: previewName,
        translations: emailRu.accountDeleted
      })
    },
    {
      name: 'account-deletion-request',
      subject: '[Preview] Подтверждение удаления аккаунта',
      react: AccountDeletionRequestTemplate({
        name: previewName,
        deletionUrl: getUrl('/ru/account/delete?token=email-preview-token'),
        translations: emailRu.accountDeletionRequest
      })
    },
    {
      name: 'admin-event-booking',
      subject: '[Preview] Новая запись для администратора',
      react: AdminEventBookingTemplate({
        adminName: 'Мария',
        userName: previewName,
        userEmail: 'anna@example.com',
        title: 'Индивидуальная сессия',
        dateText: '25 июля 2026',
        timeText: '14:00 - 15:00 (Europe/Belgrade)',
        manageUrl: getUrl('/ru/admin/schedule'),
        t: {
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
        }
      })
    },
    {
      name: 'admin-event-cancellation',
      subject: '[Preview] Отмена записи для администратора',
      react: AdminEventCancellationTemplate({
        adminName: 'Мария',
        userName: previewName,
        userEmail: 'anna@example.com',
        title: 'Индивидуальная сессия',
        dateText: '25 июля 2026',
        timeText: '14:00 - 15:00 (Europe/Belgrade)',
        reason: 'Изменились планы',
        manageUrl: getUrl('/ru/admin/schedule'),
        t: {
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
        }
      })
    },
    {
      name: 'admin-intake-notification',
      subject: '[Preview] Новая анкета клиента',
      react: AdminIntakeNotificationTemplate({
        userId: 'preview-user-id',
        formId: 'intake-2026',
        dashboardUrl: getUrl('/ru/admin/clients')
      })
    },
    {
      name: 'admin-message',
      subject: '[Preview] Сообщение от администрации',
      react: AdminMessageTemplate({
        subject: 'Сообщение от администрации',
        message:
          'Здравствуйте!\n\nЭто проверочное сообщение. Пожалуйста, убедитесь, что письмо удобно читать на компьютере и телефоне.'
      })
    },
    {
      name: 'blog-notification',
      subject: '[Preview] Новая статья в блоге',
      react: BlogNotificationEmail({
        title: 'Как бережно возвращать себе опору',
        description:
          'Небольшой практический материал о том, как замечать перегрузку и возвращать в день больше устойчивости.',
        coverImage: getUrl('/images/links/anna-consultation.jpg'),
        authorName: 'Анна Вершкова',
        readingTime: 6,
        publishedAt: '22 июля 2026',
        articleUrl: getUrl('/ru/blog/preview-article'),
        unsubscribeUrl: getUrl('/ru/blog/unsubscribe?token=email-preview-token'),
        locale: 'ru'
      })
    },
    {
      name: 'event-cancellation',
      subject: '[Preview] Событие отменено',
      react: EventCancellationTemplate({
        name: previewName,
        title: 'Индивидуальная сессия',
        eventTypeLabel: 'Консультация',
        dateText: '25 июля 2026',
        timeText: '14:00 - 15:00',
        reason: 'Изменились планы',
        manageUrl: getUrl('/ru/my/sessions'),
        translations: {
          ...cancellationTranslations,
          greeting: cancellationTranslations.greeting.replace('{name}', previewName),
          message: cancellationTranslations.message.replace('{title}', 'Индивидуальная сессия')
        }
      })
    },
    {
      name: 'event-notification',
      subject: '[Preview] Обновление расписания',
      react: EventNotificationTemplate({
        name: previewName,
        title: 'Индивидуальная сессия',
        eventTypeLabel: 'Консультация',
        dateText: '25 июля 2026',
        timeText: '14:00 - 15:00',
        meetLink: 'https://meet.google.com/abc-defg-hij',
        manageUrl: getUrl('/ru/my/sessions'),
        translations: {
          ...eventTranslations,
          greeting: eventTranslations.greeting.replace('{name}', previewName),
          message: eventTranslations.message.replace('{title}', 'Индивидуальная сессия')
        }
      })
    },
    {
      name: 'financial-notification',
      subject: '[Preview] Финансовое уведомление',
      react: FinancialNotificationTemplate({
        preview: 'Пополнение баланса',
        heading: 'Баланс пополнен',
        greeting: `Здравствуйте, ${previewName}!`,
        message: 'Платёж успешно зачислен на ваш баланс.',
        details: [
          { label: 'Сумма', value: '3 500 ₽' },
          { label: 'Дата', value: '22 июля 2026' }
        ],
        actionUrl: getUrl('/ru/my/payments'),
        actionText: 'Открыть платежи'
      })
    },
    {
      name: 'pillo-notification',
      subject: '[Preview] Напоминание Pillo',
      react: PilloNotificationTemplate({
        preview: 'Время принять лекарство',
        heading: 'Пора принять лекарство',
        greeting: `Здравствуйте, ${previewName}!`,
        message: 'Напоминаем о запланированном приёме.',
        details: [
          { label: 'Лекарство', value: 'Витамин D' },
          { label: 'Дозировка', value: '1 капсула' },
          { label: 'Время', value: '09:00' }
        ],
        buttonText: 'Отметить приём',
        actionUrl: getUrl('/ru/app/pillo?preview=take'),
        secondaryButtonText: 'Пропустить',
        secondaryActionUrl: getUrl('/ru/app/pillo?preview=skip'),
        footer: 'Это автоматическое напоминание Pillo.'
      })
    },
    {
      name: 'test-template',
      subject: '[Preview] Тестовый шаблон',
      react: EmailTemplate({ firstName: previewName })
    },
    {
      name: 'verification-email',
      subject: '[Preview] Подтверждение email',
      react: VerificationEmailTemplate({
        name: previewName,
        verificationUrl: getUrl('/ru/auth/verify-email?token=email-preview-token'),
        translations: {
          ...emailRu.verification,
          greeting: emailRu.verification.greeting.replace('{name}', previewName)
        }
      })
    },
    {
      name: 'welcome-google-email',
      subject: '[Preview] Добро пожаловать',
      react: WelcomeGoogleEmailTemplate({
        name: previewName,
        dashboardUrl: getUrl('/ru/my'),
        translations: {
          ...emailRu.welcomeGoogle,
          greeting: emailRu.welcomeGoogle.greeting.replace('{name}', previewName)
        }
      })
    }
  ];
};

const main = async (): Promise<void> => {
  const previews = createPreviewEmails();
  const isDryRun = process.argv.includes('--dry-run');

  if (isDryRun) {
    await Promise.all(previews.map(preview => render(preview.react)));
    console.info(`Успешно отрендерено шаблонов: ${previews.length}.`);
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error('Не задан RESEND_API_KEY.');
  }

  if (!recipient) {
    throw new Error('Не задан EMAIL_PREVIEW_TO или ADMIN_EMAIL.');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.batch.send(
    previews.map(preview => ({
      from,
      to: [recipient],
      subject: preview.subject,
      react: preview.react
    }))
  );

  if (error) {
    throw new Error(`Resend отклонил отправку: ${error.message}`);
  }

  console.info(`В очередь Resend отправлено шаблонов: ${previews.length}.`);
  console.info(JSON.stringify(data));
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
