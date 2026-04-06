import { z } from 'zod';

export const blogEditorSchema = z
  .object({
    title: z.string().trim().min(3, 'Заголовок должен содержать минимум 3 символа'),
    slug: z
      .string()
      .trim()
      .min(3, 'Slug должен содержать минимум 3 символа')
      .regex(/^[a-z0-9-]+$/, 'Только строчные латинские буквы, цифры и дефис'),
    description: z.string().max(200, 'Описание не может превышать 200 символов').optional()
  })
  .superRefine((data, ctx) => {
    if (!data.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Заголовок обязателен',
        path: ['title'],
        fatal: true
      });
    }
    if (!data.slug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Slug обязателен',
        path: ['slug'],
        fatal: true
      });
    }
  });

export type BlogEditorFormValues = z.infer<typeof blogEditorSchema>;
