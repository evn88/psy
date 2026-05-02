import * as React from 'react';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import type { BlogPost, BlogPostTranslation } from '@prisma/client';
import { VerificationEmailTemplate } from '@/components/email-templates/verification-email-template';
import { WelcomeGoogleEmailTemplate } from '@/components/email-templates/welcome-google-email-template';
import { EventNotificationTemplate } from '@/components/email-templates/event-notification-template';
import { EventCancellationTemplate } from '@/components/email-templates/event-cancellation-template';
import {
  AdminEventBookingTemplate,
  type AdminEventBookingTranslationData
} from '@/components/email-templates/admin-event-booking-template';
import {
  AdminEventCancellationTemplate,
  type AdminEventCancellationTranslationData
} from '@/components/email-templates/admin-event-cancellation-template';
import { AdminMessageTemplate } from '@/components/email-templates/admin-message-template';
import { BlogNotificationEmail } from '@/components/email-templates/blog-notification-template';
import { AccountDeletionRequestTemplate } from '@/components/email-templates/account-deletion-request-template';
import { AccountDeletedUserTemplate } from '@/components/email-templates/account-deleted-user-template';
import { AccountDeletedAdminTemplate } from '@/components/email-templates/account-deleted-admin-template';
import { AdminIntakeNotificationTemplate } from '@/components/email-templates/admin-intake-notification-template';
import { PilloNotificationTemplate } from '@/components/email-templates/pillo-notification-template';
import {
  formatPilloIntakeDateTime,
  getPilloNotificationCopy,
  interpolatePilloCopy
} from '@/features/pillo/lib/notifications';
import { formatBlogDate } from '@/shared/lib/blog-utils';
import {
  formatEmailEventDateTime,
  getAdminEventBookingTranslations,
  getAdminEventCancellationTranslations,
  getEmailTranslations,
  getLocalizedEventTitle,
  getLocalizedEventTypeLabel,
  normalizeEmailLocale
} from '@/shared/lib/email-localization';

/** Инстанс Resend для отправки писем */
const resend = new Resend(process.env.RESEND_API_KEY);

/** Адрес отправителя */
const FROM_ADDRESS = 'Vershkov.com <noreply@vershkov.com>';

/** Базовый URL приложения */
const getBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_ENV === 'production' && process.env.PROD_DOMAIN) {
    return process.env.PROD_DOMAIN;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};

/**
 * Подставляет переменные в строку перевода.
 * Формат переменных: {name}, {url} и т.д.
 * @param template - строка с плейсхолдерами
 * @param vars - объект с переменными
 */
const interpolate = (template: string, vars: Record<string, string>): string => {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template
  );
};

type EventNotificationVariant = 'default' | 'bookingPending' | 'bookingConfirmed';

type EventCancellationVariant = 'default' | 'bookingRejected';

/**
 * Возвращает тексты письма для уведомления о событии в зависимости от сценария.
 * @param locale - locale пользователя.
 * @param variant - сценарий письма.
 * @returns Локализованный набор строк для шаблона уведомления.
 */
const getEventNotificationCopy = (
  locale: string,
  variant: EventNotificationVariant
): (typeof getEmailTranslations extends (locale?: string | null) => infer TResult
  ? TResult
  : never)['eventNotification'] => {
  const translations = getEmailTranslations(locale);

  if (variant === 'bookingPending') {
    return translations.bookingPending ?? translations.eventNotification;
  }

  if (variant === 'bookingConfirmed') {
    return translations.bookingConfirmed ?? translations.eventNotification;
  }

  return translations.eventNotification;
};

/**
 * Возвращает тексты письма об отмене события в зависимости от сценария.
 * @param locale - locale пользователя.
 * @param variant - сценарий письма.
 * @returns Локализованный набор строк для шаблона отмены.
 */
