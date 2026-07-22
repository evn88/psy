import { z } from 'zod';

import { locales } from '@/i18n/config';
import {
  assertSafeEmailTemplateHtml,
  sanitizeEmailTemplateCss
} from '@/modules/email-templates/email-template-renderer.server';
import {
  assertEmailTemplateConditionalSyntax,
  getHtmlTokensUsedInSubject,
  getUnknownEmailTemplateTokens
} from '@/modules/email-templates/email-template-token-service';
import { editableEmailTemplateKeys, type EditableEmailTemplateKey } from './types';

const emailTemplateDocumentSchema = z
  .object({
    subject: z.string().trim().min(1).max(240),
    html: z.string().trim().min(1).max(100_000),
    css: z.string().max(20_000)
  })
  .strict();

/** Создаёт строгую схему HTML-документа с проверкой токенов и CSS. */
export const getEmailTemplateContentSchema = (template: EditableEmailTemplateKey) => {
  return emailTemplateDocumentSchema.superRefine((content, context) => {
    getUnknownEmailTemplateTokens(template, content).forEach(token => {
      context.addIssue({
        code: 'custom',
        message: `Токен {${token}} не зарегистрирован для шаблона`
      });
    });

    getHtmlTokensUsedInSubject(template, content.subject).forEach(token => {
      context.addIssue({
        code: 'custom',
        path: ['subject'],
        message: `HTML-токен {${token}} нельзя использовать в теме письма`
      });
    });

    try {
      assertSafeEmailTemplateHtml(content.html);
      assertEmailTemplateConditionalSyntax(content.html);
    } catch (error) {
      context.addIssue({
        code: 'custom',
        path: ['html'],
        message: error instanceof Error ? error.message : 'Некорректный HTML'
      });
    }

    try {
      sanitizeEmailTemplateCss(content.css);
    } catch (error) {
      context.addIssue({
        code: 'custom',
        path: ['css'],
        message: error instanceof Error ? error.message : 'Некорректный CSS'
      });
    }
  });
};

export const emailTemplateEditorInputSchema = z.object({
  template: z.enum(editableEmailTemplateKeys),
  locale: z.enum(locales),
  content: z.record(z.string(), z.string())
});

/** Валидирует содержимое в соответствии с выбранным шаблоном. */
export const parseEmailTemplateContent = (template: EditableEmailTemplateKey, content: unknown) =>
  getEmailTemplateContentSchema(template).parse(content);

export const safeParseEmailTemplateContent = (
  template: EditableEmailTemplateKey,
  content: unknown
) => getEmailTemplateContentSchema(template).safeParse(content);
