import 'server-only';

import type { AppLocale } from '@/i18n/config';
import { renderEmailTemplateDocument } from '@/modules/email-templates/email-template-renderer.server';
import {
  getEmailTemplatePreviewTokenValues,
  renderEmailTemplateContent
} from '@/modules/email-templates/email-template-token-service';
import type {
  EditableEmailTemplateKey,
  EmailTemplateDocument
} from '@/modules/email-templates/types';

/** Рендерит HTML-предпросмотр универсального шаблона с демонстрационными токенами. */
export const renderEmailTemplatePreview = (
  template: EditableEmailTemplateKey,
  locale: AppLocale,
  content: EmailTemplateDocument
): string => {
  const resolved = renderEmailTemplateContent(
    template,
    content,
    getEmailTemplatePreviewTokenValues(template)
  );

  return renderEmailTemplateDocument(resolved, locale).html;
};