const getEventCancellationCopy = (
  locale: string,
  variant: EventCancellationVariant
): (typeof getEmailTranslations extends (locale?: string | null) => infer TResult
  ? TResult
  : never)['eventCancellation'] => {
  const translations = getEmailTranslations(locale);

  if (variant === 'bookingRejected') {
    return translations.bookingRejected ?? translations.eventCancellation;
  }

  return translations.eventCancellation;
};

interface SendVerificationEmailParams {
  email: string;
  name: string;
  token: string;
  locale: string;
}

/**
 * Отправляет письмо для подтверждения email.
 * Генерирует ссылку верификации и использует шаблон на языке пользователя.
 * @returns id письма в Resend или null при ошибке
 */
export const sendVerificationEmail = async ({
  email,
  name,
  token,
  locale
}: SendVerificationEmailParams): Promise<string | null> => {
  const translations = getEmailTranslations(locale);
  const normalizedLocale = normalizeEmailLocale(locale);
  const verificationUrl = `${getBaseUrl()}/${normalizedLocale}/auth/verify-email?token=${encodeURIComponent(token)}`;

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: translations.verification.subject,
    react: VerificationEmailTemplate({
      name,
      verificationUrl,
      translations: {
        heading: translations.verification.heading,
        greeting: interpolate(translations.verification.greeting, { name }),
        message: translations.verification.message,
        button: translations.verification.button,
        linkHint: translations.verification.linkHint,
        expiry: translations.verification.expiry,
        footer: translations.verification.footer
      }
    })
  });

  if (error) {
    console.error('Ошибка отправки verification email:', error);
    return null;
  }

  return data?.id ?? null;
};

interface SendWelcomeGoogleEmailParams {
  email: string;
  name: string;
  locale: string;
}

/**
 * Отправляет welcome-email при регистрации через Google.
 * Используется только при первой регистрации (создании нового пользователя).
 * @returns id письма в Resend или null при ошибке
 */
export const sendWelcomeGoogleEmail = async ({
  email,
  name,
  locale
}: SendWelcomeGoogleEmailParams): Promise<string | null> => {
  const translations = getEmailTranslations(locale);
  const dashboardUrl = `${getBaseUrl()}/my`;

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: translations.welcomeGoogle.subject,
    react: WelcomeGoogleEmailTemplate({
      name,
      dashboardUrl,
      translations: {
        heading: translations.welcomeGoogle.heading,
        greeting: interpolate(translations.welcomeGoogle.greeting, { name }),
        message: translations.welcomeGoogle.message,
        button: translations.welcomeGoogle.button,
        footer: translations.welcomeGoogle.footer
      }
    })
  });

  if (error) {
    console.error('Ошибка отправки welcome Google email:', error);
    return null;
  }

  return data?.id ?? null;
};

interface AdminEventBookingEmailParams {
  adminEmail: string;
  adminName: string;
  userName: string;
  userEmail: string;
  title: string;
  eventType: string;
  start: Date | string;
  end: Date | string;
  manageUrl: string;
  locale?: string;
  timezone?: string;
}

export const sendAdminEventBookingEmail = async ({
  adminEmail,
  adminName,
  userName,
  userEmail,
  title,
  eventType,
  start,
  end,
  manageUrl,
  locale = 'ru',
  timezone = 'UTC'
}: AdminEventBookingEmailParams) => {
  const translations: AdminEventBookingTranslationData = getAdminEventBookingTranslations(locale);
  const localizedTitle = getLocalizedEventTitle(title, eventType, locale);
  const { dateText, timeText } = formatEmailEventDateTime({
    start,
    end,
    locale,
    timeZone: timezone
  });
  const subject = interpolate(translations.subject || 'Новая запись: {title}', {
    title: localizedTitle
  });

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [adminEmail],
    subject,
    react: AdminEventBookingTemplate({
      adminName,
      userName,
      userEmail,
      title: localizedTitle,
      dateText,
      timeText,
      manageUrl,
      t: translations
    })
  });

  if (error) {
    console.error('Failed to send admin event booking email:', error);
    return null;
  }

  return data?.id ?? null;
};

