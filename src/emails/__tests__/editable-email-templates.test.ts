import { describe, expect, it } from 'vitest';

import { locales } from '@/i18n/config';
import {
  EMAIL_TEMPLATE_DEFINITIONS,
  getDefaultEmailTemplateContent
} from '@/modules/email-templates/email-template-registry';
import { renderEmailTemplateDocument } from '@/modules/email-templates/email-template-renderer.server';
import {
  getEmailTemplatePreviewTokenValues,
  renderEmailTemplateContent
} from '@/modules/email-templates/email-template-token-service';
import { getEmailTemplateContentSchema } from '@/modules/email-templates/schemas';

describe('универсальный рендерер email-шаблонов', () => {
  it('рендерит изменённый HTML внутри общей оболочки', () => {
    const source = getDefaultEmailTemplateContent('WELCOME_GOOGLE', 'ru');
    const content = renderEmailTemplateContent(
      'WELCOME_GOOGLE',
      { ...source, html: '<h1>Рады видеть вас, {name}</h1>' },
      { name: 'Анна', dashboardUrl: 'https://vershkov.com/my' }
    );
    const rendered = renderEmailTemplateDocument(content, 'ru');

    expect(rendered.html).toContain('Рады видеть вас, Анна');
    expect(rendered.html).toContain('Vershkov');
  });

  it('отклоняет опасную разметку из пользовательского HTML', () => {
    const source = getDefaultEmailTemplateContent('WELCOME_GOOGLE', 'ru');
    const content = renderEmailTemplateContent(
      'WELCOME_GOOGLE',
      { ...source, html: '<h1>Привет</h1><script>alert(1)</script>' },
      { name: 'Анна', dashboardUrl: 'https://vershkov.com/my' }
    );
    expect(() => renderEmailTemplateDocument(content, 'ru')).toThrow('запрещённый тег');
  });

  it('не растягивает текстовые информационные блоки за границы содержимого', () => {
    const source = getDefaultEmailTemplateContent('ADMIN_MESSAGE', 'ru');
    const content = renderEmailTemplateContent('ADMIN_MESSAGE', source, {
      subject: 'Системное уведомление',
      message: 'Текст уведомления'
    });
    const rendered = renderEmailTemplateDocument(content, 'ru');
    const messageTag = rendered.html.match(/<div class="message"[^>]*>/)?.[0];

    expect(messageTag).toBeDefined();
    expect(messageTag).not.toContain('width: 100%');
  });

  it('валидирует и рендерит все шаблоны на всех языках', () => {
    for (const definition of EMAIL_TEMPLATE_DEFINITIONS) {
      for (const locale of locales) {
        const source = getDefaultEmailTemplateContent(definition.key, locale);
        const parsed = getEmailTemplateContentSchema(definition.key).parse(source);
        const content = renderEmailTemplateContent(
          definition.key,
          parsed,
          getEmailTemplatePreviewTokenValues(definition.key)
        );
        const rendered = renderEmailTemplateDocument(content, locale);

        expect(rendered.subject.length).toBeGreaterThan(0);
        expect(rendered.html).toContain('class="email-content"');
      }
    }
  });
});
