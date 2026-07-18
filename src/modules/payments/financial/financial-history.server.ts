import 'server-only';

import { FinancialOperationType, FinancialOperationStatus, Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';

import {
  getFinancialHistorySourceLabel,
  resolveFinancialHistorySource
} from './financial-history-source';
import type { FinancialHistoryDirection, FinancialHistoryItem } from './financial-history-table';

const FAILED_PAYMENT_STATUSES = new Set(['DECLINED', 'DENIED', 'FAILED', 'CANCELLED']);
const PENDING_PAYMENT_STATUSES = new Set(['CREATED', 'SAVED', 'APPROVED', 'PENDING']);

const formatDate = (date: Date): string =>
  date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

const getOperationTitle = (type: FinancialOperationType): string => {
  const titles: Record<FinancialOperationType, string> = {
    MIGRATION_OPENING_BALANCE: 'Начальный баланс',
    TOPUP: 'Пополнение баланса',
    PACKAGE_PURCHASE: 'Покупка пакета',
    PACKAGE_PURCHASE_REVERSAL: 'Отмена покупки пакета',
    CONSULTATION_CHARGE: 'Оплата консультации',
    CONSULTATION_REVERSAL: 'Возврат за консультацию',
    PROVIDER_REFUND: 'Возврат платежа',
    MANUAL_ADJUSTMENT: 'Корректировка администратора'
  };

  return titles[type];
};

const getOperationStatusGroup = (
  status: FinancialOperationStatus
): FinancialHistoryItem['statusGroup'] => {
  if (status === FinancialOperationStatus.COMPLETED) return 'SUCCESS';
  if (status === FinancialOperationStatus.PENDING) return 'PENDING';
  return 'FAILED';
};

const getDirection = (
  amount: Prisma.Decimal,
  type: FinancialOperationType
): FinancialHistoryDirection => {
  if (type === FinancialOperationType.PROVIDER_REFUND) return 'REFUND';
  if (amount.greaterThan(0)) return 'INCOME';
  if (amount.lessThan(0)) return 'EXPENSE';
  return 'NEUTRAL';
};

/**
 * Собирает единый read model из подтверждённых wallet-проводок и неуспешных provider-попыток.
 */
export const getFinancialHistory = async (params?: {
  userId?: string;
  take?: number;
}): Promise<FinancialHistoryItem[]> => {
  const take = Math.min(params?.take ?? 500, 1000);
  const [walletTransactionsResult, packageTransactionsResult, providerAttemptsResult] =
    await Promise.all([
      prisma.walletTransaction.findMany({
        where: params?.userId ? { userId: params.userId } : undefined,
        include: {
          operation: {
            include: {
              emailOutbox: {
                select: {
                  status: true,
                  template: true
                }
              },
              initiatedBy: {
                select: {
                  email: true,
                  name: true
                }
              },
              payment: {
                select: {
                  amount: true,
                  captureId: true,
                  description: true,
                  id: true,
                  kind: true,
                  orderId: true,
                  provider: true,
                  refundedAmount: true,
                  status: true
                }
              }
            }
          },
          user: {
            select: {
              email: true,
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take
      }),
      prisma.packageTransaction.findMany({
        where: params?.userId
          ? {
              purchasedPackage: {
                userId: params.userId
              }
            }
          : undefined,
        include: {
          operation: {
            include: {
              emailOutbox: {
                select: {
                  status: true,
                  template: true
                }
              },
              initiatedBy: {
                select: {
                  email: true,
                  name: true
                }
              },
              payment: {
                select: {
                  id: true,
                  provider: true
                }
              }
            }
          },
          purchasedPackage: {
            include: {
              user: {
                select: {
                  email: true,
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take
      }),
      prisma.payment.findMany({
        where: {
          ...(params?.userId ? { userId: params.userId } : {}),
          OR: [
            { fulfilledAt: null },
            { status: { in: [...FAILED_PAYMENT_STATUSES, ...PENDING_PAYMENT_STATUSES] } }
          ]
        },
        include: {
          user: {
            select: {
              email: true,
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take
      })
    ]);
  type WalletTransactionRecord = Prisma.WalletTransactionGetPayload<{
    include: {
      operation: {
        include: {
          emailOutbox: {
            select: {
              status: true;
              template: true;
            };
          };
          initiatedBy: {
            select: {
              email: true;
              name: true;
            };
          };
          payment: {
            select: {
              amount: true;
              captureId: true;
              description: true;
              id: true;
              kind: true;
              orderId: true;
              provider: true;
              refundedAmount: true;
              status: true;
            };
          };
        };
      };
      user: {
        select: {
          email: true;
          id: true;
          name: true;
        };
      };
    };
  }>;
  type ProviderAttemptRecord = Prisma.PaymentGetPayload<{
    include: {
      user: {
        select: {
          email: true;
          id: true;
          name: true;
        };
      };
    };
  }>;
  type PackageTransactionRecord = Prisma.PackageTransactionGetPayload<{
    include: {
      operation: {
        include: {
          emailOutbox: {
            select: {
              status: true;
              template: true;
            };
          };
          initiatedBy: {
            select: {
              email: true;
              name: true;
            };
          };
          payment: {
            select: {
              id: true;
              provider: true;
            };
          };
        };
      };
      purchasedPackage: {
        include: {
          user: {
            select: {
              email: true;
              id: true;
              name: true;
            };
          };
        };
      };
    };
  }>;
  const walletTransactions = walletTransactionsResult as WalletTransactionRecord[];
  const packageTransactions = packageTransactionsResult as PackageTransactionRecord[];
  const providerAttempts = providerAttemptsResult as ProviderAttemptRecord[];

  const walletItems: FinancialHistoryItem[] = walletTransactions.map(transaction => {
    const payment = transaction.operation.payment;
    const source = resolveFinancialHistorySource({
      isAdminAdjustment: transaction.operation.type === FinancialOperationType.MANUAL_ADJUSTMENT,
      provider: payment?.provider ?? null
    });
    const amountValue = transaction.amount.toNumber();
    const isTopupTransaction = transaction.type === 'TOPUP';
    const refundableAmount = payment?.amount.minus(payment.refundedAmount);
    const refundable =
      isTopupTransaction &&
      Boolean(payment?.captureId) &&
      Boolean(refundableAmount?.greaterThan(0));

    return {
      id: transaction.id,
      paymentId: payment?.id ?? null,
      clientId: transaction.user.id,
      clientName: transaction.user.name || 'Без имени',
      clientEmail: transaction.user.email,
      provider: payment?.provider ?? null,
      source,
      status: transaction.operation.status,
      statusGroup: getOperationStatusGroup(transaction.operation.status),
      direction: getDirection(transaction.amount, transaction.operation.type),
      unit: 'EUR',
      amountValue,
      amountLabel: `${amountValue > 0 ? '+' : ''}${transaction.amount.toFixed(2)} EUR`,
      createdAtLabel: formatDate(transaction.createdAt),
      createdAtIso: transaction.createdAt.toISOString(),
      title: getOperationTitle(transaction.operation.type),
      refundable,
      details: [
        {
          label: 'Источник',
          value: getFinancialHistorySourceLabel(source, payment?.provider)
        },
        ...(source === 'ADMIN_ADJUSTMENT'
          ? [
              {
                label: 'Выполнил',
                value: transaction.operation.initiatedBy
                  ? transaction.operation.initiatedBy.name
                    ? `${transaction.operation.initiatedBy.name} (${transaction.operation.initiatedBy.email})`
                    : transaction.operation.initiatedBy.email
                  : 'Администратор (аккаунт недоступен)'
              }
            ]
          : []),
        { label: 'Тип проводки', value: transaction.type },
        {
          label: 'Баланс до',
          value: `${transaction.balanceBefore.toFixed(2)} EUR`
        },
        {
          label: 'Баланс после',
          value: `${transaction.balanceAfter.toFixed(2)} EUR`
        },
        ...(payment
          ? [
              { label: 'Провайдер', value: payment.provider },
              { label: 'ID платежа', value: payment.id },
              { label: 'Order ID', value: payment.orderId },
              { label: 'Capture ID', value: payment.captureId || '—' }
            ]
          : []),
        ...(transaction.operation.reason
          ? [{ label: 'Причина', value: transaction.operation.reason }]
          : []),
        ...(transaction.operation.emailOutbox.length > 0
          ? [
              {
                label: 'Email-уведомления',
                value: transaction.operation.emailOutbox
                  .map(email => `${email.template}: ${email.status}`)
                  .join(', ')
              }
            ]
          : [])
      ]
    };
  });

  const packageItems: FinancialHistoryItem[] = packageTransactions.map(transaction => {
    const amountValue = transaction.minutes;
    const user = transaction.purchasedPackage.user;
    const provider = transaction.operation.payment?.provider ?? null;
    const source = resolveFinancialHistorySource({
      isAdminAdjustment: transaction.operation.type === FinancialOperationType.MANUAL_ADJUSTMENT,
      provider
    });

    return {
      id: transaction.id,
      paymentId: transaction.operation.payment?.id ?? null,
      clientId: user.id,
      clientName: user.name || 'Без имени',
      clientEmail: user.email,
      provider,
      source,
      status: transaction.operation.status,
      statusGroup: getOperationStatusGroup(transaction.operation.status),
      direction:
        transaction.type === 'REVOCATION'
          ? 'REFUND'
          : transaction.minutes > 0
            ? 'INCOME'
            : 'EXPENSE',
      unit: 'MINUTES',
      amountValue,
      amountLabel: `${amountValue > 0 ? '+' : ''}${amountValue} мин`,
      createdAtLabel: formatDate(transaction.createdAt),
      createdAtIso: transaction.createdAt.toISOString(),
      title: getOperationTitle(transaction.operation.type),
      refundable: false,
      details: [
        {
          label: 'Источник',
          value: getFinancialHistorySourceLabel(source, provider)
        },
        ...(source === 'ADMIN_ADJUSTMENT'
          ? [
              {
                label: 'Выполнил',
                value: transaction.operation.initiatedBy
                  ? transaction.operation.initiatedBy.name
                    ? `${transaction.operation.initiatedBy.name} (${transaction.operation.initiatedBy.email})`
                    : transaction.operation.initiatedBy.email
                  : 'Администратор (аккаунт недоступен)'
              }
            ]
          : []),
        { label: 'Тип проводки', value: transaction.type },
        {
          label: 'Остаток до',
          value: `${transaction.remainingBefore} мин.`
        },
        {
          label: 'Остаток после',
          value: `${transaction.remainingAfter} мин.`
        },
        { label: 'ID купленного пакета', value: transaction.purchasedPackageId },
        ...(transaction.eventId ? [{ label: 'ID встречи', value: transaction.eventId }] : []),
        ...(transaction.operation.reason
          ? [{ label: 'Причина', value: transaction.operation.reason }]
          : []),
        ...(transaction.operation.emailOutbox.length > 0
          ? [
              {
                label: 'Email-уведомления',
                value: transaction.operation.emailOutbox
                  .map(email => `${email.template}: ${email.status}`)
                  .join(', ')
              }
            ]
          : [])
      ]
    };
  });

  const providerItems: FinancialHistoryItem[] = providerAttempts.map(payment => {
    const normalizedStatus = payment.status.toUpperCase();
    const statusGroup = FAILED_PAYMENT_STATUSES.has(normalizedStatus)
      ? 'FAILED'
      : PENDING_PAYMENT_STATUSES.has(normalizedStatus)
        ? 'PENDING'
        : 'SUCCESS';

    return {
      id: payment.id,
      paymentId: payment.id,
      clientId: payment.user.id,
      clientName: payment.user.name || 'Без имени',
      clientEmail: payment.user.email,
      provider: payment.provider,
      source: 'PAYMENT_PROVIDER',
      status: payment.status,
      statusGroup,
      direction: 'NEUTRAL',
      amountValue: payment.amount.toNumber(),
      amountLabel: `${payment.amount.toFixed(2)} EUR`,
      unit: 'EUR',
      createdAtLabel: formatDate(payment.createdAt),
      createdAtIso: payment.createdAt.toISOString(),
      title: payment.kind === 'TOPUP' ? 'Попытка пополнения' : 'Попытка покупки пакета',
      refundable: false,
      details: [
        {
          label: 'Источник',
          value: getFinancialHistorySourceLabel('PAYMENT_PROVIDER', payment.provider)
        },
        { label: 'Провайдер', value: payment.provider },
        { label: 'Order ID', value: payment.orderId },
        { label: 'Capture ID', value: payment.captureId || '—' },
        { label: 'Назначение', value: payment.description || '—' }
      ]
    };
  });

  return [...walletItems, ...packageItems, ...providerItems]
    .sort((left, right) => right.createdAtIso.localeCompare(left.createdAtIso))
    .slice(0, take);
};