interface AdminEventCancellationEmailParams {
  adminEmail: string;
  adminName: string;
  userName: string;
  userEmail: string;
  title: string;
  eventType: string;
  start: Date | string;
  end: Date | string;
  reason?: string;
  manageUrl: string;
  locale?: string;
  timezone?: string;
}

export const sendAdminEventCancellationEmail = async ({
  adminEmail,
  adminName,
  userName,
  userEmail,
  title,
  eventType,
  start,
  end,
  reason,
  manageUrl,
  locale = 'ru',
  timezone = 'UTC'
}: AdminEventCancellationEmailParams) => {
  const translations: AdminEventCancellationTranslationData =
    getAdminEventCancellationTranslations(locale);
  const localizedTitle = getLocalizedEventTitle(title, eventType, locale);
  const { dateText, timeText } = formatEmailEventDateTime({
    start,
    end,
    locale,
    timeZone: timezone
  });
  const subject = interpolate(translations.subject || 'Отмена записи: {title}', {
    title: localizedTitle
  });

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [adminEmail],
    subject,
    react: AdminEventCancellationTemplate({
      adminName,
      userName,
      userEmail,
      title: localizedTitle,
      dateText,
      timeText,
      reason,
      manageUrl,
      t: translations
    })
  });

  if (error) {
    console.error('Failed to send admin event cancellation email:', error);
    return null;
  }

  return data?.id ?? null;
};

interface SendWorkflowStepsThresholdAlertEmailParams {
  email: string;
  name: string;
  periodKey: string;
  estimatedSteps: number;
  monthlyLimit: number;
  usagePercent: number;
  thresholdPercent: number;
  remindersCount: number;
}

/**
 * Отправляет администратору оповещение о приближении к месячному лимиту Workflow.
 * @returns id письма в Resend или null при ошибке
 */
export const sendWorkflowStepsThresholdAlertEmail = async ({
  email,
  name,
  periodKey,
  estimatedSteps,
  monthlyLimit,
  usagePercent,
  thresholdPercent,
  remindersCount
}: SendWorkflowStepsThresholdAlertEmailParams): Promise<string | null> => {
  const subject = `[Workflow Alert] Порог ${thresholdPercent}% за ${periodKey}`;
  const message = [
    `Здравствуйте, ${name}!`,
    '',
    `За период ${periodKey} оценочный расход Workflow Steps достиг ${usagePercent.toFixed(1)}%.`,
    `Оценка: ${estimatedSteps} / ${monthlyLimit} steps.`,
    `Оценка основана на количестве отправленных напоминаний: ${remindersCount}.`,
    '',
    'Рекомендуется проверить usage в Vercel и при необходимости снизить частоту/объём напоминаний.'
  ].join('\n');

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject,
    react: AdminMessageTemplate({ subject, message })
  });

  if (error) {
    console.error('Ошибка отправки workflow threshold alert email:', error);
    return null;
  }

  return data?.id ?? null;
};

interface SendEventNotificationEmailParams {
  email: string;
  name: string;
  title: string;
  eventType: string;
  start: Date | string;
  end: Date | string;
  meetLink?: string;
  manageUrl: string;
  locale: string;
  timezone: string;
  variant?: EventNotificationVariant;
}

/**
 * Отправляет email-уведомление о создании или обновлении события.
 * @returns id письма в Resend или null при ошибке
 */
