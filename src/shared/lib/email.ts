import { Resend } from 'resend';
import { VerificationEmailTemplate } from '@/components/email-templates/verification-email-template';
import { WelcomeGoogleEmailTemplate } from '@/components/email-templates/welcome-google-email-template';
import { EventNotificationTemplate } from '@/components/email-templates/event-notification-template';
import { EventCancellationTemplate } from '@/components/email-templates/event-cancellation-template';
import { AdminEventBookingTemplate } from '@/components/email-templates/admin-event-booking-template';
import { AdminEventCancellationTemplate } from '@/components/email-templates/admin-event-cancellation-template';
import { BlogNotificationEmail } from '@/components/email-templates/blog-notification-template';
import { render } from '@react-email/render';
import type { BlogPost, BlogPostTranslation } from '@prisma/client';
import { formatBlogDate } from '@/shared/lib/blog-utils';
import emailEn from '../../../messages/email-en.json';
import emailRu from '../../../messages/email-ru.json';

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

/** Маппинг locale → переводы email (расширяемо при добавлении новых языков) */
const EMAIL_TRANSLATIONS: Record<string, typeof emailEn> = {
  en: emailEn,
  ru: emailRu
};

/**
 * Получает переводы email для указанного locale.
 * Если locale не поддерживается — возвращает английские переводы.
 * @param locale - код языка (en, ru, и т.д.)
 */
export const getEmailTranslations = (locale: string): typeof emailEn => {
  return EMAIL_TRANSLATIONS[locale] ?? emailEn;
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
  const verificationUrl = `${getBaseUrl()}/api/auth/verify-email?token=${token}`;

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
  locale = 'ru'
}: AdminEventBookingEmailParams) => {
  let translations = {};
  try {
    const messages = await import(`../../../messages/${locale}.json`);
    translations = messages.AdminEventBooking || {};
  } catch (error) {
    console.error(`Failed to load translations for locale: ${locale}`, error);
    try {
      const fbMessages = await import(`../../../messages/ru.json`);
      translations = fbMessages.AdminEventBooking || {};
    } catch (e) {}
  }

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [adminEmail],
    subject: `Новая запись: ${title || eventType}`,
    react: AdminEventBookingTemplate({
      adminName,
      userName,
      userEmail,
      title,
      eventType,
      start,
      end,
      manageUrl,
      t: translations as any
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
  locale = 'ru'
}: AdminEventCancellationEmailParams) => {
  let translations = {};
  try {
    const messages = await import(`../../../messages/${locale}.json`);
    translations = messages.AdminEventCancellation || {};
  } catch (error) {
    console.error(`Failed to load translations for locale: ${locale}`, error);
    try {
      const fbMessages = await import(`../../../messages/ru.json`);
      translations = fbMessages.AdminEventCancellation || {};
    } catch (e) {}
  }

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [adminEmail],
    subject: `Отмена записи: ${title || eventType}`,
    react: AdminEventCancellationTemplate({
      adminName,
      userName,
      userEmail,
      title,
      eventType,
      start,
      end,
      reason,
      manageUrl,
      t: translations as any
    })
  });

  if (error) {
    console.error('Failed to send admin event cancellation email:', error);
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
  timezone
}: SendEventNotificationEmailParams): Promise<string | null> => {
  const translations = getEmailTranslations(locale);

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: translations.eventNotification?.subject || 'Schedule Update',
    react: EventNotificationTemplate({
      name,
      title,
      eventType,
      start,
      end,
      meetLink,
      manageUrl,
      timezone,
      translations: {
        heading: translations.eventNotification?.heading || '',
        greeting: interpolate(translations.eventNotification?.greeting || '', { name }),
        message: interpolate(translations.eventNotification?.message || '', {
          title: title || eventType
        }),
        dateLabel: translations.eventNotification?.dateLabel || '',
        timeLabel: translations.eventNotification?.timeLabel || '',
        typeLabel: translations.eventNotification?.typeLabel || '',
        meetLinkLabel: translations.eventNotification?.meetLinkLabel || '',
        button: translations.eventNotification?.button || '',
        footer: translations.eventNotification?.footer || ''
      }
    })
  });

  if (error) {
    console.error('Ошибка отправки event notification email:', error);
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
  timezone
}: SendEventCancellationEmailParams): Promise<string | null> => {
  const translations = getEmailTranslations(locale);

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [email],
    subject: translations.eventCancellation?.subject || 'Event Cancelled',
    react: EventCancellationTemplate({
      name,
      title,
      eventType,
      start,
      end,
      reason,
      manageUrl,
      timezone,
      translations: {
        heading: translations.eventCancellation?.heading || '',
        greeting: interpolate(translations.eventCancellation?.greeting || '', { name }),
        message: interpolate(translations.eventCancellation?.message || '', {
          title: title || eventType
        }),
        dateLabel: translations.eventCancellation?.dateLabel || '',
        timeLabel: translations.eventCancellation?.timeLabel || '',
        typeLabel: translations.eventCancellation?.typeLabel || '',
        reasonLabel: translations.eventCancellation?.reasonLabel || '',
        button: translations.eventCancellation?.button || '',
        footer: translations.eventCancellation?.footer || ''
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
      const locale = ['ru', 'en', 'sr'].includes(subscriber.locale) ? subscriber.locale : 'ru';
      const publishedAt = post.publishedAt ? formatBlogDate(post.publishedAt, locale) : '';

      const unsubscribeUrl = subscriber.unsubscribeToken
        ? `${baseUrl}/api/blog/unsubscribe?token=${subscriber.unsubscribeToken}`
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
