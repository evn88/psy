import type { Prisma } from '@prisma/client';
import { locales, type AppLocale } from '@/i18n/config';
import prisma from '@/lib/prisma';
import {
  getDefaultEmailTemplateContent,
  getEmailTemplateEditorKeys
} from '@/modules/email-templates/email-template-registry';
import { safeParseEmailTemplateContent } from '@/modules/email-templates/schemas';
import { renderEmailTemplateDocument } from '@/modules/email-templates/email-template-renderer.server';
import { renderEmailTemplateContent } from '@/modules/email-templates/email-template-token-service';
import type {
  EditableEmailTemplateKey,
  EmailTemplateDocument,
  EmailTemplateEditorValue
} from '@/modules/email-templates/types';

interface EmailTemplateOverrideRecord {
  template: string;
  locale: string;
  content: unknown;
}

/**
 * Возвращает встроенное содержимое, дополненное сохранённым переопределением администратора.
 * Некорректная или недоступная запись не блокирует системную отправку письма.
 */
export const getEmailTemplateContent = async (
  template: EditableEmailTemplateKey,
  locale: AppLocale
): Promise<EmailTemplateDocument> => {
  const fallback = getDefaultEmailTemplateContent(template, locale);

  try {
    const override = await prisma.emailTemplateOverride.findUnique({
      where: { template_locale: { template, locale } },
      select: { content: true }
    });

    if (!override) {
      return fallback;
    }

    const content = safeParseEmailTemplateContent(template, override.content);
    return content.success ? content.data : fallback;
  } catch {
    return fallback;
  }
};

/** Загружает шаблон и подставляет переданные динамические значения. */
export const getResolvedEmailTemplateContent = async (
  template: EditableEmailTemplateKey,
  locale: AppLocale,
  tokenValues: Record<string, string>
): Promise<EmailTemplateDocument> => {
  const content = await getEmailTemplateContent(template, locale);
  return renderEmailTemplateContent(template, content, tokenValues);
};

/** Возвращает готовые тему и HTML для отправки через почтового провайдера. */
export const renderStoredEmailTemplate = async (
  template: EditableEmailTemplateKey,
  locale: AppLocale,
  tokenValues: Record<string, string>
): Promise<{ subject: string; html: string }> => {
  const content = await getResolvedEmailTemplateContent(template, locale, tokenValues);
  return renderEmailTemplateDocument(content, locale);
};

/**
 * Загружает все значения, нужные для первого рендера редактора.
 */
export const getEmailTemplateEditorValues = async (): Promise<EmailTemplateEditorValue[]> => {
  const templates = getEmailTemplateEditorKeys();
  const overrides: EmailTemplateOverrideRecord[] = await prisma.emailTemplateOverride
    .findMany({
      where: { template: { in: templates } },
      select: { template: true, locale: true, content: true }
    })
    .catch(() => []);

  return templates.flatMap(template =>
    locales.map(locale => {
      const fallback = getDefaultEmailTemplateContent(template, locale);
      const override = overrides.find(item => item.template === template && item.locale === locale);
      const parsedOverride = override
        ? safeParseEmailTemplateContent(template, override.content)
        : null;

      return {
        template,
        locale,
        content: parsedOverride?.success ? parsedOverride.data : fallback,
        isOverridden: parsedOverride?.success === true
      };
    })
  );
};

/**
 * Сохраняет валидированное содержимое шаблона для выбранной локали.
 */
export const saveEmailTemplateContent = async (
  template: EditableEmailTemplateKey,
  locale: AppLocale,
  content: EmailTemplateDocument
): Promise<void> => {
  await prisma.emailTemplateOverride.upsert({
    where: { template_locale: { template, locale } },
    create: {
      template,
      locale,
      content: content as unknown as Prisma.InputJsonValue
    },
    update: {
      content: content as unknown as Prisma.InputJsonValue
    }
  });
};
