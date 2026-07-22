import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findFirst: vi.fn(),
  preview: vi.fn(),
  renderDocument: vi.fn(),
  resendSend: vi.fn(),
  revalidatePath: vi.fn(),
  save: vi.fn()
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/prisma', () => ({
  default: { user: { findFirst: mocks.findFirst } }
}));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.resendSend };
  }
}));
vi.mock('@/modules/email-templates/email-template-preview.server', () => ({
  renderEmailTemplatePreview: mocks.preview
}));
vi.mock('@/modules/email-templates/email-template-renderer.server', () => ({
  assertSafeEmailTemplateHtml: vi.fn(),
  renderEmailTemplateDocument: mocks.renderDocument,
  sanitizeEmailTemplateCss: (value: string) => value
}));
vi.mock('@/modules/email-templates/email-template-service.server', () => ({
  saveEmailTemplateContent: mocks.save
}));

import { sendTestEmailTemplateAction } from './actions';

const validInput = {
  template: 'WELCOME_GOOGLE',
  locale: 'ru',
  recipientId: 'admin-2',
  content: {
    subject: 'Добро пожаловать',
    html: '<h1>Здравствуйте, {name}</h1>',
    css: ''
  }
} as const;

describe('тестовая отправка email-шаблона', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mocks.findFirst.mockResolvedValue({ id: 'admin-2', email: 'admin@example.com' });
    mocks.renderDocument.mockReturnValue({ subject: 'Добро пожаловать', html: '<p>Письмо</p>' });
    mocks.resendSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  });

  it('запрещает отправку пользователю без роли администратора', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } });

    const result = await sendTestEmailTemplateAction(validInput);

    expect(result).toEqual({ success: false, reason: 'FORBIDDEN' });
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.resendSend).not.toHaveBeenCalled();
  });

  it('не отправляет письмо отсутствующему или отключённому администратору', async () => {
    mocks.findFirst.mockResolvedValue(null);

    const result = await sendTestEmailTemplateAction(validInput);

    expect(result).toEqual({ success: false, reason: 'ADMIN_NOT_FOUND' });
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: 'admin-2', role: 'ADMIN', isDisabled: false },
      select: { id: true, email: true }
    });
    expect(mocks.resendSend).not.toHaveBeenCalled();
  });

  it('отправляет текущую версию шаблона выбранному администратору', async () => {
    const result = await sendTestEmailTemplateAction(validInput);

    expect(result).toEqual({ success: true, recipientId: 'admin-2' });
    expect(mocks.resendSend).toHaveBeenCalledWith({
      from: 'Vershkov.com <noreply@vershkov.com>',
      to: ['admin@example.com'],
      subject: '[Тест] Добро пожаловать',
      html: '<p>Письмо</p>'
    });
  });
});
