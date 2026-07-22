'use server';

import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { z } from 'zod';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { renderEmailTemplatePreview } from '@/modules/email-templates/email-template-preview.server';
import { renderEmailTemplateDocument } from '@/modules/email-templates/email-template-renderer.server';
import { saveEmailTemplateContent } from '@/modules/email-templates/email-template-service.server';
import {
  getEmailTemplatePreviewTokenValues,
  renderEmailTemplateContent
} from '@/modules/email-templates/email-template-token-service';
import {
  emailTemplateEditorInputSchema,
  parseEmailTemplateContent
} from '@/modules/email-templates/schemas';
import type { EmailTemplateDocument } from '@/modules/email-templates/types';

export type EmailTemplateActionResult =
  | {
      success: true;
      content?: EmailTemplateDocument;
      html?: string;
      recipientId?: string;
    }
  | {
      success: false;
      reason:
        | 'FORBIDDEN'
        | 'INVALID'
        | 'PREVIEW_FAILED'
        | 'SAVE_FAILED'
        | 'ADMIN_NOT_FOUND'
        | 'TEST_SEND_FAILED';
    };

const requireAdmin = async (): Promise<boolean> => {
  const session = await auth();
  return session?.user?.role === 'ADMIN';
};

const testEmailInputSchema = emailTemplateEditorInputSchema.extend({
  recipientId: z.string().min(1)
});

/**
 * Сохраняет HTML-документ одного шаблона для выбранной локали.
 */
export async function saveEmailTemplateOverrideAction(
  input: unknown
): Promise<EmailTemplateActionResult> {
  if (!(await requireAdmin())) {
    return { success: false, reason: 'FORBIDDEN' };
  }

  const parsedInput = emailTemplateEditorInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { success: false, reason: 'INVALID' };
  }

  try {
    const content = parseEmailTemplateContent(parsedInput.data.template, parsedInput.data.content);

    await saveEmailTemplateContent(parsedInput.data.template, parsedInput.data.locale, content);
    revalidatePath('/[locale]/admin/email-templates', 'page');

    return { success: true, content };
  } catch {
    return { success: false, reason: 'SAVE_FAILED' };
  }
}

/**
 * Рендерит HTML-предпросмотр с тестовыми данными, не отправляя письмо.
 */
export async function previewEmailTemplateAction(
  input: unknown
): Promise<EmailTemplateActionResult> {
  if (!(await requireAdmin())) {
    return { success: false, reason: 'FORBIDDEN' };
  }

  const parsedInput = emailTemplateEditorInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { success: false, reason: 'INVALID' };
  }

  try {
    const content = parseEmailTemplateContent(parsedInput.data.template, parsedInput.data.content);
    const html = renderEmailTemplatePreview(
      parsedInput.data.template,
      parsedInput.data.locale,
      content
    );

    return { success: true, html };
  } catch {
    return { success: false, reason: 'PREVIEW_FAILED' };
  }
}

/**
 * Отправляет текущий вариант шаблона выбранному активному администратору.
 */
export async function sendTestEmailTemplateAction(
  input: unknown
): Promise<EmailTemplateActionResult> {
  if (!(await requireAdmin())) {
    return { success: false, reason: 'FORBIDDEN' };
  }

  const parsedInput = testEmailInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { success: false, reason: 'INVALID' };
  }

  try {
    const recipient = await prisma.user.findFirst({
      where: {
        id: parsedInput.data.recipientId,
        role: 'ADMIN',
        isDisabled: false
      },
      select: { id: true, email: true }
    });

    if (!recipient) {
      return { success: false, reason: 'ADMIN_NOT_FOUND' };
    }

    const content = parseEmailTemplateContent(parsedInput.data.template, parsedInput.data.content);
    const resolved = renderEmailTemplateContent(
      parsedInput.data.template,
      content,
      getEmailTemplatePreviewTokenValues(parsedInput.data.template)
    );
    const rendered = renderEmailTemplateDocument(resolved, parsedInput.data.locale);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: 'Vershkov.com <noreply@vershkov.com>',
      to: [recipient.email],
      subject: `[Тест] ${rendered.subject}`,
      html: rendered.html
    });

    if (error) {
      return { success: false, reason: 'TEST_SEND_FAILED' };
    }

    return { success: true, recipientId: recipient.id };
  } catch {
    return { success: false, reason: 'TEST_SEND_FAILED' };
  }
}
