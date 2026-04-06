import * as z from 'zod';

export interface Translation {
  locale: string;
  title: string;
  description: string;
  content: string;
}

export const translationSchema = z.object({
  locale: z.string(),
  title: z.string(),
  description: z.string(),
  content: z.string()
});

export const formSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED']),
  coverImage: z.string().nullable(),
  categoryIds: z.array(z.string()),
  translations: z.array(translationSchema)
});

export type FormValues = z.infer<typeof formSchema>;

export interface Version {
  id: string;
  savedAt: string;
  translations: Translation[];
  categoryIds: string[];
  coverImage: string | null;
}
