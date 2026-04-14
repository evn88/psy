'use client';

import { useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { FUNDING, PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { CreditCard } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { formatPaymentAmount } from '@/shared/lib/payments';

const DEFAULT_DESCRIPTION = 'Оплата консультации';
const DEFAULT_PAYMENT_VALUES: PaymentCheckoutValues = {
  amount: '',
  description: DEFAULT_DESCRIPTION
};

const paymentCheckoutSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Введите корректную сумму')
    .refine(value => Number(value) > 0, 'Сумма должна быть больше нуля'),
  description: z.string().trim().max(127, 'Описание не должно превышать 127 символов')
});

type PaymentCheckoutValues = z.infer<typeof paymentCheckoutSchema>;

interface PayPalCheckoutCardProps {
  clientId: string;
  currency: string;
}

/**
 * Карточка оплаты через PayPal и банковскую карту для личного кабинета.
 * @param props - Валюта и clientId для PayPal SDK.
 * @returns Компактный checkout-блок без лишнего визуального шума.
 */
export const PayPalCheckoutCard = ({ clientId, currency }: PayPalCheckoutCardProps) => {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const [isRefreshing, startTransition] = useTransition();
  const form = useForm<PaymentCheckoutValues>({
    resolver: zodResolver(paymentCheckoutSchema),
    mode: 'onChange',
    defaultValues: DEFAULT_PAYMENT_VALUES
  });
  const [watchedAmount, watchedDescription] = useWatch({
    control: form.control,
    name: ['amount', 'description']
  });
  const amountPreviewValue = watchedAmount ?? '';
  const descriptionPreviewValue = (watchedDescription ?? '').trim();
  const amountPreviewLabel = paymentCheckoutSchema.shape.amount.safeParse(amountPreviewValue)
    .success
    ? formatPaymentAmount(amountPreviewValue, currency)
    : 'Укажите сумму';
  const descriptionPreviewLabel = descriptionPreviewValue || DEFAULT_DESCRIPTION;
  const paymentMethods = [
    {
      key: 'paypal',
      fundingSource: FUNDING.PAYPAL,
      style: {
        color: isDarkTheme ? 'black' : 'blue',
        borderRadius: 16,
        disableMaxWidth: true,
        height: 48,
        label: 'paypal' as const,
        layout: 'horizontal' as const,
        shape: 'rect' as const,
        tagline: false
      }
    },
    {
      key: 'card',
      fundingSource: FUNDING.CARD,
      style: {
        color: 'black' as const,
        borderRadius: 16,
        disableMaxWidth: true,
        height: 48,
        layout: 'horizontal' as const,
        shape: 'rect' as const,
        tagline: false
      }
    }
  ] as const;

  /**
   * Обновляет страницу после успешного capture и очищает форму.
   */
  const handleSuccessfulCapture = () => {
    toast.success('Платёж успешно проведён');
    form.reset(DEFAULT_PAYMENT_VALUES);

    startTransition(() => {
      router.refresh();
    });
  };

  /**
   * Валидирует форму перед открытием PayPal checkout.
   * @returns `true`, если форма заполнена корректно.
   */
  const validateCheckout = async () => {
    return form.trigger();
  };

  /**
   * Создаёт PayPal order на сервере.
   * @returns Идентификатор созданного order.
   */
  const handleCreateOrder = async () => {
    const isValid = await validateCheckout();

    if (!isValid) {
      throw new Error('FORM_INVALID');
    }

    const response = await fetch('/api/paypal/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: form.getValues('amount'),
        currency,
        description: form.getValues('description')
      })
    });

    const payload = (await response.json()) as {
      id?: string;
      message?: string;
    };

    if (!response.ok || !payload.id) {
      throw new Error(payload.message || 'Не удалось создать платёжный order');
    }

    return payload.id;
  };

  /**
   * Выполняет capture созданного order и обновляет историю.
   * @param orderId - Идентификатор order из PayPal.
   */
  const handleApprove = async (orderId: string) => {
    const response = await fetch(`/api/paypal/orders/${orderId}/capture`, {
      method: 'POST'
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      throw new Error(payload.message || 'Не удалось завершить платёж');
    }

    handleSuccessfulCapture();
  };

  /**
   * Показывает уведомление только для реальных ошибок checkout.
   * @param error - Ошибка из PayPal SDK.
   */
  const handleCheckoutError = (error: unknown) => {
    if (error instanceof Error && error.message === 'FORM_INVALID') {
      return;
    }

    toast.error('PayPal checkout завершился с ошибкой');
  };

  return (
    <Card id="payment-checkout" className="border-border/70 bg-card shadow-sm">
      <CardHeader className="space-y-2 border-b border-border/60 bg-gradient-to-b from-muted/20 to-card pb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background text-foreground shadow-sm ring-1 ring-border/60">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl">Оплата</CardTitle>
            <CardDescription className="max-w-2xl">
              Введите сумму и назначение, затем выберите PayPal или банковскую карту. Заказ и
              capture создаются на сервере.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5 sm:p-6">
        <form className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Label
                htmlFor="paypal-amount"
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                Сумма
              </Label>
              <span className="text-xs font-medium text-muted-foreground">{currency}</span>
            </div>
            <Input
              id="paypal-amount"
              inputMode="decimal"
              placeholder="Например, 50.00"
              autoComplete="off"
              className="h-14 border-border/60 bg-background/80 text-xl font-semibold tracking-tight shadow-none placeholder:text-muted-foreground/50"
              {...form.register('amount')}
            />
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <p>Введите сумму в формате `50.00`</p>
              <p className="whitespace-nowrap">{formatPaymentAmount(50, currency)}</p>
            </div>
            {form.formState.errors.amount ? (
              <p className="mt-2 text-sm text-destructive">
                {form.formState.errors.amount.message}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Label
                htmlFor="paypal-description"
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                Описание платежа
              </Label>
              <span className="text-xs text-muted-foreground">До 127 символов</span>
            </div>
            <Textarea
              id="paypal-description"
              rows={4}
              placeholder={DEFAULT_DESCRIPTION}
              className="min-h-32 resize-none border-border/60 bg-background/80 text-base shadow-none placeholder:text-muted-foreground/50"
              {...form.register('description')}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Короткое назначение платежа поможет быстрее найти операцию в истории.
            </p>
            {form.formState.errors.description ? (
              <p className="mt-2 text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>
        </form>

        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-gradient-to-br from-muted/20 via-background to-muted/5 p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              К оплате
            </p>
            <p className="text-3xl font-semibold tracking-tight">{amountPreviewLabel}</p>
            <p className="text-sm text-muted-foreground">{descriptionPreviewLabel}</p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-border/70 bg-background/70 sm:w-auto"
            onClick={() => form.reset(DEFAULT_PAYMENT_VALUES)}
          >
            Очистить форму
          </Button>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 shadow-sm sm:p-5">
          <div className="space-y-1">
            <p className="text-sm font-medium">Способ оплаты</p>
            <p className="text-sm text-muted-foreground">
              Кнопка карты подходит для оплаты без аккаунта PayPal. При успешном подтверждении
              история обновится автоматически.
            </p>
          </div>

          <PayPalScriptProvider
            options={{
              clientId,
              currency,
              intent: 'capture',
              components: 'buttons,funding-eligibility'
            }}
          >
            <div className="mt-4 grid gap-3">
              {paymentMethods.map(method => (
                <div
                  key={method.key}
                  aria-busy={isRefreshing}
                  className={cn(
                    'rounded-[18px] bg-transparent py-0.5',
                    isRefreshing && 'pointer-events-none opacity-70 transition-opacity'
                  )}
                >
                  <PayPalButtons
                    fundingSource={method.fundingSource}
                    className="w-full"
                    style={method.style}
                    disabled={isRefreshing}
                    forceReRender={[
                      currency,
                      watchedAmount,
                      watchedDescription,
                      isDarkTheme,
                      method.key
                    ]}
                    onClick={async (_data, actions) => {
                      const isValid = await validateCheckout();

                      if (!isValid) {
                        return actions.reject();
                      }

                      return actions.resolve();
                    }}
                    createOrder={handleCreateOrder}
                    onApprove={async data => {
                      await handleApprove(data.orderID);
                    }}
                    onError={handleCheckoutError}
                  />
                </div>
              ))}
            </div>
          </PayPalScriptProvider>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
          После успешного подтверждения платёж появится в истории автоматически.
        </div>
      </CardContent>
    </Card>
  );
};
