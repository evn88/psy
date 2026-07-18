import type { PaymentProviderConfig, Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';
import type {
  IPaymentService,
  PaymentProviderCheckoutConfig,
  PaymentProviderId
} from '@/modules/payments/types';

import { payPalConnector } from './paypal/connector.server';
import { stripeConnector } from './stripe/connector.server';
import type {
  PaymentConnector,
  PaymentConnectorHealth,
  PaymentConnectorMetadata,
  ResolvedPaymentConnector
} from './types';

const paymentConnectors = [payPalConnector, stripeConnector] as const;

const connectorById = new Map<PaymentProviderId, PaymentConnector>(
  paymentConnectors.map(connector => [connector.metadata.id, connector])
);

const parseSettings = (
  connector: PaymentConnector,
  settings: Prisma.JsonValue | null
): Record<string, unknown> => {
  const parsed = connector.settingsSchema.safeParse(settings ?? connector.defaultSettings);
  return parsed.success ? parsed.data : connector.defaultSettings;
};

/**
 * Возвращает метаданные всех коннекторов, установленных в кодовой базе.
 */
export const getInstalledPaymentConnectorMetadata = (): PaymentConnectorMetadata[] => {
  return paymentConnectors.map(connector => connector.metadata);
};

/**
 * Возвращает определение установленного коннектора для серверных форм и actions.
 */
export const getInstalledPaymentConnector = (
  providerId: PaymentProviderId
): PaymentConnector | null => {
  return connectorById.get(providerId) ?? null;
};

/**
 * Возвращает установленный коннектор и его управляемые настройки.
 */
export const getPaymentConnector = async (
  providerId: PaymentProviderId,
  options: { requireEnabled?: boolean } = {}
): Promise<ResolvedPaymentConnector> => {
  const connector = connectorById.get(providerId);

  if (!connector) {
    throw new Error(`Payment connector ${providerId} is not installed`);
  }

  const config = await prisma.paymentProviderConfig.findUnique({
    where: { id: providerId }
  });
  const enabled = config?.enabled ?? false;

  if (options.requireEnabled && !enabled) {
    throw new Error(`Payment connector ${providerId} is disabled`);
  }

  return {
    connector,
    settings: parseSettings(connector, config?.settings ?? null),
    enabled,
    isDefault: config?.isDefault ?? false
  };
};

/**
 * Возвращает включённый коннектор по умолчанию для создания новых платежей.
 */
export const getDefaultPaymentConnector = async (): Promise<ResolvedPaymentConnector> => {
  const config = await prisma.paymentProviderConfig.findFirst({
    where: {
      enabled: true,
      id: { in: paymentConnectors.map(connector => connector.metadata.id) }
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
  });

  if (!config) {
    throw new Error('No enabled payment providers configured');
  }

  return getPaymentConnector(config.id, { requireEnabled: true });
};

/**
 * Возвращает сервис для нового платежа или для конкретной исторической операции.
 */
export const getPaymentService = async (
  providerId?: PaymentProviderId,
  options: { requireEnabled?: boolean } = {}
): Promise<IPaymentService> => {
  const resolved = providerId
    ? await getPaymentConnector(providerId, options)
    : await getDefaultPaymentConnector();

  return resolved.connector.createService();
};

/**
 * Возвращает безопасные клиентские конфигурации всех доступных способов оплаты.
 */
export const getEnabledPaymentCheckoutConfigs = async (): Promise<
  PaymentProviderCheckoutConfig[]
> => {
  const configs = await prisma.paymentProviderConfig.findMany({
    where: { enabled: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
  });

  return (configs as PaymentProviderConfig[]).flatMap(config => {
    const connector = connectorById.get(config.id);

    if (!connector) {
      return [];
    }

    try {
      return [connector.getCheckoutConfig(parseSettings(connector, config.settings))];
    } catch {
      return [];
    }
  });
};

/**
 * Проверяет соединение с провайдером и сохраняет диагностический результат.
 */
export const testPaymentConnector = async (
  providerId: PaymentProviderId
): Promise<PaymentConnectorHealth> => {
  const connector = connectorById.get(providerId);

  if (!connector) {
    throw new Error(`Payment connector ${providerId} is not installed`);
  }

  const health = await connector.testConnection();

  await prisma.paymentProviderConfig.upsert({
    where: { id: providerId },
    create: {
      id: providerId,
      settings: connector.defaultSettings,
      lastHealthStatus: health.status,
      lastHealthMessage: health.message,
      lastHealthCheckedAt: new Date()
    },
    update: {
      lastHealthStatus: health.status,
      lastHealthMessage: health.message,
      lastHealthCheckedAt: new Date()
    }
  });

  return health;
};
