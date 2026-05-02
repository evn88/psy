import { z } from 'zod';

const targetLocalesSchema = z
  .array(z.string().trim().min(2))
  .min(1, 'Нужно указать хотя бы одну целевую локаль')
  .superRefine((targetLocales, ctx) => {
    const seenLocales = new Set<string>();

    targetLocales.forEach((locale, index) => {
      const normalizedLocale = locale.toLowerCase();

      if (seenLocales.has(normalizedLocale)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Список целевых локалей не должен содержать дубликаты',
          path: [index]
        });
        return;
      }

      seenLocales.add(normalizedLocale);
    });
  });

/**
 * Контракт входных данных для общего перевода текста.
 */
export const textTranslationInputSchema = z.object({
  sourceLocale: z.string().trim().min(2),
  targetLocales: targetLocalesSchema,
  text: z
    .string()
    .min(1)
    .refine(text => text.trim().length > 0, {
      message: 'Текст для перевода не должен быть пустым'
    })
});

/**
 * Контракт одного результата перевода.
 */
export const textTranslationItemSchema = z.object({
  locale: z.string().trim().min(2),
  text: z
    .string()
    .min(1)
    .refine(text => text.trim().length > 0, {
      message: 'Перевод не должен быть пустым'
    })
});

/**
 * Контракт результата общего перевода текста.
 */
export const textTranslationResultSchema = z.object({
  sourceLocale: z.string().trim().min(2),
  translations: z.array(textTranslationItemSchema).min(1)
});

export type TextTranslationInput = z.infer<typeof textTranslationInputSchema>;
export type TextTranslationItem = z.infer<typeof textTranslationItemSchema>;
export type TextTranslationResult = z.infer<typeof textTranslationResultSchema>;
