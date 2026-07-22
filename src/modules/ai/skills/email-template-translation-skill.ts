import { createAiSkill } from '../ai-skill-factory';
import { parseEmailTemplateContent } from '@/modules/email-templates/schemas';
import {
  emailTemplateTranslationInputSchema,
  emailTemplateTranslationResultSchema
} from './email-template-translation.contract';

const localeLabels = {
  en: 'English',
  sr: 'standard Serbian used in Serbia, ekavica and Latin script'
} as const;

const getTokenSignature = (value: string): string => {
  const tokens = [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map(match => match[1]);
  const conditionals = [...value.matchAll(/\{\{#if ([a-zA-Z][a-zA-Z0-9]*)\}\}/g)].map(
    match => `#if:${match[1]}`
  );

  return [...tokens, ...conditionals].sort().join('|');
};

const assertTokensPreserved = (source: string, translated: string): void => {
  if (getTokenSignature(source) !== getTokenSignature(translated)) {
    throw new Error('AI-перевод изменил набор токенов шаблона');
  }
};

const getHtmlStructureSignature = (html: string): string => {
  return [...html.matchAll(/<(\/)?([a-z][a-z0-9-]*)([^>]*)>/gi)]
    .map(match => {
      const attributes = [
        ...match[3].matchAll(/([a-z][a-z0-9-]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s>]+))?/gi)
      ]
        .map(attribute => {
          const name = attribute[1].toLowerCase();
          const value = attribute[2] ?? '';
          return ['class', 'href', 'src'].includes(name) ? `${name}=${value}` : name;
        })
        .sort()
        .join(',');
      return `${match[1] ? '/' : ''}${match[2].toLowerCase()}[${attributes}]`;
    })
    .join('|');
};

const assertHtmlStructurePreserved = (source: string, translated: string): void => {
  if (getHtmlStructureSignature(source) !== getHtmlStructureSignature(translated)) {
    throw new Error('AI-перевод изменил структуру HTML');
  }
};

/** AI-навык для массового перевода полей email-шаблона с сохранением токенов. */
export const emailTemplateTranslationSkill = createAiSkill({
  id: 'email-template-translation',
  inputSchema: emailTemplateTranslationInputSchema,
  outputSchema: emailTemplateTranslationResultSchema,
  execute: async ({ input, generateText }) => {
    const sourceContent = parseEmailTemplateContent(input.template, input.content);
    const translations = await Promise.all(
      input.targetLocales.map(async locale => {
        const entries = await Promise.all(
          Object.entries(sourceContent).map(async ([field, value]) => {
            if (field === 'css') {
              return [field, value] as const;
            }

            const htmlInstructions =
              field === 'html'
                ? `Preserve the HTML structure exactly. Do not add, remove, rename, or reorder tags and attributes.
Translate only human-readable text nodes and attribute values intended for people, such as alt text.`
                : 'Translate the plain-text email subject.';
            const translated = (
              await generateText({
                slot: 'translation',
                system: `You are a professional translator for transactional emails.
Translate the source text from Russian to ${localeLabels[locale]}.
Preserve every token in curly braces, for example {name} or {title}, exactly as written.
Do not add, remove, rename, decline, or translate tokens.
Preserve line breaks and punctuation structure.
Keep the tone calm, clear, respectful, and natural.
${htmlInstructions}
Output only the translated text without quotes, notes, or markdown.`,
                prompt: value,
                maxOutputTokens: 1_000
              })
            ).trim();

            assertTokensPreserved(value, translated);
            if (field === 'html') assertHtmlStructurePreserved(value, translated);
            return [field, translated] as const;
          })
        );
        const content = parseEmailTemplateContent(input.template, Object.fromEntries(entries));

        return { locale, content };
      })
    );

    return { translations };
  }
});
