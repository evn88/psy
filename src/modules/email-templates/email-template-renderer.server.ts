import juice from 'juice';
import postcss from 'postcss';
import sanitizeHtml from 'sanitize-html';

import type { AppLocale } from '@/i18n/config';
import type { EmailTemplateDocument } from '@/modules/email-templates/types';

const commonCss = `
body { background: #f6f3f8; color: #504a59; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 36px 12px; }
.email-container { background: #fefcff; border: 1px solid #e4deea; border-radius: 16px; margin: 0 auto; max-width: 560px; overflow: hidden; }
.email-header { background: #eee8f7; color: #5d447d; font-size: 16px; font-weight: 700; letter-spacing: .08em; padding: 19px 32px; text-align: center; text-transform: uppercase; }
.email-content { padding: 32px; }
.email-content h1 { color: #302b37; font-size: 25px; line-height: 32px; margin: 0 0 20px; }
.email-content h2 { color: #302b37; font-size: 20px; line-height: 28px; margin: 24px 0 12px; }
.email-content p, .email-content li { color: #504a59; font-size: 15px; line-height: 24px; }
.email-content p { margin: 0 0 14px; }
.email-content a { color: #5d447d; }
.email-content .button { background: #684895; border-radius: 10px; color: #fefcff; display: inline-block; font-weight: 700; margin: 12px 0 8px; padding: 13px 22px; text-decoration: none; }
.email-content .details, .email-content .message { background: #f7f4fa; border: 1px solid #e3ddea; border-radius: 12px; margin: 22px 0; padding: 14px 18px; width: 100%; }
.email-content .details th { color: #5d447d; font-size: 14px; padding: 4px 12px 4px 0; text-align: left; vertical-align: top; }
.email-content .details td { color: #504a59; font-size: 14px; padding: 4px 0; }
.email-content .notice { background: #f1edf8; border: 1px solid #ded5eb; border-radius: 10px; margin: 18px 0; padding: 12px 16px; }
.email-content .notice-danger { background: #fff4f2; border-color: #eccdca; color: #8d4039; }
.email-content .muted, .email-content .meta, .email-content .eyebrow { color: #74647f; font-size: 13px; line-height: 20px; }
.email-content .cover { border-radius: 12px; display: block; height: auto; margin: 0 0 22px; max-width: 100%; width: 100%; }
.email-footer { border-top: 1px solid #e5dfe9; color: #78717f; font-size: 12px; line-height: 19px; padding: 18px 32px 22px; text-align: center; }
`;

const footerCopy: Record<AppLocale, string> = {
  ru: 'Это автоматическое сообщение Vershkov. Пожалуйста, не отвечайте на него.',
  en: 'This is an automated message from Vershkov. Please do not reply.',
  sr: 'Ovo je automatska poruka servisa Vershkov. Molimo ne odgovarajte na nju.'
};

const allowedStyles: sanitizeHtml.IOptions['allowedStyles'] = {
  '*': {
    color: [/^#[0-9a-f]{3,8}$/i, /^rgb(a)?\([^)]+\)$/i],
    'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgb(a)?\([^)]+\)$/i],
    'font-size': [/^\d+(\.\d+)?(px|rem|em|%)$/],
    'font-weight': [/^(normal|bold|[1-9]00)$/],
    'font-style': [/^(normal|italic)$/],
    'line-height': [/^\d+(\.\d+)?(px|rem|em|%)?$/],
    'text-align': [/^(left|center|right)$/],
    'text-decoration': [/^(none|underline)$/],
    display: [/^(block|inline|inline-block|table|table-row|table-cell)$/],
    width: [/^(auto|\d+(\.\d+)?(px|%))$/],
    'max-width': [/^(none|\d+(\.\d+)?(px|%))$/],
    height: [/^(auto|\d+(\.\d+)?px)$/],
    margin: [/^[\d.\s%-]+$/],
    padding: [/^[\d.\s%-]+$/],
    border: [/^[#\w\d.\s()-]+$/],
    'border-color': [/^#[0-9a-f]{3,8}$/i],
    'border-radius': [/^\d+(\.\d+)?px$/],
    'border-top': [/^[#\w\d.\s()-]+$/],
    'border-collapse': [/^collapse$/],
    'vertical-align': [/^(top|middle|bottom)$/],
    'white-space': [/^(normal|pre-wrap)$/]
  }
};

/** Проверяет CSS и разрешает ему влиять только на содержимое письма. */
export const sanitizeEmailTemplateCss = (css: string): string => {
  if (!css.trim()) return '';
  if (/url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|-moz-binding/i.test(css)) {
    throw new Error('CSS содержит запрещённую конструкцию');
  }

  const root = postcss.parse(css);
  root.walkAtRules(rule => {
    if (rule.name.toLowerCase() !== 'media') {
      throw new Error(`CSS-правило @${rule.name} не поддерживается`);
    }
  });
  root.walkRules(rule => {
    const selectors = rule.selectors ?? [];
    if (selectors.some(selector => !selector.trim().startsWith('.email-content'))) {
      throw new Error('Каждый CSS-селектор должен начинаться с .email-content');
    }
  });

  return root.toString();
};

const sanitizeContentHtml = (html: string): string => {
  return sanitizeHtml(html, {
    allowedTags: [
      'h1',
      'h2',
      'h3',
      'p',
      'a',
      'strong',
      'b',
      'em',
      'i',
      'ul',
      'ol',
      'li',
      'blockquote',
      'div',
      'span',
      'br',
      'hr',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'img'
    ],
    allowedAttributes: {
      '*': ['class', 'style', 'align'],
      a: ['href', 'target', 'rel', 'class', 'style'],
      img: ['src', 'alt', 'width', 'height', 'class', 'style'],
      table: ['role', 'width', 'cellpadding', 'cellspacing', 'class', 'style'],
      td: ['colspan', 'rowspan', 'class', 'style', 'align'],
      th: ['colspan', 'rowspan', 'class', 'style', 'align']
    },
    allowedSchemes: ['http', 'https'],
    allowedStyles,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true)
    }
  });
};

/** Отклоняет активный и структурно опасный HTML до санитизации. */
export const assertSafeEmailTemplateHtml = (html: string): void => {
  if (
    /<\s*\/?\s*(script|iframe|object|embed|form|input|button|style|link|meta|base|svg|math|video|audio)\b/i.test(
      html
    )
  ) {
    throw new Error('HTML содержит запрещённый тег');
  }

  if (/\son[a-z]+\s*=|javascript:|data:text\/html/i.test(html)) {
    throw new Error('HTML содержит небезопасный атрибут или URL');
  }
};

const escapePreview = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Собирает готовый HTML email с общей системной шапкой и футером. */
export const renderEmailTemplateDocument = (
  content: EmailTemplateDocument,
  locale: AppLocale
): { subject: string; html: string } => {
  const customCss = sanitizeEmailTemplateCss(content.css);
  assertSafeEmailTemplateHtml(content.html);
  const safeContent = sanitizeContentHtml(content.html);
  const source = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${commonCss}\n${customCss}</style></head>
<body><div style="display:none;max-height:0;overflow:hidden">${escapePreview(content.subject)}</div>
<div class="email-container"><div class="email-header">Vershkov</div><main class="email-content">${safeContent}</main><footer class="email-footer">${footerCopy[locale]}</footer></div></body></html>`;

  return {
    subject: content.subject,
    html: juice(source, { preserveMediaQueries: true, removeStyleTags: false })
  };
};
