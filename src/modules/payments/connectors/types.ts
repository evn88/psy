import type { z } from 'zod';

import type {
  IPaymentService,
  PaymentProviderCapability,
  PaymentProviderCheckoutConfig,
  PaymentProviderHealthStatus,
  PaymentProviderId
} from '@/modules/payments/types';

export interface PaymentConnectorSettingOption {
  label: string;
  value: string;
}

export interface PaymentConnectorSettingField {
  description: string;
  key: string;
  label: string;
  options?: PaymentConnectorSettingOption[];
  type: 'select' | 'text';
}

export interface PaymentConnectorMetadata {
  id: PaymentProviderId;
  label: string;
  description: string;
  capabilities: PaymentProviderCapability[];
  requiredEnvironmentVariables: string[];
  supportedCurrencies: string[];
  settingsFields: PaymentConnectorSettingField[];
}

export interface PaymentConnectorHealth {
  status: PaymentProviderHealthStatus;
  message: string;
}

export interface PaymentConnector {
  metadata: PaymentConnectorMetadata;
  settingsSchema: z.ZodType<Record<string, unknown>>;
  defaultSettings: Record<string, unknown>;
  createService: () => IPaymentService;
  getCheckoutConfig: (settings: Record<string, unknown>) => PaymentProviderCheckoutConfig;
  testConnection: () => Promise<PaymentConnectorHealth>;
}

export interface ResolvedPaymentConnector {
  connector: PaymentConnector;
  settings: Record<string, unknown>;
  enabled: boolean;
  isDefault: boolean;
}
