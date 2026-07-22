import { describe, expect, it } from 'vitest';

import { getDefaultEmailTemplateContent } from '@/modules/email-templates/email-template-registry';
import { getEmailTemplateContentSchema } from '@/modules/email-templates/schemas';

describe('схемы HTML-редактора email-шаблонов', () => {
  it('принимают полный HTML-документ приветственного письма', () => {
    const content = getDefaultEmailTemplateContent('WELCOME_GOOGLE', 'ru');

    expect(getEmailTemplateContentSchema('WELCOME_GOOGLE').safeParse(content).success).toBe(true);
  });

  it('отклоняют незарегистрированный токен', () => {
    const content = getDefaultEmailTemplateContent('WELCOME_GOOGLE', 'ru');

    expect(
      getEmailTemplateContentSchema('WELCOME_GOOGLE').safeParse({
        ...content,
        html: `${content.html}<p>{unknownToken}</p>`
      }).success
    ).toBe(false);
  });

  it('отклоняют CSS вне области содержимого письма', () => {
    const content = getDefaultEmailTemplateContent('WELCOME_GOOGLE', 'ru');

    expect(
      getEmailTemplateContentSchema('WELCOME_GOOGLE').safeParse({
        ...content,
        css: 'body { display: none; }'
      }).success
    ).toBe(false);
  });

  it('отклоняют HTML-токен в теме письма', () => {
    const content = getDefaultEmailTemplateContent('FINANCIAL_NOTIFICATION', 'ru');

    expect(
      getEmailTemplateContentSchema('FINANCIAL_NOTIFICATION').safeParse({
        ...content,
        subject: 'Операция {detailsHtml}'
      }).success
    ).toBe(false);
  });
});
