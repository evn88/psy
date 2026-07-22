import { getEmailTemplateDefinition } from '@/modules/email-templates/email-template-registry';
import type {
  EditableEmailTemplateKey,
  EmailTemplateDocument,
  EmailTemplateTokenDefinition
} from '@/modules/email-templates/types';

const tokenPattern = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;
const conditionalPattern = /\{\{#if ([a-zA-Z][a-zA-Z0-9]*)\}\}([\s\S]*?)\{\{\/if\}\}/g;
const conditionalOpeningPattern = /\{\{#if ([a-zA-Z][a-zA-Z0-9]*)\}\}/g;
const conditionalDirectivePattern = /\{\{(#if [a-zA-Z][a-zA-Z0-9]*|\/if)\}\}/g;

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const getTokenMap = (
  template: EditableEmailTemplateKey
): Map<string, EmailTemplateTokenDefinition> => {
  return new Map(getEmailTemplateDefinition(template).tokens.map(token => [token.key, token]));
};

/** Возвращает уникальные токены, найденные в тексте и условных блоках. */
export const extractEmailTemplateTokens = (value: string): string[] => {
  return [
    ...new Set([
      ...[...value.matchAll(tokenPattern)].map(match => match[1]),
      ...[...value.matchAll(conditionalOpeningPattern)].map(match => match[1])
    ])
  ];
};

/** Проверяет баланс и запрещает вложенные условные блоки. */
export const assertEmailTemplateConditionalSyntax = (value: string): void => {
  let depth = 0;

  for (const match of value.matchAll(conditionalDirectivePattern)) {
    if (match[1].startsWith('#if ')) {
      depth += 1;
      if (depth > 1) throw new Error('Вложенные условные блоки не поддерживаются');
      continue;
    }

    depth -= 1;
    if (depth < 0) throw new Error('Обнаружен закрывающий {{/if}} без начала блока');
  }

  if (depth !== 0 || value.includes('{{#if ') !== value.includes('{{/if}}')) {
    throw new Error('В шаблоне есть незакрытый условный блок');
  }
};

/** Возвращает токены, которые не зарегистрированы для выбранного шаблона. */
export const getUnknownEmailTemplateTokens = (
  template: EditableEmailTemplateKey,
  content: EmailTemplateDocument
): string[] => {
  const allowedTokens = new Set(
    getEmailTemplateDefinition(template).tokens.map(token => token.key)
  );
  return [
    ...new Set(
      [content.subject, content.html]
        .flatMap(extractEmailTemplateTokens)
        .filter(token => !allowedTokens.has(token))
    )
  ];
};

/** Возвращает HTML-токены, ошибочно использованные в теме письма. */
export const getHtmlTokensUsedInSubject = (
  template: EditableEmailTemplateKey,
  subject: string
): string[] => {
  const tokens = getTokenMap(template);

  return extractEmailTemplateTokens(subject).filter(token => tokens.get(token)?.kind === 'html');
};

/** Возвращает тестовые значения токенов для предпросмотра письма. */
export const getEmailTemplatePreviewTokenValues = (
  template: EditableEmailTemplateKey
): Record<string, string> => {
  return Object.fromEntries(
    getEmailTemplateDefinition(template).tokens.map(token => [token.key, token.example])
  );
};

const renderConditionals = (value: string, tokenValues: Record<string, string>): string => {
  assertEmailTemplateConditionalSyntax(value);
  let rendered = value;
  let previous = '';

  while (previous !== rendered) {
    previous = rendered;
    rendered = rendered.replace(conditionalPattern, (_, token: string, block: string) =>
      tokenValues[token]?.trim() ? block : ''
    );
  }

  if (rendered.includes('{{#if ') || rendered.includes('{{/if}}')) {
    throw new Error('В шаблоне есть незакрытый условный блок');
  }

  return rendered;
};

const getTokenValue = (
  template: EditableEmailTemplateKey,
  definition: EmailTemplateTokenDefinition,
  tokenValues: Record<string, string>
): string => {
  const value = tokenValues[definition.key];
  if (value === undefined && !definition.optional) {
    throw new Error(`Для токена {${definition.key}} не передано значение в ${template}`);
  }
  return value ?? '';
};

const assertSafeUrl = (value: string, token: string): string => {
  if (!value) return '';

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
    return value;
  } catch {
    throw new Error(`Токен {${token}} содержит небезопасный URL`);
  }
};

/** Подставляет токены в тему письма. */
export const renderEmailTemplateSubject = (
  template: EditableEmailTemplateKey,
  subject: string,
  tokenValues: Record<string, string>
): string => {
  const tokens = getTokenMap(template);
  return renderConditionals(subject, tokenValues)
    .replace(tokenPattern, (_, token: string) => {
      const definition = tokens.get(token);
      if (!definition) throw new Error(`Токен {${token}} не зарегистрирован для ${template}`);
      return getTokenValue(template, definition, tokenValues);
    })
    .replace(/[\r\n]+/g, ' ')
    .trim();
};

/** Подставляет токены в HTML, экранируя текст и проверяя URL. */
export const renderEmailTemplateHtml = (
  template: EditableEmailTemplateKey,
  html: string,
  tokenValues: Record<string, string>
): string => {
  const tokens = getTokenMap(template);
  return renderConditionals(html, tokenValues).replace(tokenPattern, (_, token: string) => {
    const definition = tokens.get(token);
    if (!definition) throw new Error(`Токен {${token}} не зарегистрирован для ${template}`);
    const value = getTokenValue(template, definition, tokenValues);

    if (definition.kind === 'url') return escapeHtml(assertSafeUrl(value, token));
    if (definition.kind === 'html') return value;
    return escapeHtml(value);
  });
};

/** Подставляет значения токенов в универсальный документ шаблона. */
export const renderEmailTemplateContent = (
  template: EditableEmailTemplateKey,
  content: EmailTemplateDocument,
  tokenValues: Record<string, string>
): EmailTemplateDocument => ({
  subject: renderEmailTemplateSubject(template, content.subject, tokenValues),
  html: renderEmailTemplateHtml(template, content.html, tokenValues),
  css: content.css
});
