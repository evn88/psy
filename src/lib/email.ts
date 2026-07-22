import { Resend } from 'resend';
import type { BlogPost, BlogPostTranslation } from '@prisma/client';
import { formatPilloIntakeDateTime } from '@/modules/pillo/notifications';
import { formatBlogDate } from '@/lib/blog-utils';
import {
  getEmailTemplateContent,
  renderStoredEmailTemplate
} from '@/modules/email-templates/email-template-service.server';
import { renderEmailTemplateContent } from '@/modules/email-templates/email-template-token-service';
import { renderEmailTemplateDocument } from '@/modules/email-templates/email-template-renderer.server';
import {
  formatEmailEventDateTime,
  getLocalizedEventTitle,
  getLocalizedEventTypeLabel,
  normalizeEmailLocale
} from '@/lib/email-localization';

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

const escapeEmailHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderDetailsHtml = (details: Array<{ label: string; value: string }>): string => {
  return details
    .map(
      detail =>
        `<p><strong>${escapeEmailHtml(detail.label)}:</strong> ${escapeEmailHtml(detail.value)}</p>`
    )
    .join('');
};

interface SendFinancialNotificationEmailParams {
  email: string;
  subject: string;
  heading: string;
  greeting: string;
  message: string;
  details: Array<{ label: string; value: string }>;
  actionUrl: string;
  actionText: string;
  locale?: string;
}

/**
 * Отправляет подготовленное обязательное финансовое уведомление.
 */
export const sendFinancialNotificationEmail = async ({
  email,
  subject,
  heading,
  greeting,
  message,
  details,
  actionUrl,
  actionText,
  locale = 'ru'
}: SendFinancialNotificationEmailParams): Promise<string | null> => {
  const rendered = await renderStoredEmailTemplate(
    'FINANCIAL_NOTIFICATION',
    normalizeEmailLocale(locale),
    {
      subject,
      heading,
      greeting,
      message,
      detailsHtml: renderDetailsHtml(details),
      actionText,
      actionUrl
    }
  );
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: rendered.subject,
    html: rendered.html
  });

  if (error) {
    console.error('Ошибка отправки финансового уведомления:', error);
    return null;
  }

  return data?.id ?? null;
};

type EventNotificationVariant = 'default' | 'bookingPending' | 'bookingConfirmed';

