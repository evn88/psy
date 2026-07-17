import { EventStatus, EventType, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  event: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn()
  },
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn()
  },
  $transaction: vi.fn()
}));
const fetchGoogleEventsMock = vi.hoisted(() => vi.fn());
const syncEventWithGoogleMock = vi.hoisted(() => vi.fn());
const sendAdminEventBookingEmailMock = vi.hoisted(() => vi.fn());
const sendAdminEventCancellationEmailMock = vi.hoisted(() => vi.fn());
const sendEventCancellationEmailMock = vi.hoisted(() => vi.fn());
const sendEventNotificationEmailMock = vi.hoisted(() => vi.fn());
const startSessionReminderWorkflowMock = vi.hoisted(() => vi.fn());
const writeSystemLogEntryMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/lib/google-sync', () => ({
  fetchGoogleEvents: fetchGoogleEventsMock,
  syncEventWithGoogle: syncEventWithGoogleMock
}));
vi.mock('@/lib/email', () => ({
  sendAdminEventBookingEmail: sendAdminEventBookingEmailMock,
  sendAdminEventCancellationEmail: sendAdminEventCancellationEmailMock,
  sendEventCancellationEmail: sendEventCancellationEmailMock,
  sendEventNotificationEmail: sendEventNotificationEmailMock
}));
vi.mock('@/lib/session-reminder-workflow', () => ({
  startSessionReminderWorkflow: startSessionReminderWorkflowMock
}));
vi.mock('@/modules/system-logs/system-log-service.server', () => ({
  writeSystemLogEntry: writeSystemLogEntryMock
}));
vi.mock('@/modules/system-logs/with-api-logging.server', () => ({
  withApiLogging: <T extends (...args: never[]) => unknown>(handler: T): T => handler
}));

import { PATCH } from '../[id]/route';
import { GET } from '../route';

const futureStart = new Date('2099-07-20T10:00:00.000Z');
const futureEnd = new Date('2099-07-20T11:00:00.000Z');

const createEvent = (
  overrides: Partial<{
    id: string;
    title: string | null;
    type: EventType;
    status: EventStatus;
    start: Date;
    end: Date;
    meetLink: string | null;
    cancelReason: string | null;
    googleEventId: string | null;
    userId: string | null;
    bookingReminderMinutesBeforeStart: number | null;
  }> = {}
) => ({
  id: 'event-1',
  title: 'Консультация',
  type: EventType.CONSULTATION,
  status: EventStatus.PENDING_CONFIRMATION,
  start: futureStart,
  end: futureEnd,
  meetLink: 'https://meet.example.com/private',
  cancelReason: null,
  isGoogleSynced: false,
  googleEventId: null,
  authorId: 'admin-1',
  userId: 'user-1',
  groupId: null,
  createdAt: new Date('2099-07-01T00:00:00.000Z'),
  updatedAt: new Date('2099-07-01T00:00:00.000Z'),
  bookingReminderMinutesBeforeStart: 30,
  reminderEmailSentAt: null,
  reminderMinutesBeforeStart: 30,
  reminderPushSentAt: null,
  reminderWorkflowVersion: 2,
  user: {
    id: 'user-1',
    name: 'Пользователь',
    email: 'user@example.com',
    language: 'ru',
    timezone: 'Europe/Belgrade'
  },
  author: {
    id: 'admin-1',
    name: 'Администратор',
    email: 'admin@example.com',
    language: 'ru',
    timezone: 'Europe/Belgrade'
  },
  ...overrides
});

