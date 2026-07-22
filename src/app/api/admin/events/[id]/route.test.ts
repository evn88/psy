import { EventBillingSource, EventStatus, EventType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  event: {
    findUnique: vi.fn(),
    findMany: vi.fn()
  },
  user: {
    findFirst: vi.fn()
  }
}));
const transactionMock = vi.hoisted(() => ({
  event: {
    update: vi.fn()
  }
}));
const runFinancialTransactionMock = vi.hoisted(() => vi.fn());
const chargeConsultationMock = vi.hoisted(() => vi.fn());
const reverseConsultationMock = vi.hoisted(() => vi.fn());
const sendEventCancellationEmailMock = vi.hoisted(() => vi.fn());
const sendEventNotificationEmailMock = vi.hoisted(() => vi.fn());
const syncEventWithGoogleMock = vi.hoisted(() => vi.fn());
const startSessionReminderWorkflowMock = vi.hoisted(() => vi.fn());

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/lib/email', () => ({
  sendEventCancellationEmail: sendEventCancellationEmailMock,
  sendEventNotificationEmail: sendEventNotificationEmailMock
}));
vi.mock('@/lib/google-sync', () => ({ syncEventWithGoogle: syncEventWithGoogleMock }));
vi.mock('@/lib/event-utils', () => ({
  doesDateRangeOverlap: vi.fn(() => false),
  isValidDateRange: vi.fn(() => true)
}));
vi.mock('@/lib/financial-email-workflow', () => ({
  startFinancialEmailOutboxWorkflow: vi.fn()
}));
vi.mock('@/lib/session-reminders', () => ({
  MAX_SESSION_REMINDER_MINUTES: 1440,
  MIN_SESSION_REMINDER_MINUTES: 0
}));
vi.mock('@/lib/session-reminder-workflow', () => ({
  startSessionReminderWorkflow: startSessionReminderWorkflowMock
}));
vi.mock('@/modules/system-logs/with-api-logging.server', () => ({
  withApiLogging: <T extends (...args: never[]) => unknown>(handler: T): T => handler
}));
vi.mock('@/modules/payments/financial/financial-service.server', () => ({
  chargeConsultationInTransaction: chargeConsultationMock,
  reverseConsultationInTransaction: reverseConsultationMock,
  runFinancialTransaction: runFinancialTransactionMock
}));

import { PATCH } from './route';

const createPaidEvent = () => ({
  id: 'event-1',
  start: new Date('2026-07-20T10:00:00.000Z'),
  end: new Date('2026-07-20T11:00:00.000Z'),
  status: EventStatus.SCHEDULED,
  type: EventType.CONSULTATION,
  title: 'Консультация',
  meetLink: null,
  userId: 'user-1',
  reminderMinutesBeforeStart: 60,
  user: {
    id: 'user-1',
    name: 'Клиент',
    email: 'client@example.com',
    language: 'ru',
    timezone: 'Europe/Belgrade'
  },
  billingAllocation: {
    id: 'allocation-1',
    purchasedPackageId: null,
    source: EventBillingSource.WALLET,
    status: 'RESERVED'
  }
});

describe('PATCH /api/admin/events/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    prismaMock.event.findMany.mockResolvedValue([]);
    prismaMock.user.findFirst.mockResolvedValue({ id: 'user-1' });
    runFinancialTransactionMock.mockImplementation(
      async (callback: (transaction: typeof transactionMock) => Promise<unknown>) =>
        callback(transactionMock)
    );
    syncEventWithGoogleMock.mockResolvedValue({ success: true });
    startSessionReminderWorkflowMock.mockResolvedValue(undefined);
  });

  it('разрешает администратору перенести оплаченную встречу без повторного списания', async () => {
    // Arrange
    const event = createPaidEvent();
    const nextStart = new Date('2026-07-21T12:00:00.000Z');
    const nextEnd = new Date('2026-07-21T13:00:00.000Z');
    const updatedEvent = { ...event, start: nextStart, end: nextEnd };
    prismaMock.event.findUnique.mockResolvedValue(event);
    transactionMock.event.update.mockResolvedValue(updatedEvent);

    // Act
    const response = await PATCH(
      new Request('http://localhost/api/admin/events/event-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: nextStart.toISOString(),
          end: nextEnd.toISOString()
        })
      }),
      { params: Promise.resolve({ id: 'event-1' }) }
    );

    // Assert
    expect(response.status).toBe(200);
    expect(transactionMock.event.update).toHaveBeenCalled();
    expect(reverseConsultationMock).not.toHaveBeenCalled();
    expect(chargeConsultationMock).not.toHaveBeenCalled();
  });

  it('не разрешает менять длительность оплаченной встречи без возврата', async () => {
    // Arrange
    prismaMock.event.findUnique.mockResolvedValue(createPaidEvent());

    // Act
    const response = await PATCH(
      new Request('http://localhost/api/admin/events/event-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: '2026-07-21T12:00:00.000Z',
          end: '2026-07-21T13:30:00.000Z'
        })
      }),
      { params: Promise.resolve({ id: 'event-1' }) }
    );

    // Assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message:
        'У оплаченной консультации нельзя менять длительность. Для этого сначала отмените встречу, чтобы выполнить возврат.'
    });
    expect(runFinancialTransactionMock).not.toHaveBeenCalled();
  });
});
