import 'server-only';

import { FinancialEmailStatus, FinancialEmailTemplate } from '@prisma/client';
import { z } from 'zod';

import { sendFinancialNotificationEmail } from '@/lib/email';
import prisma from '@/lib/prisma';

const payloadSchema = z.object({
  operationId: z.string(),
  operationType: z.string(),
  amount: z.string().optional(),
  balanceAfter: z.string().optional(),
  currency: z.literal('EUR'),
  minutes: z.number().int().optional(),
  packageRemainingAfter: z.number().int().optional(),
  packageTitle: z.string().optional(),
  reason: z.string().optional(),
  eventStart: z.string().datetime().optional()
});

type FinancialPayload = z.infer<typeof payloadSchema>;

const EMAIL_BATCH_SIZE = 25;
const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

const getCopy = (
  template: FinancialEmailTemplate,
  recipientName: string | null,
  payload: FinancialPayload
) => {
  const greeting = `Здравствуйте${recipientName ? `, ${recipientName}` : ''}!`;
  const commonDetails: Array<{ label: string; value: string }> = [
    { label: 'Операция', value: payload.operationId }
  ];

  if (payload.amount) {
    commonDetails.push({ label: 'Сумма', value: `${payload.amount} EUR` });
  }
  if (payload.balanceAfter) {
    commonDetails.push({ label: 'Баланс после операции', value: `${payload.balanceAfter} EUR` });
  }
  if (payload.minutes) {
    commonDetails.push({ label: 'Минуты', value: String(payload.minutes) });
  }
  if (payload.packageRemainingAfter !== undefined) {
    commonDetails.push({
      label: 'Остаток в пакете',
      value: `${payload.packageRemainingAfter} мин.`
    });
  }
  if (payload.packageTitle) {
    commonDetails.push({ label: 'Пакет', value: payload.packageTitle });
  }
  if (payload.eventStart) {
    commonDetails.push({
      label: 'Дата консультации',
      value: new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC'
      }).format(new Date(payload.eventStart))
    });
  }
  if (payload.reason) {
    commonDetails.push({ label: 'Комментарий', value: payload.reason });
  }

  const copies: Record<
    FinancialEmailTemplate,
    { subject: string; heading: string; message: string }
  > = {
    BALANCE_TOPUP: {
      subject: 'Баланс успешно пополнен',
      heading: 'Пополнение баланса',
      message: 'Платёж подтверждён, средства зачислены на внутренний счёт.'
    },
    PACKAGE_PURCHASE: {
      subject: 'Пакет успешно приобретён',
      heading: 'Покупка пакета',
      message: 'Пакет добавлен в аккаунт и доступен для оплаты консультаций.'
    },
    CONSULTATION_CHARGE: {
      subject: 'Списание за консультацию',
      heading: 'Консультация оплачена',
      message: 'Стоимость или пакетные минуты зарезервированы для встречи.'
    },
    CONSULTATION_REVERSAL: {
      subject: 'Возврат за консультацию',
      heading: 'Средства возвращены',
      message: 'После отмены консультации деньги или минуты возвращены.'
    },
    PROVIDER_REFUND: {
      subject: 'Возврат платежа',
      heading: 'Возврат оформлен',
      message: 'Возврат через платёжного провайдера отражён во внутреннем счёте.'
    },
    MANUAL_ADJUSTMENT: {
      subject: 'Корректировка баланса',
      heading: 'Баланс скорректирован',
      message: 'Администратор выполнил корректировку средств или минут.'
    },
    ADMIN_PAYMENT_RECEIVED: {
      subject: 'Получен новый платёж',
      heading: 'Платёж клиента подтверждён',
      message: 'Система успешно зачислила оплату клиента.'
    },
    ADMIN_REFUND: {
      subject: 'Выполнен возврат клиенту',
      heading: 'Возврат подтверждён',
      message: 'Возврат отражён в платёжном провайдере и финансовом журнале.'
    }
  };

  return {
    ...copies[template],
    greeting,
    details: commonDetails
  };
};

/**
 * Возвращает зависшие processing-записи в очередь для повторной доставки.
 */
const releaseStaleClaims = async (): Promise<void> => {
  await prisma.financialEmailOutbox.updateMany({
    where: {
      status: FinancialEmailStatus.PROCESSING,
      claimedAt: { lt: new Date(Date.now() - CLAIM_TIMEOUT_MS) }
    },
    data: {
      status: FinancialEmailStatus.PENDING,
      claimedAt: null
    }
  });
};

/**
 * Обрабатывает ограниченную пачку outbox с конкурентным claim и retry.
 */
export const processFinancialEmailOutbox = async (): Promise<{
  claimed: number;
  sent: number;
  failed: number;
}> => {
  await releaseStaleClaims();

  const candidates = await prisma.financialEmailOutbox.findMany({
    where: {
      status: FinancialEmailStatus.PENDING,
      nextAttemptAt: { lte: new Date() }
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: EMAIL_BATCH_SIZE
  });

  let claimed = 0;
  let sent = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const claimedAt = new Date();
    const claim = await prisma.financialEmailOutbox.updateMany({
      where: {
        id: candidate.id,
        status: FinancialEmailStatus.PENDING
      },
      data: {
        status: FinancialEmailStatus.PROCESSING,
        claimedAt,
        attempts: { increment: 1 }
      }
    });

    if (claim.count !== 1) {
      continue;
    }

    claimed += 1;
    const item = await prisma.financialEmailOutbox.findUniqueOrThrow({
      where: { id: candidate.id }
    });

    try {
      const payload = payloadSchema.parse(item.payload);
      const copy = getCopy(item.template, item.recipientName, payload);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const isAdminTemplate =
        item.template === FinancialEmailTemplate.ADMIN_PAYMENT_RECEIVED ||
        item.template === FinancialEmailTemplate.ADMIN_REFUND;
      const providerMessageId = await sendFinancialNotificationEmail({
        email: item.recipientEmail,
        subject: copy.subject,
        heading: copy.heading,
        greeting: copy.greeting,
        message: copy.message,
        details: copy.details,
        actionUrl: `${baseUrl}/${item.locale || 'ru'}/${isAdminTemplate ? 'admin/payments' : 'my/payments'}`,
        actionText: isAdminTemplate ? 'Открыть платежи' : 'Открыть мой баланс'
      });

      if (!providerMessageId) {
        throw new Error('Провайдер не вернул идентификатор письма');
      }

      await prisma.financialEmailOutbox.update({
        where: { id: item.id },
        data: {
          status: FinancialEmailStatus.SENT,
          providerMessageId,
          sentAt: new Date(),
          claimedAt: null,
          lastError: null
        }
      });
      sent += 1;
    } catch (error: unknown) {
      const retryDelayMinutes = Math.min(60, 2 ** Math.min(item.attempts, 6));
      const isFinalAttempt = item.attempts >= 10;

      await prisma.financialEmailOutbox.update({
        where: { id: item.id },
        data: {
          status: isFinalAttempt ? FinancialEmailStatus.FAILED : FinancialEmailStatus.PENDING,
          nextAttemptAt: new Date(Date.now() + retryDelayMinutes * 60_000),
          claimedAt: null,
          lastError:
            error instanceof Error ? error.message.slice(0, 2000) : 'Неизвестная ошибка отправки'
        }
      });
      failed += 1;
    }
  }

  return { claimed, sent, failed };
};