const createPatchRequest = (eventId: string, body: unknown) =>
  PATCH(
    new Request(`http://localhost/api/user/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),
    { params: Promise.resolve({ id: eventId }) }
  );

describe('GET /api/user/events', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.mockResolvedValue({ user: { id: 'user-1', role: Role.USER } });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.USER,
      isDisabled: false
    });
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.event.findMany.mockResolvedValue([]);
    fetchGoogleEventsMock.mockResolvedValue([]);
  });

  it('запрещает доступ пользователю с актуальной ролью GUEST в БД', async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.GUEST,
      isDisabled: false
    });

    // Act
    const response = await GET(new Request('http://localhost/api/user/events'), {});

    // Assert
    expect(response.status).toBe(403);
    expect(prismaMock.event.findMany).not.toHaveBeenCalled();
  });

  it('возвращает свободные, собственные и занятые события без приватных полей', async () => {
    // Arrange
    prismaMock.event.findMany.mockResolvedValue([
      createEvent({
        id: 'free-slot',
        title: 'Служебное название слота',
        type: EventType.FREE_SLOT,
        status: EventStatus.SCHEDULED,
        userId: null
      }),
      createEvent({
        id: 'day-off-secret',
        title: 'Личная причина выходного',
        type: EventType.DAY_OFF,
        status: EventStatus.SCHEDULED,
        userId: null,
        cancelReason: 'Секретная причина',
        googleEventId: 'google-day-off'
      }),
      createEvent({
        id: 'foreign-event-secret',
        title: 'Чужая консультация',
        type: EventType.CONSULTATION,
        status: EventStatus.SCHEDULED,
        userId: 'user-2',
        cancelReason: 'Чужая причина',
        googleEventId: 'google-foreign'
      }),
      createEvent({
        id: 'own-event',
        title: 'Моя консультация',
        userId: 'user-1',
        cancelReason: 'Внутренняя причина',
        googleEventId: 'google-own'
      }),
      createEvent({
        id: 'cancelled-free-slot',
        type: EventType.FREE_SLOT,
        status: EventStatus.CANCELLED,
        userId: null
      })
    ]);
    prismaMock.user.findFirst.mockResolvedValue({ id: 'admin-1' });
    fetchGoogleEventsMock.mockResolvedValue([
      {
        id: 'private-google-event-id',
        title: 'Private Google title',
        type: EventType.OTHER,
        status: EventStatus.SCHEDULED,
        start: futureStart,
        end: futureEnd,
        meetLink: 'https://meet.google.com/private',
        userId: null,
        isExternal: true
      }
    ]);

    // Act
    const response = await GET(
      new Request(
        'http://localhost/api/user/events?start=2099-07-01T00:00:00.000Z&end=2099-08-01T00:00:00.000Z'
      ),
      {}
    );
    const events = (await response.json()) as Array<Record<string, unknown>>;

    // Assert
    expect(response.status).toBe(200);
    expect(events).toHaveLength(5);

    const freeSlot = events.find(event => event.id === 'free-slot');
    expect(freeSlot).toMatchObject({
      type: EventType.FREE_SLOT,
      status: EventStatus.SCHEDULED,
      title: null,
      meetLink: null,
      userId: null
    });

    const ownEvent = events.find(event => event.id === 'own-event');
    expect(ownEvent).toMatchObject({
      title: 'Моя консультация',
      meetLink: 'https://meet.example.com/private',
      userId: 'self'
    });
    expect(ownEvent).not.toHaveProperty('cancelReason');
    expect(ownEvent).not.toHaveProperty('googleEventId');

    const busyEvents = events.filter(event => event.userId === 'hidden');
    expect(busyEvents).toHaveLength(3);
    for (const busyEvent of busyEvents) {
      expect(busyEvent).not.toHaveProperty('title');
      expect(busyEvent).not.toHaveProperty('meetLink');
      expect(busyEvent).not.toHaveProperty('cancelReason');
      expect(busyEvent).not.toHaveProperty('googleEventId');
    }
    expect(events.some(event => event.id === 'day-off-secret')).toBe(false);
    expect(events.some(event => event.id === 'foreign-event-secret')).toBe(false);
    expect(events.some(event => event.id === 'private-google-event-id')).toBe(false);
    expect(events.some(event => event.id === 'cancelled-free-slot')).toBe(false);
  });
});

describe('PATCH /api/user/events/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.mockResolvedValue({ user: { id: 'user-1', role: Role.USER } });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.USER,
      isDisabled: false
    });
    syncEventWithGoogleMock.mockResolvedValue({ success: true });
    startSessionReminderWorkflowMock.mockResolvedValue(true);
    sendAdminEventBookingEmailMock.mockResolvedValue('admin-booking-email-id');
    sendAdminEventCancellationEmailMock.mockResolvedValue('admin-cancellation-email-id');
    sendEventCancellationEmailMock.mockResolvedValue('user-cancellation-email-id');
    sendEventNotificationEmailMock.mockResolvedValue('user-booking-email-id');
    writeSystemLogEntryMock.mockResolvedValue(undefined);
  });

  it('запрещает мутацию отключённому пользователю из БД', async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.USER,
      isDisabled: true
    });

    // Act
    const response = await createPatchRequest('free-slot', { action: 'book' });

    // Assert
    expect(response.status).toBe(403);
    expect(prismaMock.event.updateMany).not.toHaveBeenCalled();
  });

  it('не позволяет забронировать DAY_OFF как свободный слот', async () => {
    // Arrange
    prismaMock.event.updateMany.mockResolvedValue({ count: 0 });

    // Act
    const response = await createPatchRequest('day-off', { action: 'book' });

    // Assert
    expect(response.status).toBe(409);
    expect(prismaMock.event.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'day-off',
          type: EventType.FREE_SLOT,
          status: EventStatus.SCHEDULED,
          userId: null,
          start: { gt: expect.any(Date) }
        })
      })
    );
    expect(sendEventNotificationEmailMock).not.toHaveBeenCalled();
    expect(syncEventWithGoogleMock).not.toHaveBeenCalled();
  });

  it('при параллельном бронировании фиксирует только одного победителя', async () => {
    // Arrange
    prismaMock.event.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    prismaMock.event.findUnique.mockResolvedValue(
      createEvent({
        id: 'free-slot',
        type: EventType.CONSULTATION,
        status: EventStatus.PENDING_CONFIRMATION,
        userId: 'user-1'
      })
    );

    // Act
    const responses = await Promise.all([
      createPatchRequest('free-slot', { action: 'book', reminderMinutesBeforeStart: 30 }),
      createPatchRequest('free-slot', { action: 'book', reminderMinutesBeforeStart: 30 })
    ]);

    // Assert
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    expect(sendEventNotificationEmailMock).toHaveBeenCalledTimes(1);
    expect(sendAdminEventBookingEmailMock).toHaveBeenCalledTimes(1);
    expect(startSessionReminderWorkflowMock).toHaveBeenCalledTimes(1);
    expect(syncEventWithGoogleMock).toHaveBeenCalledTimes(1);
  });

  it('возвращает успешное бронирование при сбое всех post-commit интеграций', async () => {
    // Arrange
    prismaMock.event.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.event.findUnique.mockResolvedValue(
      createEvent({
        id: 'free-slot',
        type: EventType.CONSULTATION,
        status: EventStatus.PENDING_CONFIRMATION,
        userId: 'user-1'
      })
    );
    sendEventNotificationEmailMock.mockRejectedValue(new Error('Resend user unavailable'));
    sendAdminEventBookingEmailMock.mockRejectedValue(new Error('Resend admin unavailable'));
    startSessionReminderWorkflowMock.mockRejectedValue(new Error('Workflow unavailable'));
    syncEventWithGoogleMock.mockRejectedValue(new Error('Google unavailable'));
    writeSystemLogEntryMock.mockRejectedValue(new Error('System log unavailable'));

    // Act
    const response = await createPatchRequest('free-slot', {
      action: 'book',
      reminderMinutesBeforeStart: 30
    });

    // Assert
    expect(response.status).toBe(200);
    expect(sendEventNotificationEmailMock).toHaveBeenCalledTimes(1);
    expect(sendAdminEventBookingEmailMock).toHaveBeenCalledTimes(1);
    expect(startSessionReminderWorkflowMock).toHaveBeenCalledTimes(1);
    expect(syncEventWithGoogleMock).toHaveBeenCalledTimes(1);
    expect(writeSystemLogEntryMock).toHaveBeenCalledTimes(4);
  });

  it('возвращает успешную отмену и синхронизирует Google независимо от email', async () => {
    // Arrange
    prismaMock.event.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.event.findUnique.mockResolvedValue(
      createEvent({
        id: 'event-to-cancel',
        status: EventStatus.CANCELLED,
        userId: 'user-1'
      })
    );
    sendEventCancellationEmailMock.mockRejectedValue(new Error('Resend user unavailable'));
    sendAdminEventCancellationEmailMock.mockRejectedValue(new Error('Resend admin unavailable'));

    // Act
    const response = await createPatchRequest('event-to-cancel', {
      action: 'cancel',
      reason: 'Изменились планы'
    });

    // Assert
    expect(response.status).toBe(200);
    expect(sendEventCancellationEmailMock).toHaveBeenCalledTimes(1);
    expect(sendAdminEventCancellationEmailMock).toHaveBeenCalledTimes(1);
    expect(syncEventWithGoogleMock).toHaveBeenCalledTimes(1);
    expect(writeSystemLogEntryMock).toHaveBeenCalledTimes(2);
  });

  it('при параллельном переносе отменяет исходное событие только один раз', async () => {
    // Arrange
    let previousEventCancelled = false;
    const claimedSlots = new Set<string>();
    let previousReads = 0;
    let releasePreviousReads: () => void = () => undefined;
    const bothTransactionsReadPreviousEvent = new Promise<void>(resolve => {
      releasePreviousReads = resolve;
    });

    prismaMock.$transaction.mockImplementation(
      async (
        callback: (transaction: {
          event: {
            findFirst: typeof prismaMock.event.findFirst;
            findUnique: typeof prismaMock.event.findUnique;
            updateMany: typeof prismaMock.event.updateMany;
          };
        }) => Promise<unknown>
      ) => {
        const localClaims: string[] = [];
        let claimedEventId = '';
        const transaction = {
          event: {
            findFirst: vi.fn(async () => {
              previousReads += 1;
              if (previousReads === 2) {
                releasePreviousReads();
              }
              await bothTransactionsReadPreviousEvent;
              return createEvent({
                id: 'old-event',
                status: EventStatus.PENDING_CONFIRMATION,
                userId: 'user-1'
              });
            }),
            updateMany: vi.fn(async ({ where }: { where: { id: string } }) => {
              if (where.id !== 'old-event') {
                if (claimedSlots.has(where.id)) {
                  return { count: 0 };
                }
                claimedSlots.add(where.id);
                localClaims.push(where.id);
                claimedEventId = where.id;
                return { count: 1 };
              }

              if (previousEventCancelled) {
                return { count: 0 };
              }
              previousEventCancelled = true;
              return { count: 1 };
            }),
            findUnique: vi.fn(async () =>
              createEvent({
                id: claimedEventId,
                status: EventStatus.PENDING_CONFIRMATION,
                userId: 'user-1'
              })
            )
          }
        };

        try {
          return await callback(transaction);
        } catch (error) {
          for (const claimedSlot of localClaims) {
            claimedSlots.delete(claimedSlot);
          }
          throw error;
        }
      }
    );

    // Act
    const responses = await Promise.all([
      createPatchRequest('old-event', {
        action: 'reschedule',
        newEventId: 'new-slot-a'
      }),
      createPatchRequest('old-event', {
        action: 'reschedule',
        newEventId: 'new-slot-b'
      })
    ]);

    // Assert
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    expect(previousEventCancelled).toBe(true);
    expect(claimedSlots.size).toBe(1);
    expect(sendEventCancellationEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEventNotificationEmailMock).toHaveBeenCalledTimes(1);
    expect(startSessionReminderWorkflowMock).toHaveBeenCalledTimes(1);
    expect(syncEventWithGoogleMock).toHaveBeenCalledTimes(2);
  });
});
