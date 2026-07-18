'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2, CircleAlert, PlugZap, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useRouter } from '@/i18n/navigation';
import type { PaymentConnectorSettingField } from '@/modules/payments/connectors/types';

import {
  testPaymentProviderAction,
  updatePaymentProviderAction,
  type PaymentProviderActionState
} from '../actions';

const INITIAL_STATE: PaymentProviderActionState = {
  status: 'idle',
  message: ''
};

interface ProviderSettingsFormProps {
  enabled: boolean;
  environmentConfigured: boolean;
  isDefault: boolean;
  providerId: string;
  settings: Record<string, string>;
  settingsFields: PaymentConnectorSettingField[];
}

const SubmitButton = ({
  children,
  icon: Icon,
  variant = 'default'
}: {
  children: React.ReactNode;
  icon: typeof Save;
  variant?: 'default' | 'outline';
}) => {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} variant={variant}>
      <Icon className={pending ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
      {pending ? 'Выполняю...' : children}
    </Button>
  );
};

/**
 * Универсальная форма состояния и публичных настроек платёжного коннектора.
 */
export const ProviderSettingsForm = ({
  enabled: initialEnabled,
  environmentConfigured,
  isDefault: initialIsDefault,
  providerId,
  settings,
  settingsFields
}: ProviderSettingsFormProps) => {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isDefault, setIsDefault] = useState(initialIsDefault);
  const [saveState, saveAction] = useActionState(updatePaymentProviderAction, INITIAL_STATE);
  const [testState, testAction] = useActionState(testPaymentProviderAction, INITIAL_STATE);

  useEffect(() => {
    if (saveState.status === 'success') {
      toast.success(saveState.message);
      router.refresh();
    } else if (saveState.status === 'error') {
      toast.error(saveState.message);
    }
  }, [router, saveState]);

  useEffect(() => {
    if (testState.status === 'success') {
      toast.success(testState.message);
      router.refresh();
    } else if (testState.status === 'error') {
      toast.error(testState.message);
    }
  }, [router, testState]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-h-20 items-center justify-between gap-4 rounded-xl border bg-muted/20 px-4 py-3">
          <div>
            <p className="font-medium">Принимать новые платежи</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Отключение не мешает сверять старые операции.
            </p>
          </div>
          <Switch
            checked={enabled}
            disabled={!environmentConfigured && !enabled}
            onCheckedChange={value => {
              setEnabled(value);
              if (!value) setIsDefault(false);
            }}
            aria-label="Принимать новые платежи"
          />
        </div>

        <div className="flex min-h-20 items-center justify-between gap-4 rounded-xl border bg-muted/20 px-4 py-3">
          <div>
            <p className="font-medium">Провайдер по умолчанию</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Предлагается первым в клиентском checkout.
            </p>
          </div>
          <Switch
            checked={isDefault}
            disabled={!enabled}
            onCheckedChange={setIsDefault}
            aria-label="Провайдер по умолчанию"
          />
        </div>
      </div>

      <form action={saveAction} className="space-y-4">
        <input type="hidden" name="providerId" value={providerId} />
        <input type="hidden" name="enabled" value={String(enabled)} />
        <input type="hidden" name="isDefault" value={String(isDefault)} />

        {settingsFields.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {settingsFields.map(field => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`${providerId}-${field.key}`}>{field.label}</Label>
                {field.type === 'select' ? (
                  <select
                    id={`${providerId}-${field.key}`}
                    name={field.key}
                    defaultValue={settings[field.key] ?? ''}
                    aria-describedby={`${providerId}-${field.key}-help`}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {field.options?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={`${providerId}-${field.key}`}
                    name={field.key}
                    defaultValue={settings[field.key] ?? ''}
                    aria-describedby={`${providerId}-${field.key}-help`}
                  />
                )}
                <p id={`${providerId}-${field.key}-help`} className="text-xs text-muted-foreground">
                  {field.description}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <SubmitButton icon={Save}>Сохранить</SubmitButton>
        </div>
      </form>

      <form action={testAction}>
        <input type="hidden" name="providerId" value={providerId} />
        <SubmitButton icon={PlugZap} variant="outline">
          Проверить соединение
        </SubmitButton>
      </form>

      {!environmentConfigured ? (
        <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Подключение недоступно, пока не заданы обязательные переменные окружения.
        </p>
      ) : (
        <p className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          Обязательные переменные окружения заданы.
        </p>
      )}
    </div>
  );
};
