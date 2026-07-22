import { z } from 'zod';

import { editableEmailTemplateKeys } from '@/modules/email-templates/types';

const emailTemplateDocumentSchema = z.object({
  subject: z.string(),
  html: z.string(),
  css: z.string()
});

export const emailTemplateTranslationInputSchema = z.object({
  template: z.enum(editableEmailTemplateKeys),
  sourceLocale: z.literal('ru'),
  targetLocales: z.array(z.enum(['en', 'sr'])).min(1),
  content: emailTemplateDocumentSchema
});

export const emailTemplateTranslationResultSchema = z.object({
  translations: z.array(
    z.object({
      locale: z.enum(['en', 'sr']),
      content: emailTemplateDocumentSchema
    })
  )
});

export type EmailTemplateTranslationInput = z.infer<typeof emailTemplateTranslationInputSchema>;
export type EmailTemplateTranslationResult = z.infer<typeof emailTemplateTranslationResultSchema>;
