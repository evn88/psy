import { z } from 'zod';

/**
 * Контракт входных данных для перевода статьи.
 */
export const blogArticleTranslationInputSchema = z
  .object({
    sourceLocale: z.string().trim().min(2),
    targetLocale: z.string().trim().min(2),
    title: z.string().trim().min(1),
    description: z.string().trim().default(''),
    content: z.string().trim().min(1)
  })
  .refine(value => value.sourceLocale !== value.targetLocale, {
    message: 'Исходная и целевая локали не должны совпадать',
    path: ['targetLocale']
  });

/**
 * Контракт результата перевода статьи.
 */
export const blogArticleTranslationResultSchema = z.object({
  targetLocale: z.string().trim().min(2),
  title: z.string().trim().min(1),
  description: z.string().trim(),
  content: z.string().trim().min(1)
});

export type BlogArticleTranslationInput = z.infer<typeof blogArticleTranslationInputSchema>;
export type BlogArticleTranslationResult = z.infer<typeof blogArticleTranslationResultSchema>;
