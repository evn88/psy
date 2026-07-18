import { Badge } from '@/components/ui/badge';
import type { PaymentProviderConfig } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  getInstalledPaymentConnector,
  getInstalledPaymentConnectorMetadata
} from '@/modules/payments/connectors/registry.server';
import type { PaymentConnectorMetadata } from '@/modules/payments/connectors/types';

import { ProviderSettingsForm } from './_components/provider-settings-form';

/**
 * Управление установленными платёжными коннекторами.
 */
const PaymentProvidersPage = async () => {
  const metadata: PaymentConnectorMetadata[] = getInstalledPaymentConnectorMetadata();
  const configs = (await prisma.paymentProviderConfig.findMany()) as PaymentProviderConfig[];
  const configById = new Map<string, PaymentProviderConfig>(
    configs.map(config => [config.id, config])
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Платёжные провайдеры</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Подключайте установленные коннекторы, выбирайте основной способ оплаты и проверяйте
          доступность внешнего API. Секретные значения хранятся только в переменных окружения.
        </p>
      </header>

      <div className="divide-y rounded-2xl border bg-card">
        {metadata.map(provider => {
          const config = configById.get(provider.id);
          const connector = getInstalledPaymentConnector(provider.id);
          const defaultSettings = connector?.defaultSettings ?? {};
          const settings =
            config?.settings &&
            typeof config.settings === 'object' &&
            !Array.isArray(config.settings)
              ? Object.fromEntries(
                  Object.entries(config.settings).map(([key, value]) => [key, String(value)])
                )
              : Object.fromEntries(
                  Object.entries(defaultSettings).map(([key, value]) => [key, String(value)])
                );
          const missingVariables = provider.requiredEnvironmentVariables.filter(
            name => !process.env[name]?.trim()
          );

          return (
            <section key={provider.id} className="space-y-6 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">{provider.label}</h2>
                    <Badge variant={config?.enabled ? 'default' : 'secondary'}>
                      {config?.enabled ? 'Подключён' : 'Отключён'}
                    </Badge>
                    {config?.isDefault ? <Badge variant="outline">По умолчанию</Badge> : null}
                  </div>
                  <p className="max-w-2xl text-sm text-muted-foreground">{provider.description}</p>
                </div>

                <div className="text-sm lg:text-right">
                  <p className="font-medium">
                    Проверка:{' '}
                    {config?.lastHealthStatus === 'configured'
                      ? 'успешно'
                      : config?.lastHealthStatus === 'error'
                        ? 'ошибка'
                        : 'не выполнена'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {config?.lastHealthMessage ?? 'Запустите проверку после настройки credentials.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2" aria-label="Возможности провайдера">
                {provider.capabilities.map(capability => (
                  <Badge key={capability} variant="outline" className="font-normal">
                    {capability}
                  </Badge>
                ))}
              </div>

              <ProviderSettingsForm
                enabled={config?.enabled ?? false}
                environmentConfigured={missingVariables.length === 0}
                isDefault={config?.isDefault ?? false}
                providerId={provider.id}
                settings={settings}
                settingsFields={provider.settingsFields}
              />

              <details className="rounded-xl bg-muted/30 px-4 py-3 text-sm">
                <summary className="cursor-pointer font-medium">Требования к окружению</summary>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {provider.requiredEnvironmentVariables.map(name => (
                    <li key={name}>
                      <code>{name}</code>: {process.env[name]?.trim() ? 'задана' : 'не задана'}
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          );
        })}
      </div>

      <section className="space-y-2 rounded-2xl border border-dashed p-5 sm:p-6">
        <h2 className="font-semibold">Как добавить новый провайдер</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Создайте папку в <code>src/modules/payments/connectors</code>, реализуйте контракт
          коннектора и зарегистрируйте его в <code>registry.server.ts</code>. После этого форма и
          health check появятся на этой странице автоматически.
        </p>
      </section>
    </div>
  );
};

export default PaymentProvidersPage;
