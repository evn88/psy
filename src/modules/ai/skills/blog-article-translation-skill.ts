import { createAiSkill } from '../ai-skill-factory';
import {
  blogArticleTranslationInputSchema,
  blogArticleTranslationResultSchema
} from './blog-article-translation.contract';

const ARTICLE_LOCALE_LABELS: Record<string, string> = {
  ru: 'Russian',
  en: 'English',
  sr: 'Serbian (Latin script)'
};

/**
 * Возвращает человекочитаемое имя локали для prompt’ов.
 *
 * @param locale Код локали.
 * @returns Название языка для prompt’а.
 */
const getArticleLocaleLabel = (locale: string) => {
  return ARTICLE_LOCALE_LABELS[locale] ?? locale;
};

/**
 * Формирует системный prompt для перевода markdown-контента статьи.
 *
 * @param sourceLocale Исходная локаль.
 * @param targetLocale Целевая локаль.
 * @returns Системный prompt для markdown-перевода.
 */
const buildMarkdownTranslationSystemPrompt = (sourceLocale: string, targetLocale: string) => {
  let prompt = `You are a professional translator specializing in psychology and therapy content.
Translate the following Markdown text from ${getArticleLocaleLabel(sourceLocale)} to ${getArticleLocaleLabel(targetLocale)}.
CRITICAL REQUIREMENTS:
1. You MUST NOT change the Markdown formatting in any way. The translated text must have exactly the same structure, line breaks, headings, bold/italic markers, links, and image alignments as the original.
2. Do not translate technical terms that are better kept in their original form (e.g. ACT, RO DBT, ADHD, ASD, Schema Therapy).
3. Output ONLY the exact translated Markdown. No explanations, no preamble.`;

  if (targetLocale === 'sr') {
    prompt += `
You are translating into standard Serbian used in Serbia.
Use ekavica, latinica, avoid Croatian and Bosnian regionalisms, and preserve the tone of the original text.
If a direct equivalent sounds unnatural, prefer a native Serbian paraphrase that keeps the original meaning.`;
  }

  return prompt;
};

/**
 * Формирует системный prompt для коротких plain-text полей статьи.
 *
 * @param sourceLocale Исходная локаль.
 * @param targetLocale Целевая локаль.
 * @returns Системный prompt для plain-text перевода.
 */
const buildPlainTextTranslationSystemPrompt = (sourceLocale: string, targetLocale: string) => {
  return `${buildMarkdownTranslationSystemPrompt(sourceLocale, targetLocale)}
Output ONLY plain text. Do not use markdown characters such as #, *, _, \`, [, ], (, or ).`;
};

/**
 * Нормализует plain-text результат генерации.
 *
 * @param text Исходный ответ модели.
 * @returns Очищенный plain-text.
 */
const cleanGeneratedPlainText = (text: string) => {
  return text
    .replace(/^["']|["']$/g, '')
    .replace(/[#*`_~]/g, '')
    .trim();
};

/**
 * AI-навык для перевода статьи по отдельным prompt-slot’ам.
 */
export const blogArticleTranslationSkill = createAiSkill({
  id: 'blog-article-translation',
  inputSchema: blogArticleTranslationInputSchema,
  outputSchema: blogArticleTranslationResultSchema,
  execute: async ({ input, generateText }) => {
    const plainTextSystemPrompt = buildPlainTextTranslationSystemPrompt(
      input.sourceLocale,
      input.targetLocale
    );
    const markdownSystemPrompt = buildMarkdownTranslationSystemPrompt(
      input.sourceLocale,
      input.targetLocale
    );

    const titlePromise = generateText({
      slot: 'title',
      system: plainTextSystemPrompt,
      prompt: `Translate this article title from ${getArticleLocaleLabel(input.sourceLocale)} to ${getArticleLocaleLabel(input.targetLocale)}:\n${input.title}`,
      maxOutputTokens: 400
    });

    const descriptionPromise =
      input.description.trim().length > 0
        ? generateText({
            slot: 'description',
            system: plainTextSystemPrompt,
            prompt: `Translate this article description from ${getArticleLocaleLabel(input.sourceLocale)} to ${getArticleLocaleLabel(input.targetLocale)}:\n${input.description}`,
            maxOutputTokens: 600
          })
        : Promise.resolve('');

    const contentPromise = generateText({
      slot: 'content',
      system: markdownSystemPrompt,
      prompt: input.content
    });

    const [title, description, content] = await Promise.all([
      titlePromise,
      descriptionPromise,
      contentPromise
    ]);

    return {
      targetLocale: input.targetLocale,
      title: cleanGeneratedPlainText(title),
      description: cleanGeneratedPlainText(description),
      content: content.trim()
    };
  }
});