export const sendEventNotificationEmail = async ({
  email,
  name,
  title,
  eventType,
  start,
  end,
  meetLink,
  manageUrl,
  locale,
  timezone,
  variant = 'default'
}: SendEventNotificationEmailParams): Promise<string | null> => {
  const copy = getEventNotificationCopy(locale, variant);
  const localizedTitle = getLocalizedEventTitle(title, eventType, locale);
  const eventTypeLabel = getLocalizedEventTypeLabel(eventType, locale);
  const { dateText, timeText } = formatEmailEventDateTime({
    start,
    end,
    locale,
    timeZone: timezone
  });

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: copy?.subject || 'Schedule Update',
    react: EventNotificationTemplate({
      name,
      title: localizedTitle,
      eventTypeLabel,
      dateText,
      timeText,
      meetLink,
      manageUrl,
      translations: {
        heading: copy?.heading || '',
        greeting: interpolate(copy?.greeting || '', { name }),
        message: interpolate(copy?.message || '', {
          title: localizedTitle
        }),
        dateLabel: copy?.dateLabel || '',
        timeLabel: copy?.timeLabel || '',
        typeLabel: copy?.typeLabel || '',
        meetLinkLabel: copy?.meetLinkLabel || '',
        button: copy?.button || '',
        footer: copy?.footer || ''
      }
    })
  });

  if (error) {
    console.error('Ошибка отправки event notification email:', error);
    return null;
  }

  return data?.id ?? null;
};

interface SendSessionReminderEmailParams {
  email: string;
  name: string;
  title: string;
  eventType: string;
  start: Date | string;
  end: Date | string;
  meetLink?: string;
  manageUrl: string;
  locale: string;
  timezone: string;
  reminderMinutes: number;
}

/**
 * Отправляет email-напоминание о скором начале сессии.
 * @returns id письма в Resend или null при ошибке
 */
export const sendSessionReminderEmail = async ({
  email,
  name,
  title,
  eventType,
  start,
  end,
  meetLink,
  manageUrl,
  locale,
  timezone,
  reminderMinutes
}: SendSessionReminderEmailParams): Promise<string | null> => {
  const translations = getEmailTranslations(locale);
  const sessionReminder = translations.sessionReminder;
  const isStartsNow = reminderMinutes === 0;
  const localizedTitle = getLocalizedEventTitle(title, eventType, locale);
  const eventTypeLabel = getLocalizedEventTypeLabel(eventType, locale);
  const { dateText, timeText } = formatEmailEventDateTime({
    start,
    end,
    locale,
    timeZone: timezone
  });
  const subjectTemplate = isStartsNow
    ? sessionReminder?.subjectNow || 'Session starts now - Vershkov.com'
    : sessionReminder?.subjectInMinutes || 'Session starts in {minutes} min - Vershkov.com';

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: interpolate(subjectTemplate, {
      minutes: String(reminderMinutes)
    }),
    react: EventNotificationTemplate({
      name,
      title: localizedTitle,
      eventTypeLabel,
      dateText,
      timeText,
      meetLink,
      manageUrl,
      translations: {
        heading:
          (isStartsNow ? sessionReminder?.headingNow : sessionReminder?.headingInMinutes) ||
          'Session Reminder',
        greeting: interpolate(sessionReminder?.greeting || 'Hello, {name}!', { name }),
        message: interpolate(
          (isStartsNow ? sessionReminder?.messageNow : sessionReminder?.messageInMinutes) ||
            'Your session "{title}" starts in {minutes} minutes.',
          {
            title: localizedTitle,
            minutes: String(reminderMinutes)
          }
        ),
        dateLabel:
          sessionReminder?.dateLabel || translations.eventNotification?.dateLabel || 'Date',
        timeLabel:
          sessionReminder?.timeLabel || translations.eventNotification?.timeLabel || 'Time',
        typeLabel:
          sessionReminder?.typeLabel || translations.eventNotification?.typeLabel || 'Event Type',
        meetLinkLabel:
          sessionReminder?.meetLinkLabel ||
          translations.eventNotification?.meetLinkLabel ||
          'Meeting Link',
        button:
          sessionReminder?.button || translations.eventNotification?.button || 'View My Schedule',
        footer:
          sessionReminder?.footer ||
          translations.eventNotification?.footer ||
          'This is an automated reminder. Please do not reply.'
      }
    })
  });

  if (error) {
    console.error('Ошибка отправки session reminder email:', error);
    return null;
  }

  return data?.id ?? null;
};

