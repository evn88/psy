import { Resend } from 'resend';
import { VerificationEmailTemplate } from '@/components/email-templates/verification-email-template';
import { WelcomeGoogleEmailTemplate } from '@/components/email-templates/welcome-google-email-template';
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
