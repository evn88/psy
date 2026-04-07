import { createAiSkill } from '../ai-skill-factory';
import {
  textTranslationInputSchema,
  textTranslationResultSchema
} from './text-translation.contract';

const TEXT_TRANSLATION_LOCALE_LABELS: Record<string, string> = {
  ru: 'Russian',
  en: 'English',
  sr: 'Serbian',
  hr: 'Croatian',
  bs: 'Bosnian',
  uk: 'Ukrainian',
  bg: 'Bulgarian',
  mk: 'Macedonian',
  be: 'Belarusian',
  kk: 'Kazakh',
  ky: 'Kyrgyz',
  uz: 'Uzbek',
  mn: 'Mongolian'
};

/**
 * Возвращает человекочитаемое название локали для prompt’а.
 *
 * @param locale Код локали.
 * @returns Название языка для инструкций модели.
 */
const getTextTranslationLocaleLabel = (locale: string) => {
  return TEXT_TRANSLATION_LOCALE_LABELS[locale] ?? locale;
};

/**
 * Формирует системный prompt для общего перевода текста.
 *
 * @param sourceLocale Исходная локаль.
 * @param targetLocale Целевая локаль.
 * @returns Системный prompt для перевода.
 */
const buildTextTranslationSystemPrompt = (sourceLocale: string, targetLocale: string) => {
  return `You are a professional translator.
Translate the provided text from ${getTextTranslationLocaleLabel(sourceLocale)} to ${getTextTranslationLocaleLabel(targetLocale)}.
CRITICAL REQUIREMENTS:
1. Preserve the original formatting exactly. Keep the same paragraph structure, line breaks, list markers, numbering, headings, emphasis markers, punctuation layout, and any other formatting signals from the source text.
2. If the target language can be written in both Cyrillic and Latin, you MUST use Latin script only.
3. Do not invent words that do not exist naturally in the target language. If there is no direct equivalent, use a natural synonym, paraphrase, or another established wording that preserves the meaning of the original material.
4. Preserve the meaning, tone, and intent of the original material.
5. Output ONLY the translated text with no explanations, notes, or preamble.`;
};

/**
 * AI-навык для общего перевода текста на несколько целевых языков.
 */
export const textTranslationSkill = createAiSkill({
  id: 'text-translation',
  inputSchema: textTranslationInputSchema,
  outputSchema: textTranslationResultSchema,
  execute: async ({ input, generateText }) => {
    const normalizedSourceLocale = input.sourceLocale.toLowerCase();
    const translations = await Promise.all(
      input.targetLocales.map(async targetLocale => {
        if (targetLocale.toLowerCase() === normalizedSourceLocale) {
          return {
            locale: targetLocale,
            text: input.text
          };
        }

        const translatedText = await generateText({
          slot: 'translation',
          system: buildTextTranslationSystemPrompt(input.sourceLocale, targetLocale),
          prompt: input.text
        });

        return {
          locale: targetLocale,
          text: translatedText
        };
      })
    );

    return {
      sourceLocale: input.sourceLocale,
      translations
    };
  }
});