interface SendPilloIntakeReminderEmailParams {
  email: string;
  name: string;
  medicationName: string;
  doseText: string;
  scheduledFor: Date | string;
  actionUrl: string;
  skipUrl: string;
  locale: string;
  timezone: string;
}

/**
 * Отправляет email-напоминание о приёме лекарства в Pillo.
 * @param params - получатель, лекарство, доза, ссылка подтверждения и ссылка пропуска.
 * @returns id письма в Resend или null при ошибке.
 */
export const sendPilloIntakeReminderEmail = async ({
  email,
  name,
  medicationName,
  doseText,
  scheduledFor,
  actionUrl,
  skipUrl,
  locale,
  timezone
}: SendPilloIntakeReminderEmailParams): Promise<string | null> => {
  const copy = getPilloNotificationCopy(locale);
  const timeText = formatPilloIntakeDateTime({ scheduledFor, timezone, locale });

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: copy.intakeSubject,
    react: PilloNotificationTemplate({
      preview: copy.intakeHeading,
      heading: copy.intakeHeading,
      greeting: interpolatePilloCopy(copy.greeting, { name }),
      message: copy.intakeMessage,
      details: [
        { label: copy.medicationLabel, value: medicationName },
        { label: copy.doseLabel, value: doseText },
        { label: copy.timeLabel, value: timeText }
      ],
      buttonText: copy.takeButton,
      actionUrl,
      secondaryButtonText: copy.skipButton,
      secondaryActionUrl: skipUrl,
      footer: copy.footer
    })
  });

  if (error) {
    console.error('Ошибка отправки Pillo intake reminder email:', error);
    return null;
  }

  return data?.id ?? null;
};

interface SendPilloLowStockEmailParams {
  email: string;
  name: string;
  medicationName: string;
  stockText: string;
  actionUrl: string;
  locale: string;
}

/**
 * Отправляет email о низком остатке лекарства в Pillo.
 * @param params - получатель, лекарство, остаток и ссылка на приложение.
 * @returns id письма в Resend или null при ошибке.
 */
export const sendPilloLowStockEmail = async ({
  email,
  name,
  medicationName,
  stockText,
  actionUrl,
  locale
}: SendPilloLowStockEmailParams): Promise<string | null> => {
  const copy = getPilloNotificationCopy(locale);

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: copy.lowStockSubject,
    react: PilloNotificationTemplate({
      preview: copy.lowStockHeading,
      heading: copy.lowStockHeading,
      greeting: interpolatePilloCopy(copy.greeting, { name }),
      message: copy.lowStockMessage,
      details: [
        { label: copy.medicationLabel, value: medicationName },
        { label: copy.stockLabel, value: stockText }
      ],
      buttonText: copy.openButton,
      actionUrl,
      footer: copy.footer
    })
  });

  if (error) {
    console.error('Ошибка отправки Pillo low stock email:', error);
    return null;
  }

  return data?.id ?? null;
};

/**
 * Отправляет email о критически низком (пустом) остатке лекарства в Pillo.
 * @param params - получатель, лекарство, остаток и ссылка на приложение.
 * @returns id письма в Resend или null при ошибке.
 */
