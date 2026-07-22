import path from 'node:path';
import dotenv from 'dotenv';
import { Resend } from 'resend';

import {
  EMAIL_TEMPLATE_DEFINITIONS,
  getDefaultEmailTemplateContent
} from '@/modules/email-templates/email-template-registry';
import { renderEmailTemplateDocument } from '@/modules/email-templates/email-template-renderer.server';
import {
  getEmailTemplatePreviewTokenValues,
  renderEmailTemplateContent
} from '@/modules/email-templates/email-template-token-service';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const from = 'Vershkov.com <noreply@vershkov.com>';
const recipient = process.env.EMAIL_PREVIEW_TO ?? process.env.ADMIN_EMAIL;

interface PreviewEmail {
  name: string;
  subject: string;
  html: string;
}

/** Формирует контрольный набор всех production-шаблонов с тестовыми токенами. */
const createPreviewEmails = (): PreviewEmail[] => {
  return EMAIL_TEMPLATE_DEFINITIONS.map(definition => {
    const source = getDefaultEmailTemplateContent(definition.key, 'ru');
    const resolved = renderEmailTemplateContent(
      definition.key,
      source,
      getEmailTemplatePreviewTokenValues(definition.key)
    );
    const rendered = renderEmailTemplateDocument(resolved, 'ru');

    return {
      name: definition.key.toLowerCase(),
      subject: `[Preview] ${definition.key}: ${rendered.subject}`,
      html: rendered.html
    };
  });
};

const main = async (): Promise<void> => {
  const previews = createPreviewEmails();
  const isDryRun = process.argv.includes('--dry-run');

  if (isDryRun) {
    console.info(`Успешно отрендерено шаблонов: ${previews.length}.`);
    return;
  }

  if (!process.env.RESEND_API_KEY) throw new Error('Не задан RESEND_API_KEY.');
  if (!recipient) throw new Error('Не задан EMAIL_PREVIEW_TO или ADMIN_EMAIL.');

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.batch.send(
    previews.map(preview => ({
      from,
      to: [recipient],
      subject: preview.subject,
      html: preview.html
    }))
  );

  if (error) throw new Error(`Resend отклонил отправку: ${error.message}`);

  console.info(`В очередь Resend отправлено шаблонов: ${previews.length}.`);
  console.info(JSON.stringify(data));
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
