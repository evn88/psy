'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  DISPATCH_ACTION,
  FUNDING,
  PayPalButtons,
  PayPalScriptProvider,
  usePayPalScriptReducer
} from '@paypal/react-paypal-js';
import { CreditCard, Wallet } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { formatPaymentAmount } from '@/modules/payments';

import type { PaymentServicePackage } from './payment-checkout.types';
import { getPaymentPackageTitle, PaymentPackageCard } from './payment-package-card';

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
  packages: PaymentServicePackage[];
  locale: string;
}

/**
 * Перезагружает PayPal SDK при смене валюты выбранного пакета.
 * @param props - актуальная валюта checkout.
 */
const PayPalCurrencySync = ({ currency }: { currency: string }) => {
  const [{ options }, dispatch] = usePayPalScriptReducer();

  useEffect(() => {
    if (options.currency === currency) {
      return;
    }

    dispatch({
      type: DISPATCH_ACTION.RESET_OPTIONS,
      value: {
        ...options,
        currency
      }
    });
  }, [currency, dispatch, options]);

  return null;
};

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

  const [watchedAmount, watchedDescription, watchedPackageId] = useWatch({
    control: form.control,
    name: ['amount', 'description', 'packageId']
  });

  const selectedPackageCurrency = packages.find(
    paymentPackage => paymentPackage.id === watchedPackageId
  )?.currency;
  const checkoutCurrency =
    selectionType === 'package' && selectedPackageCurrency
      ? selectedPackageCurrency.toUpperCase()
      : currency.toUpperCase();
  const amountPreviewValue = watchedAmount ?? '';
  const descriptionPreviewValue = (watchedDescription ?? '').trim();
  const amountPreviewLabel = paymentCheckoutSchema.shape.amount.safeParse(amountPreviewValue)
    .success
    ? formatPaymentAmount(amountPreviewValue, checkoutCurrency)
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

  const selectPackage = (pkg: PaymentServicePackage) => {
    const title = getPaymentPackageTitle(pkg, locale);
    form.setValue('amount', pkg.amount.toString(), { shouldValidate: true });
    form.setValue('description', title, { shouldValidate: true });
    form.setValue('packageId', pkg.id);
  };

  return (
    <div className="space-y-8">
      {/* Баланс пользователя */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/95 to-card/70 p-6 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute left-1/4 bottom-0 -ml-16 -mb-16 h-28 w-28 rounded-full bg-blue-500/5 blur-2xl" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
              <Wallet className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Текущий баланс
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight mt-1 bg-gradient-to-r from-foreground to-foreground/85 bg-clip-text">
                {formatPaymentAmount(balance, currency)}
              </h2>
            </div>
          </div>
        </div>
      </div>

      <Card
        id="payment-checkout"
        className="border-border/50 bg-card shadow-sm rounded-2xl overflow-hidden"
      >
        <CardHeader className="space-y-5 border-b border-border/40 bg-gradient-to-b from-muted/20 to-card p-6 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
              <CreditCard className="h-5 w-5" aria-hidden />
            </div>
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-lg font-bold">Оплата услуг</CardTitle>
              <CardDescription className="max-w-2xl text-xs leading-relaxed text-muted-foreground/80">
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
            <TabsList className="grid w-full grid-cols-2 max-w-sm rounded-xl bg-muted/60 p-1 border border-border/40">
              <TabsTrigger value="package" className="rounded-lg text-xs font-semibold">
                Выбрать пакет
              </TabsTrigger>
              <TabsTrigger value="topup" className="rounded-lg text-xs font-semibold">
                Пополнить баланс
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <form className="grid gap-4">
            {selectionType === 'package' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-2">
                {packages.length === 0 && (
                  <p className="text-muted-foreground text-sm col-span-full py-4 text-center">
                    Нет доступных пакетов для выбора.
                  </p>
                )}
                {packages.map(pkg => (
                  <PaymentPackageCard
                    key={pkg.id}
                    isSelected={watchedPackageId === pkg.id}
                    locale={locale}
                    onSelect={selectPackage}
                    pkg={pkg}
                  />
                ))}
              </div>
            )}

            {selectionType === 'topup' && (
              <div className="grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="rounded-2xl border border-border/50 bg-muted/5 p-5 shadow-sm hover:border-primary/20 transition-colors">
                  <div className="mb-3.5 flex items-center justify-between gap-3">
                    <Label
                      htmlFor="payment-amount"
                      className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80"
                    >
                      Сумма
                    </Label>
                    <span className="text-xs font-bold text-primary">{currency}</span>
                  </div>
                  <Input
                    id="payment-amount"
                    inputMode="decimal"
                    placeholder="Например, 50.00"
                    autoComplete="off"
                    className="h-14 rounded-xl border-border/60 bg-muted/5 focus-visible:ring-primary/20 text-xl font-bold tracking-tight shadow-inner placeholder:text-muted-foreground/40 transition-all"
                    {...form.register('amount')}
                  />
                  <div className="mt-3.5 flex items-center justify-between gap-3 text-[11px] text-muted-foreground/75 leading-relaxed">
                    <p>Введите сумму в формате `50.00`</p>
                    <p className="font-semibold">{formatPaymentAmount(50, currency)}</p>
                  </div>
                  {form.formState.errors.amount && (
                    <p className="mt-2 text-xs font-bold text-destructive">
                      {form.formState.errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-border/50 bg-muted/5 p-5 shadow-sm hover:border-primary/20 transition-colors">
                  <div className="mb-3.5 flex items-center justify-between gap-3">
                    <Label
                      htmlFor="payment-description"
                      className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80"
                    >
                      Описание платежа
                    </Label>
                    <span className="text-xs text-muted-foreground/70">До 127 символов</span>
                  </div>
                  <Textarea
                    id="payment-description"
                    rows={4}
                    placeholder="Пополнение баланса"
                    className="min-h-32 resize-none rounded-xl border-border/60 bg-muted/5 focus-visible:ring-primary/20 text-sm shadow-inner placeholder:text-muted-foreground/40 transition-all"
                    {...form.register('description')}
                  />
                  <p className="mt-3.5 text-[11px] text-muted-foreground/75 leading-relaxed">
                    Короткое назначение платежа поможет быстрее найти операцию в истории.
                  </p>
                  {form.formState.errors.description && (
                    <p className="mt-2 text-xs font-bold text-destructive">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </form>

          <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between transition-all">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                К оплате
              </p>
              <p className="text-3xl font-extrabold tracking-tight text-primary">
                {amountPreviewLabel}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {descriptionPreviewLabel}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-muted/5 p-5 shadow-sm hover:border-primary/20 transition-colors">
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground/90">Способ оплаты</p>
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
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
                currency: checkoutCurrency,
                intent: 'capture',
                components: 'buttons,funding-eligibility'
              }}
            >
              <PayPalCurrencySync currency={checkoutCurrency} />
              <div className="mt-5 grid gap-3">
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
                        checkoutCurrency,
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