export const sendPilloEmptyStockEmail = async ({
  email,
  name,
  medicationName,
  stockText,
  actionUrl,
  locale
}: SendPilloLowStockEmailParams): Promise<string | null> => {
  const copy = getPilloNotificationCopy(locale);

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: copy.emptyStockSubject,
    react: PilloNotificationTemplate({
      preview: copy.emptyStockHeading,
      heading: copy.emptyStockHeading,
      greeting: interpolatePilloCopy(copy.greeting, { name }),
      message: copy.emptyStockMessage,
      details: [
        { label: copy.medicationLabel, value: medicationName },
        { label: copy.stockLabel, value: stockText }
      ],
      buttonText: copy.openButton,
      actionUrl,
      footer: copy.footer
    })
  });

  if (error) {
    console.error('Ошибка отправки Pillo empty stock email:', error);
    return null;
  }

  return data?.id ?? null;
};

interface SendPilloCourseEndEmailParams {
  email: string;
  name: string;
  medicationName: string;
  endDateText: string;
  actionUrl: string;
  locale: string;
}

/**
 * Отправляет email об окончании курса приёма в Pillo.
 * @param params - получатель, лекарство, дата окончания и ссылка на приложение.
 * @returns id письма в Resend или null при ошибке.
 */
export const sendPilloCourseEndEmail = async ({
  email,
  name,
  medicationName,
  endDateText,
  actionUrl,
  locale
}: SendPilloCourseEndEmailParams): Promise<string | null> => {
  const copy = getPilloNotificationCopy(locale);

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: copy.courseEndSubject,
    react: PilloNotificationTemplate({
      preview: copy.courseEndHeading,
      heading: copy.courseEndHeading,
      greeting: interpolatePilloCopy(copy.greeting, { name }),
      message: copy.courseEndMessage,
      details: [
        { label: copy.medicationLabel, value: medicationName },
        { label: copy.courseLabel, value: endDateText }
      ],
      buttonText: copy.openButton,
      actionUrl,
      footer: copy.footer
    })
  });

  if (error) {
    console.error('Ошибка отправки Pillo course end email:', error);
    return null;
  }

  return data?.id ?? null;
};

interface SendEventCancellationEmailParams {
  email: string;
  name: string;
  title: string;
  eventType: string;
  start: Date | string;
  end: Date | string;
  reason?: string;
  manageUrl: string;
  locale: string;
  timezone: string;
  variant?: EventCancellationVariant;
}

/**
 * Отправляет email-уведомление об отмене события.
 * @returns id письма в Resend или null при ошибке
 */
export const sendEventCancellationEmail = async ({
  email,
  name,
  title,
  eventType,
  start,
  end,
  reason,
  manageUrl,
  locale,
  timezone,
  variant = 'default'
}: SendEventCancellationEmailParams): Promise<string | null> => {
  const copy = getEventCancellationCopy(locale, variant);
  const localizedTitle = getLocalizedEventTitle(title, eventType, locale);
  const eventTypeLabel = getLocalizedEventTypeLabel(eventType, locale);
  const { dateText, timeText } = formatEmailEventDateTime({
    start,
    end,
    locale,
    timeZone: timezone
  });

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: copy?.subject || 'Event Cancelled',
    react: EventCancellationTemplate({
      name,
      title: localizedTitle,
      eventTypeLabel,
      dateText,
      timeText,
      reason,
      manageUrl,
      translations: {
        heading: copy?.heading || '',
        greeting: interpolate(copy?.greeting || '', { name }),
        message: interpolate(copy?.message || '', {
          title: localizedTitle
        }),
        dateLabel: copy?.dateLabel || '',
        timeLabel: copy?.timeLabel || '',
        typeLabel: copy?.typeLabel || '',
        reasonLabel: copy?.reasonLabel || '',
        button: copy?.button || '',
        footer: copy?.footer || ''
      }
    })
  });

  if (error) {
    console.error('Ошибка отправки event cancellation email:', error);
    return null;
  }

  return data?.id ?? null;
};

interface BlogSubscriberInfo {
  email: string;
  name?: string;
  locale: string;
  unsubscribeToken?: string;
}

/**
 * Отправляет email-уведомления подписчикам блога при публикации новой статьи.
 */
