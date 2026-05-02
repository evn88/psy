'use client';

import { useTransition, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { FUNDING, PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { CreditCard, Wallet } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { formatPaymentAmount } from '@/modules/payments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DEFAULT_DESCRIPTION = 'Оплата услуг';

const paymentCheckoutSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Введите корректную сумму')
    .refine(value => Number(value) > 0, 'Сумма должна быть больше нуля'),
  description: z.string().trim().max(127, 'Описание не должно превышать 127 символов'),
  packageId: z.string().optional()
});

type PaymentCheckoutValues = z.infer<typeof paymentCheckoutSchema>;

interface PaymentCheckoutCardProps {
  clientId: string;
  currency: string;
  balance: string;
  packages: any[];
  locale: string;
}

export const PaymentCheckoutCard = ({
  clientId,
  currency,
  balance,
  packages,
  locale
}: PaymentCheckoutCardProps) => {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const [isRefreshing, startTransition] = useTransition();

  const [selectionType, setSelectionType] = useState<'package' | 'topup'>('package');

  const form = useForm<PaymentCheckoutValues>({
    resolver: zodResolver(paymentCheckoutSchema),
    mode: 'onChange',
    defaultValues: {
      amount: packages.length > 0 ? packages[0].amount.toString() : '',
      description:
        packages.length > 0
          ? packages[0].title[locale] || packages[0].title.ru || 'Пакет услуг'
          : DEFAULT_DESCRIPTION,
      packageId: packages.length > 0 ? packages[0].id : undefined
    }
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

  const handleSuccessfulCapture = () => {
    toast.success('Платёж успешно проведён');
    startTransition(() => {
      router.refresh();
    });
  };

  const validateCheckout = async () => {
    return form.trigger();
  };

  const handleCreateOrder = async () => {
    const isValid = await validateCheckout();

    if (!isValid) {
      throw new Error('FORM_INVALID');
    }

    const payloadBody = {
      amount: form.getValues('amount'),
      currency,
      description: form.getValues('description'),
      kind: selectionType === 'topup' ? 'TOPUP' : 'CHECKOUT',
      servicePackageId: form.getValues('packageId') || undefined
    };

    const response = await fetch('/api/payments/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payloadBody)
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

  const handleApprove = async (orderId: string) => {
    const response = await fetch(`/api/payments/orders/${orderId}/capture`, {
      method: 'POST'
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      throw new Error(payload.message || 'Не удалось завершить платёж');
    }

    handleSuccessfulCapture();
  };

  const handleCheckoutError = (error: unknown) => {
    if (error instanceof Error && error.message === 'FORM_INVALID') {
      return;
    }
    toast.error('Checkout завершился с ошибкой');
  };

  const selectPackage = (pkg: any) => {
    const title = pkg.title[locale] || pkg.title.ru || 'Пакет услуг';
    form.setValue('amount', pkg.amount.toString(), { shouldValidate: true });
    form.setValue('description', title, { shouldValidate: true });
    form.setValue('packageId', pkg.id);
  };

  return (
    <div className="space-y-6">
      {/* Баланс пользователя */}
      <Card className="border-border/70 bg-gradient-to-r from-primary/10 via-card to-card shadow-sm">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Текущий баланс</p>
              <h2 className="text-3xl font-bold tracking-tight">
                {formatPaymentAmount(balance, currency)}
              </h2>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="payment-checkout" className="border-border/70 bg-card shadow-sm">
        <CardHeader className="space-y-4 border-b border-border/60 bg-gradient-to-b from-muted/20 to-card pb-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background text-foreground shadow-sm ring-1 ring-border/60">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl">Оплата услуг</CardTitle>
              <CardDescription className="max-w-2xl">
                Выберите пакет консультаций или пополните баланс на произвольную сумму.
              </CardDescription>
            </div>
          </div>

          <Tabs
            value={selectionType}
            onValueChange={v => {
              setSelectionType(v as 'package' | 'topup');
              if (v === 'topup') {
                form.setValue('description', 'Пополнение баланса', { shouldValidate: true });
                form.setValue('packageId', undefined);
              } else if (packages.length > 0) {
                selectPackage(packages[0]);
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-2 max-w-sm">
              <TabsTrigger value="package">Выбрать пакет</TabsTrigger>
              <TabsTrigger value="topup">Пополнить баланс</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="space-y-5 p-5 sm:p-6">
          <form className="grid gap-4">
            {selectionType === 'package' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {packages.length === 0 && (
                  <p className="text-muted-foreground text-sm col-span-full">
                    Нет доступных пакетов для выбора.
                  </p>
                )}
                {packages.map(pkg => {
                  const title = pkg.title[locale] || pkg.title.ru || 'Пакет услуг';
                  const desc = pkg.description ? pkg.description[locale] || pkg.description.ru : '';
                  const isSelected = form.watch('packageId') === pkg.id;

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => selectPackage(pkg)}
                      className={cn(
                        'rounded-xl border p-4 cursor-pointer transition-all hover:border-primary shrink-0 relative flex flex-col',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border/60 bg-muted/10 text-muted-foreground'
                      )}
                    >
                      {pkg.coverImage && (
                        <div className="w-full h-24 mb-3 rounded-md overflow-hidden bg-muted">
                          <img
                            src={pkg.coverImage}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <h4
                        className={cn(
                          'font-semibold text-base mb-1',
                          isSelected ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {title}
                      </h4>
                      {desc && <p className="text-xs text-muted-foreground mb-3 flex-1">{desc}</p>}
                      <p
                        className={cn(
                          'text-lg font-bold',
                          isSelected ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {formatPaymentAmount(pkg.amount, pkg.currency)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {selectionType === 'topup' && (
              <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Label
                      htmlFor="payment-amount"
                      className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Сумма
                    </Label>
                    <span className="text-xs font-medium text-muted-foreground">{currency}</span>
                  </div>
                  <Input
                    id="payment-amount"
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
                  {form.formState.errors.amount && (
                    <p className="mt-2 text-sm text-destructive">
                      {form.formState.errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Label
                      htmlFor="payment-description"
                      className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Описание платежа
                    </Label>
                    <span className="text-xs text-muted-foreground">До 127 символов</span>
                  </div>
                  <Textarea
                    id="payment-description"
                    rows={4}
                    placeholder="Пополнение баланса"
                    className="min-h-32 resize-none border-border/60 bg-background/80 text-base shadow-none placeholder:text-muted-foreground/50"
                    {...form.register('description')}
                  />
                  <p className="mt-3 text-xs text-muted-foreground">
                    Короткое назначение платежа поможет быстрее найти операцию в истории.
                  </p>
                  {form.formState.errors.description && (
                    <p className="mt-2 text-sm text-destructive">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </form>

          <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-gradient-to-br from-muted/20 via-background to-muted/5 p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-5">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                К оплате
              </p>
              <p className="text-3xl font-semibold tracking-tight">{amountPreviewLabel}</p>
              <p className="text-sm text-muted-foreground">{descriptionPreviewLabel}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 shadow-sm sm:p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium">Способ оплаты</p>
              <p className="text-sm text-muted-foreground">
                При успешном подтверждении{' '}
                {selectionType === 'topup'
                  ? 'ваш баланс будет пополнен автоматически'
                  : 'история обновится автоматически'}
                .
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
        </CardContent>
      </Card>
    </div>
  );
};
