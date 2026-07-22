import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

import { auth } from '@/auth';
import { defaultLocale, isLocale } from '@/i18n/config';
import prisma from '@/lib/prisma';
import { EMAIL_TEMPLATE_DEFINITIONS } from '@/modules/email-templates/email-template-registry';
import { getEmailTemplateEditorValues } from '@/modules/email-templates/email-template-service.server';
import type { EmailTemplateAdminRecipient } from '@/modules/email-templates/types';

import { EmailTemplatesEditor } from './_components/email-templates-editor';

/**
 * Отображает универсальный HTML/CSS-редактор доступных email-шаблонов.
 */
const EmailTemplatesPage = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/my');
  }

  const locale = await getLocale();
  const [initialValues, adminRecipients] = await Promise.all([
    getEmailTemplateEditorValues(),
    prisma.user.findMany({
      where: { role: 'ADMIN', isDisabled: false },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }]
    })
  ]);

  return (
    <EmailTemplatesEditor
      definitions={EMAIL_TEMPLATE_DEFINITIONS}
      initialLocale={isLocale(locale) ? locale : defaultLocale}
      initialValues={initialValues}
      adminRecipients={adminRecipients}
      initialAdminRecipientId={
        adminRecipients.some((admin: EmailTemplateAdminRecipient) => admin.id === session.user.id)
          ? session.user.id
          : adminRecipients[0]?.id
      }
    />
  );
};

export default EmailTemplatesPage;