type EventCancellationVariant = 'default' | 'bookingRejected';

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
  const normalizedLocale = normalizeEmailLocale(locale);
  const verificationUrl = `${getBaseUrl()}/${normalizedLocale}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const rendered = await renderStoredEmailTemplate('VERIFICATION', normalizedLocale, {
    name,
    verificationUrl
  });

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: rendered.subject,
    html: rendered.html
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
  const dashboardUrl = `${getBaseUrl()}/my`;
  const rendered = await renderStoredEmailTemplate('WELCOME_GOOGLE', normalizeEmailLocale(locale), {
    name,
    dashboardUrl
  });

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: rendered.subject,
    html: rendered.html
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
  const localizedTitle = getLocalizedEventTitle(title, eventType, locale);
  const { dateText, timeText } = formatEmailEventDateTime({
    start,
    end,
    locale,
    timeZone: timezone
  });
  const rendered = await renderStoredEmailTemplate(
    'ADMIN_EVENT_BOOKING',
    normalizeEmailLocale(locale),
    {
      name: adminName,
      userName,
      userEmail,
      title: localizedTitle,
      date: dateText,
      time: timeText,
      reason: '',
      manageUrl
    }
  );

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [adminEmail],
    subject: rendered.subject,
    html: rendered.html
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
  const localizedTitle = getLocalizedEventTitle(title, eventType, locale);
  const { dateText, timeText } = formatEmailEventDateTime({
    start,
    end,
    locale,
    timeZone: timezone
  });
  const rendered = await renderStoredEmailTemplate(
    'ADMIN_EVENT_CANCELLATION',
    normalizeEmailLocale(locale),
    {
      name: adminName,
      userName,
      userEmail,
      title: localizedTitle,
      date: dateText,
      time: timeText,
      reason: reason ?? '',
      manageUrl
    }
  );

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [adminEmail],
    subject: rendered.subject,
    html: rendered.html
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
  const rendered = await renderStoredEmailTemplate('ADMIN_MESSAGE', 'ru', {
    subject,
    message
  });

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: rendered.subject,
    html: rendered.html
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
  const template =
    variant === 'bookingPending'
      ? 'BOOKING_PENDING'
      : variant === 'bookingConfirmed'
        ? 'BOOKING_CONFIRMED'
        : 'EVENT_NOTIFICATION';
  const localizedTitle = getLocalizedEventTitle(title, eventType, locale);
  const eventTypeLabel = getLocalizedEventTypeLabel(eventType, locale);
  const { dateText, timeText } = formatEmailEventDateTime({
    start,
    end,
    locale,
    timeZone: timezone
  });
  const rendered = await renderStoredEmailTemplate(template, normalizeEmailLocale(locale), {
    name,
    title: localizedTitle,
    eventType: eventTypeLabel,
    date: dateText,
    time: timeText,
    meetLink: meetLink ?? '',
    manageUrl
  });

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: rendered.subject,
    html: rendered.html
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
  const isStartsNow = reminderMinutes === 0;
  const localizedTitle = getLocalizedEventTitle(title, eventType, locale);
  const eventTypeLabel = getLocalizedEventTypeLabel(eventType, locale);
  const { dateText, timeText } = formatEmailEventDateTime({
    start,
    end,
    locale,
    timeZone: timezone
  });
  const rendered = await renderStoredEmailTemplate(
    isStartsNow ? 'SESSION_REMINDER_NOW' : 'SESSION_REMINDER_SOON',
    normalizeEmailLocale(locale),
    {
      name,
      title: localizedTitle,
      eventType: eventTypeLabel,
      date: dateText,
      time: timeText,
      minutes: String(reminderMinutes),
      meetLink: meetLink ?? '',
      manageUrl
    }
  );

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: rendered.subject,
    html: rendered.html
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
  idempotencyKey: string;
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
  timezone,
  idempotencyKey
}: SendPilloIntakeReminderEmailParams): Promise<string | null> => {
  const timeText = formatPilloIntakeDateTime({ scheduledFor, timezone, locale });
  const rendered = await renderStoredEmailTemplate('PILLO_INTAKE', normalizeEmailLocale(locale), {
    name,
    medicationName,
    dose: doseText,
    time: timeText,
    actionUrl,
    skipUrl
  });

  const { data, error } = await resend.emails.send(
    {
      from: FROM_ADDRESS,
      to: [email],
      subject: rendered.subject,
      html: rendered.html
    },
    { idempotencyKey }
  );

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
  const rendered = await renderStoredEmailTemplate(
    'PILLO_LOW_STOCK',
    normalizeEmailLocale(locale),
    { name, medicationName, stock: stockText, actionUrl }
  );

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: rendered.subject,
    html: rendered.html
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
  const rendered = await renderStoredEmailTemplate(
    'PILLO_EMPTY_STOCK',
    normalizeEmailLocale(locale),
    { name, medicationName, stock: stockText, actionUrl }
  );

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: rendered.subject,
    html: rendered.html
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
  const rendered = await renderStoredEmailTemplate(
    'PILLO_COURSE_END',
    normalizeEmailLocale(locale),
    { name, medicationName, courseEnd: endDateText, actionUrl }
  );

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: rendered.subject,
    html: rendered.html
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
  const template = variant === 'bookingRejected' ? 'BOOKING_REJECTED' : 'EVENT_CANCELLATION';
  const localizedTitle = getLocalizedEventTitle(title, eventType, locale);
  const eventTypeLabel = getLocalizedEventTypeLabel(eventType, locale);
  const { dateText, timeText } = formatEmailEventDateTime({
    start,
    end,
    locale,
    timeZone: timezone
  });
  const rendered = await renderStoredEmailTemplate(template, normalizeEmailLocale(locale), {
    name,
    title: localizedTitle,
    eventType: eventTypeLabel,
    date: dateText,
    time: timeText,
    reason: reason ?? '',
    meetLink: '',
    manageUrl
  });

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: rendered.subject,
    html: rendered.html
  });

  if (error) {
    console.error('Ошибка отправки event cancellation email:', error);
    return null;
  }

  return data?.id ?? null;
};

interface BlogSubscriberInfo {
  email: string;
  locale: string;
  unsubscribeToken?: string;
}

/**
 * Отправляет email-уведомления подписчикам блога при публикации новой статьи.
 */
export const sendBlogNotificationEmail = async (
  post: BlogPost & { author: { name: string | null } },
  translation: BlogPostTranslation,
  subscribers: BlogSubscriberInfo[]
): Promise<void> => {
  if (subscribers.length === 0) return;

  const baseUrl = getBaseUrl();
  const articleUrl = `${baseUrl}/blog/${post.slug}`;
  const subscriberLocales = [
    ...new Set(subscribers.map(subscriber => normalizeEmailLocale(subscriber.locale)))
  ];
  const blogNotificationCopies = new Map(
    await Promise.all(
      subscriberLocales.map(
        async locale =>
          [locale, await getEmailTemplateContent('BLOG_NOTIFICATION', locale)] as const
      )
    )
  );

  const results = await Promise.allSettled(
    subscribers.map(async subscriber => {
      const locale = normalizeEmailLocale(subscriber.locale);
      const publishedAt = post.publishedAt ? formatBlogDate(post.publishedAt, locale) : '';
      const rawLabels = blogNotificationCopies.get(locale);

      if (!rawLabels) {
        throw new Error(`Не найдены тексты шаблона блога для locale: ${locale}`);
      }

      const unsubscribeUrl = subscriber.unsubscribeToken
        ? `${baseUrl}/${locale}/blog/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribeToken)}`
        : '';
      const coverImage = post.coverImage ? new URL(post.coverImage, baseUrl).toString() : '';
      const resolved = renderEmailTemplateContent('BLOG_NOTIFICATION', rawLabels, {
        title: translation.title,
        description: translation.description,
        authorName: post.author.name ?? '',
        readingTime: String(post.readingTime),
        publishedAt,
        coverImage,
        articleUrl,
        unsubscribeUrl,
        settingsUrl: `${baseUrl}/${locale}/my/settings`
      });
      const rendered = renderEmailTemplateDocument(resolved, locale);

      return resend.emails.send({
        from: FROM_ADDRESS,
        to: subscriber.email,
        subject: rendered.subject,
        html: rendered.html
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
  const baseUrl = getBaseUrl();
  const locale = normalizeEmailLocale(language);
  const deletionUrl = `${baseUrl}/${locale}/account/delete?token=${encodeURIComponent(token)}`;
  const rendered = await renderStoredEmailTemplate('ACCOUNT_DELETION_REQUEST', locale, {
    name,
    deletionUrl
  });

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: rendered.subject,
    html: rendered.html
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
  const rendered = await renderStoredEmailTemplate(
    'ACCOUNT_DELETED_USER',
    normalizeEmailLocale(language),
    { name }
  );

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: rendered.subject,
    html: rendered.html
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
  const deletedAt = new Date().toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const rendered = await renderStoredEmailTemplate('ACCOUNT_DELETED_ADMIN', 'ru', {
    name,
    email,
    deletedAt
  });

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: rendered.subject,
    html: rendered.html
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
  const rendered = await renderStoredEmailTemplate('ADMIN_INTAKE', 'ru', {
    userId,
    formId,
    dashboardUrl
  });

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: adminEmail,
    subject: rendered.subject,
    html: rendered.html
  });
};
