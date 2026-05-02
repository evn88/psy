import { createTextGenerationAiSkill } from '../ai-skill-factory';
import { articleSummaryInputSchema, articleSummaryResultSchema } from './article-summary.contract';

/**
 * Формирует системный prompt для суммаризации статьи.
 *
 * @param targetLocale Целевая локаль результата.
 * @returns Системный prompt.
 */
const buildSummarySystemPrompt = (targetLocale?: string) => {
  const localeInstruction = targetLocale
    ? `Write the summary in ${targetLocale}.`
    : 'Write the summary in the source language.';

  return `You are an editorial assistant that creates concise, accurate article summaries.
${localeInstruction}
Return ONLY plain text with no markdown bullets, headings, or commentary outside the summary.`;
};

/**
 * AI-навык для краткой суммаризации статьи.
 */
export const articleSummarySkill = createTextGenerationAiSkill({
  id: 'article-summary',
  inputSchema: articleSummaryInputSchema,
  outputSchema: articleSummaryResultSchema,
  slot: 'summary',
  maxOutputTokens: 500,
  buildSystem: ({ input }) => buildSummarySystemPrompt(input.targetLocale),
  buildPrompt: ({ input }) => {
    return `Summarize the following markdown article into ${input.maxSentences} sentences, preserving the factual meaning and key takeaways:\n\n${input.content}`;
  },
  mapResult: ({ text }) => ({
    summary: text.trim()
  })
});
