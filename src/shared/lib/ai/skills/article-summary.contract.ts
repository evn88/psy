import { z } from 'zod';

/**
 * Контракт входных данных для суммаризации статьи.
 */
export const articleSummaryInputSchema = z.object({
  content: z.string().trim().min(1),
  targetLocale: z.string().trim().min(2).optional(),
  maxSentences: z.number().int().min(1).max(10).default(3)
});

/**
 * Контракт результата суммаризации статьи.
 */
export const articleSummaryResultSchema = z.object({
  summary: z.string().trim().min(1)
});

export type ArticleSummaryInput = z.infer<typeof articleSummaryInputSchema>;
export type ArticleSummaryResult = z.infer<typeof articleSummaryResultSchema>;