export const sendBlogNotificationEmail = async (
  post: BlogPost,
  translation: BlogPostTranslation,
  subscribers: BlogSubscriberInfo[]
): Promise<void> => {
  if (subscribers.length === 0) return;

  const baseUrl = getBaseUrl();
  const articleUrl = `${baseUrl}/blog/${post.slug}`;

  const results = await Promise.allSettled(
    subscribers.map(async subscriber => {
      const locale = normalizeEmailLocale(subscriber.locale);
      const publishedAt = post.publishedAt ? formatBlogDate(post.publishedAt, locale) : '';

      const unsubscribeUrl = subscriber.unsubscribeToken
        ? `${baseUrl}/${locale}/blog/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribeToken)}`
        : undefined;

      const html = await render(
        BlogNotificationEmail({
          recipientName: subscriber.name,
          title: translation.title,
          description: translation.description,
          coverImage: post.coverImage ?? undefined,
          readingTime: post.readingTime,
          publishedAt,
          articleUrl,
          unsubscribeUrl,
          locale
        })
      );

      return resend.emails.send({
        from: FROM_ADDRESS,
        to: subscriber.email,
        subject: translation.title,
        html
      });
    })
  );

  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(
      `Ошибка отправки blog notification: ${failed.length} из ${subscribers.length} не отправлены`
    );
  }
};

interface SendAccountDeletionRequestEmailParams {
  to: string;
  name: string;
  token: string;
  language: string;
}

/**
 * Отправляет письмо с подтверждением удаления аккаунта.
 * Содержит ссылку, по которой пользователь подтверждает удаление.
 */
export const sendAccountDeletionRequestEmail = async ({
  to,
  name,
  token,
  language
}: SendAccountDeletionRequestEmailParams): Promise<void> => {
  const t = getEmailTranslations(language);
  const baseUrl = getBaseUrl();
  const locale = normalizeEmailLocale(language);
  const deletionUrl = `${baseUrl}/${locale}/account/delete?token=${encodeURIComponent(token)}`;

  const html = await render(
    AccountDeletionRequestTemplate({
      name,
      deletionUrl,
      translations: t.accountDeletionRequest
    })
  );

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: t.accountDeletionRequest.subject,
    html
  });
};

interface SendAccountDeletedUserEmailParams {
  to: string;
  name: string;
  language: string;
}

/**
 * Отправляет письмо пользователю после успешного удаления его аккаунта.
 */
export const sendAccountDeletedUserEmail = async ({
  to,
  name,
  language
}: SendAccountDeletedUserEmailParams): Promise<void> => {
  const t = getEmailTranslations(language);

  const html = await render(
    AccountDeletedUserTemplate({
      name,
      translations: t.accountDeleted
    })
  );

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: t.accountDeleted.subject,
    html
  });
};

interface SendAccountDeletedAdminEmailParams {
  to: string;
  name: string;
  email: string;
}

/**
 * Отправляет уведомление администратору об удалении пользовательского аккаунта.
 */
export const sendAccountDeletedAdminEmail = async ({
  to,
  name,
  email
}: SendAccountDeletedAdminEmailParams): Promise<void> => {
  const t = getEmailTranslations('ru');
  const deletedAt = new Date().toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = await render(
    AccountDeletedAdminTemplate({
      name,
      email,
      deletedAt,
      translations: t.adminAccountDeleted
    })
  );

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: t.adminAccountDeleted.subject,
    html
  });
};

/**
 * Отправляет уведомление администратору о новой анкете клиента.
 */
export const sendAdminIntakeNotificationToAdmin = async (
  adminEmail: string,
  userId: string,
  formId: string
): Promise<void> => {
  const dashboardUrl = `${getBaseUrl()}/ru/admin/clients`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: adminEmail,
    subject: `Новая анкета клиента: ${formId}`,
    react: React.createElement(AdminIntakeNotificationTemplate, {
      userId,
      formId,
      dashboardUrl
    })
  });
};
