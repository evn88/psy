import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    pilloIntake: {
      updateMany: mocks.updateMany
    }
  }
}));

import {
  claimPilloReminderIntake,
  releasePilloReminderPush,
  reservePilloReminderPush
} from '../reminder-claims.server';

describe('Pillo reminder claim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает true только владельцу атомарного claim', async () => {
    // Arrange
    const claimedAt = new Date('2026-07-17T10:00:00.000Z');
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });

    // Act
    const claimed = await claimPilloReminderIntake('intake-1', claimedAt);

    // Assert
    expect(claimed).toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'intake-1',
        status: 'PENDING',
        AND: [
          {
            OR: [{ reminderEmailSentAt: null }, { reminderPushSentAt: null }]
          },
          {
            OR: [
              { reminderWorkflowStartedAt: null },
              {
                reminderWorkflowStartedAt: {
                  lte: new Date('2026-07-17T09:45:00.000Z')
                }
              }
            ]
          }
        ]
      },
      data: {
        reminderWorkflowStartedAt: claimedAt
      }
    });
  });

  it('возвращает false конкурентному процессу', async () => {
    // Arrange
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });

    // Act
    const claimed = await claimPilloReminderIntake(
      'intake-1',
      new Date('2026-07-17T10:00:00.000Z')
    );

    // Assert
    expect(claimed).toBe(false);
  });

  it('резервирует Web Push до обращения к провайдеру', async () => {
    // Arrange
    const workflowClaimedAt = new Date('2026-07-17T10:00:00.000Z');
    const pushClaimedAt = new Date('2026-07-17T10:00:01.000Z');
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });

    // Act
    const reserved = await reservePilloReminderPush(
      'intake-1',
      workflowClaimedAt,
      pushClaimedAt,
      true
    );

    // Assert
    expect(reserved).toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'intake-1',
        status: 'PENDING',
        reminderWorkflowStartedAt: workflowClaimedAt,
        reminderPushClaimedAt: null,
        reminderPushSentAt: null
      },
      data: {
        reminderPushClaimedAt: pushClaimedAt,
        reminderPushSentAt: pushClaimedAt,
        reminderSentAt: pushClaimedAt
      }
    });
  });

  it('не разрешает конкурентную Web Push доставку', async () => {
    // Arrange
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });

    // Act
    const reserved = await reservePilloReminderPush(
      'intake-1',
      new Date('2026-07-17T10:00:00.000Z'),
      new Date('2026-07-17T10:00:01.000Z'),
      false
    );

    // Assert
    expect(reserved).toBe(false);
  });

  it('освобождает только собственную reservation после ошибки провайдера', async () => {
    // Arrange
    const workflowClaimedAt = new Date('2026-07-17T10:00:00.000Z');
    const pushClaimedAt = new Date('2026-07-17T10:00:01.000Z');
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });

    // Act
    await releasePilloReminderPush('intake-1', workflowClaimedAt, pushClaimedAt);

    // Assert
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'intake-1',
        status: 'PENDING',
        reminderWorkflowStartedAt: workflowClaimedAt,
        reminderPushClaimedAt: pushClaimedAt,
        reminderPushSentAt: pushClaimedAt
      },
      data: {
        reminderPushClaimedAt: null,
        reminderPushSentAt: null,
        reminderSentAt: null
      }
    });
  });
});
