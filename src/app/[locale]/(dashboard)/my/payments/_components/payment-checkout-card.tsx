'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CheckCircle2, CreditCard, Wallet } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from '@/i18n/navigation';
import { formatPaymentAmount } from '@/modules/payments';
import { PaymentProviderCheckout } from '@/modules/payments/components/payment-provider-checkout';
import type { OrderResponse, PaymentProviderCheckoutConfig } from '@/modules/payments/types';

import { purchasePackageFromBalanceAction } from '../actions';
import type { PaymentServicePackage } from './payment-checkout.types';
import { getPaymentPackageTitle, PaymentPackageCard } from './payment-package-card';

const DEFAULT_DESCRIPTION = 'Оплата услуг';
const topUpAmounts = ['25', '50', '100', '150'];

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
type SelectionType = 'package' | 'topup';

interface PaymentCheckoutCardProps {
  currency: string;
  balance: string;
  packages: PaymentServicePackage[];
  locale: string;
  providerConfigs: PaymentProviderCheckoutConfig[];
}

/**
 * Управляет выбором способа оплаты и передаёт подтверждённые параметры в подключённый checkout.
 */
export const PaymentCheckoutCard = ({
  currency,
  balance,
  packages,
  locale,
  providerConfigs
}: PaymentCheckoutCardProps) => {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [isBalancePurchasePending, startBalancePurchaseTransition] = useTransition();
  const [selectionType, setSelectionType] = useState<SelectionType>('package');
  const [providerId, setProviderId] = useState(providerConfigs[0]?.id ?? '');

  const form = useForm<PaymentCheckoutValues>({
    resolver: zodResolver(paymentCheckoutSchema),
    mode: 'onChange',
    defaultValues: {
      amount: packages[0]?.amount ?? '',
      description: packages[0] ? getPaymentPackageTitle(packages[0], locale) : DEFAULT_DESCRIPTION,
      packageId: packages[0]?.id
    }
  });

  const [watchedAmount, watchedDescription, watchedPackageId] = useWatch({
    control: form.control,
    name: ['amount', 'description', 'packageId']
  });

  const availableProviders = providerConfigs.filter(provider =>
    provider.supportedCurrencies.includes(currency)
  );
  const activeProvider =
    availableProviders.find(provider => provider.id === providerId) ?? availableProviders[0];
  const selectedPackage = packages.find(pkg => pkg.id === watchedPackageId);
  const selectedPackageAmount = Number(selectedPackage?.amount ?? 0);
  const balanceValue = Number(balance);
  const amountPreviewValue = watchedAmount ?? '';
  const hasValidAmount = paymentCheckoutSchema.shape.amount.safeParse(amountPreviewValue).success;
  const amountPreviewLabel = hasValidAmount
    ? formatPaymentAmount(amountPreviewValue, currency)
    : 'Выберите сумму';
  const title =
    selectionType === 'package' && selectedPackage
      ? getPaymentPackageTitle(selectedPackage, locale)
      : 'Пополнение баланса';
  const canPurchaseFromBalance =
    selectionType === 'package' && balanceValue >= selectedPackageAmount;
  const balanceShortfall = Math.max(selectedPackageAmount - balanceValue, 0);
  const canCheckoutOnline = selectionType === 'topup' ? hasValidAmount : Boolean(selectedPackage);

  const handleSuccessfulCapture = () => {
    toast.success('Платёж успешно проведён');
    startTransition(() => {
      router.refresh();
    });
  };

  const validateCheckout = async () => form.trigger();

  const handleCreateOrder = async () => {
    const isValid = await validateCheckout();

    if (!isValid) {
      throw new Error('FORM_INVALID');
    }

    const response = await fetch('/api/payments/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: form.getValues('amount'),
        description: form.getValues('description'),
        kind: selectionType === 'topup' ? 'TOPUP' : 'CHECKOUT',
        provider: activeProvider?.id,
        servicePackageId: form.getValues('packageId') || undefined
      })
    });
    const payload = (await response.json()) as Partial<OrderResponse> & { message?: string };

    if (!response.ok || !payload.id || !payload.checkoutKind || !payload.status) {
      throw new Error(payload.message || 'Не удалось создать платёжный order');
    }
    if (payload.checkoutKind === 'stripe-elements' && !payload.clientSecret) {
      throw new Error('Платёжный провайдер не вернул client secret');
    }

    return payload as OrderResponse;
  };

  const handleApprove = async (orderId: string) => {
    const response = await fetch(`/api/payments/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: activeProvider?.id })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      throw new Error(payload.message || 'Не удалось завершить платёж');
    }

    handleSuccessfulCapture();
  };

  const handleCheckoutError = (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('FORM_INVALID')) {
      return;
    }
    toast.error('Не удалось завершить оплату. Попробуйте ещё раз.');
  };

  const selectPackage = (pkg: PaymentServicePackage) => {
    form.setValue('amount', pkg.amount, { shouldValidate: true });
    form.setValue('description', getPaymentPackageTitle(pkg, locale), { shouldValidate: true });
    form.setValue('packageId', pkg.id);
  };

  const changeSelectionType = (value: string) => {
    const nextSelectionType: SelectionType = value === 'topup' ? 'topup' : 'package';
    setSelectionType(nextSelectionType);

    if (nextSelectionType === 'topup') {
      form.setValue('amount', '', { shouldValidate: false });
      form.setValue('description', 'Пополнение баланса', { shouldValidate: true });
      form.setValue('packageId', undefined);
      return;
    }

    if (packages[0]) {
      selectPackage(packages[0]);
    }
  };

  const purchaseFromBalance = () => {
    if (!selectedPackage) {
      return;
    }

    startBalancePurchaseTransition(async () => {
      const result = await purchasePackageFromBalanceAction(
        selectedPackage.id,
        crypto.randomUUID()
      );

      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <section aria-labelledby="payment-flow-title">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-5 py-5 sm:px-6">
          <p className="text-sm font-medium text-primary">Оплата</p>
          <h2 id="payment-flow-title" className="mt-1 text-xl font-semibold tracking-tight">
            Что вы хотите сделать?
          </h2>
        </div>

        <Tabs value={selectionType} onValueChange={changeSelectionType} className="w-full">
          <div className="border-b px-5 py-3 sm:px-6">
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg bg-muted/70 p-1 sm:max-w-md">
              <TabsTrigger value="package" className="min-h-11 rounded-md px-3 text-sm">
                Купить пакет
              </TabsTrigger>
              <TabsTrigger value="topup" className="min-h-11 rounded-md px-3 text-sm">
                Пополнить баланс
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="package" className="m-0 p-5 sm:p-6">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div>
                <div className="mb-4">
                  <h3 className="font-semibold">Выберите пакет</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Пакет закрепляет время консультаций за вами и помогает планировать встречи.
                  </p>
                </div>
                {packages.length ? (
                  <div className="grid gap-3" aria-label="Доступные пакеты">
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
                ) : (
                  <p className="rounded-xl bg-muted/50 px-4 py-5 text-sm leading-6 text-muted-foreground">
                    Сейчас нет доступных пакетов. Вы можете пополнить баланс для оплаты услуг.
                  </p>
                )}
              </div>

              <aside
                className="self-start rounded-xl bg-muted/45 p-5 lg:sticky lg:top-6"
                aria-live="polite"
              >
                <p className="text-sm font-medium text-muted-foreground">Ваш выбор</p>
                {selectedPackage ? (
                  <>
                    <p className="mt-2 text-lg font-semibold leading-6">{title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedPackage.includedMinutes} минут консультаций
                    </p>
                    <div className="my-5 border-t" />
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Стоимость</span>
                      <span className="text-xl font-semibold tabular-nums">
                        {formatPaymentAmount(selectedPackage.amount, currency)}
                      </span>
                    </div>
                    {canPurchaseFromBalance ? (
                      <Button
                        type="button"
                        className="mt-5 min-h-11 w-full"
                        disabled={isBalancePurchasePending}
                        onClick={purchaseFromBalance}
                      >
                        <Wallet aria-hidden />
                        {isBalancePurchasePending ? 'Покупаем…' : 'Оплатить с баланса'}
                      </Button>
                    ) : (
                      <p className="mt-5 text-sm leading-6 text-muted-foreground">
                        На балансе не хватает {formatPaymentAmount(balanceShortfall, currency)}.
                        Выберите онлайн-оплату ниже.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Выберите пакет, чтобы увидеть условия оплаты.
                  </p>
                )}
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="topup" className="m-0 p-5 sm:p-6">
            <div className="max-w-xl">
              <div className="mb-5">
                <h3 className="font-semibold">Сумма пополнения</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Выберите сумму, которая будет зачислена на баланс после подтверждения платежа.
                </p>
              </div>
              <Label htmlFor="payment-amount" className="sr-only">
                Сумма пополнения в {currency}
              </Label>
              <div className="flex rounded-xl border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <Input
                  id="payment-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  autoComplete="off"
                  className="h-14 border-0 bg-transparent text-xl font-semibold tabular-nums shadow-none focus-visible:ring-0"
                  aria-describedby={
                    form.formState.errors.amount ? 'payment-amount-error' : undefined
                  }
                  {...form.register('amount')}
                />
                <span className="flex items-center pr-4 text-sm font-medium text-muted-foreground">
                  {currency}
                </span>
              </div>
              {form.formState.errors.amount ? (
                <p id="payment-amount-error" className="mt-2 text-sm text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Быстрый выбор суммы">
                {topUpAmounts.map(amount => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    className="min-h-10 rounded-lg tabular-nums"
                    onClick={() => form.setValue('amount', amount, { shouldValidate: true })}
                  >
                    {formatPaymentAmount(amount, currency)}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t bg-muted/20 px-5 py-6 sm:px-6">
          <div
            className={
              selectionType === 'topup' && !hasValidAmount
                ? 'grid gap-5'
                : 'grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]'
            }
          >
            <div>
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <CreditCard className="size-4" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold">Подтвердите оплату</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Выберите способ оплаты. После успешного платежа баланс и история обновятся
                    автоматически.
                  </p>
                </div>
              </div>

              {activeProvider && canCheckoutOnline ? (
                <Tabs value={activeProvider.id} onValueChange={setProviderId} className="mt-5">
                  <TabsList
                    className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg border bg-background p-1 sm:w-fit"
                    aria-label="Способ оплаты"
                  >
                    {availableProviders.map(provider => (
                      <TabsTrigger
                        key={provider.id}
                        value={provider.id}
                        className="min-h-10 min-w-fit rounded-md px-4 text-sm"
                      >
                        {provider.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value={activeProvider.id} className="mt-4 max-w-xl">
                    <PaymentProviderCheckout
                      amount={watchedAmount ?? ''}
                      config={activeProvider}
                      currency={currency}
                      description={watchedDescription ?? ''}
                      disabled={isRefreshing}
                      createOrder={handleCreateOrder}
                      onApprove={handleApprove}
                      onError={handleCheckoutError}
                      validate={validateCheckout}
                    />
                  </TabsContent>
                </Tabs>
              ) : activeProvider ? (
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  {selectionType === 'topup'
                    ? 'Сначала укажите сумму пополнения.'
                    : 'Сначала выберите пакет, чтобы перейти к оплате.'}
                </p>
              ) : canCheckoutOnline ? (
                <p role="alert" className="mt-5 text-sm leading-6 text-muted-foreground">
                  Онлайн-оплата временно недоступна. Пожалуйста, попробуйте позже.
                </p>
              ) : (
                <p role="alert" className="mt-5 text-sm leading-6 text-muted-foreground">
                  Онлайн-оплата временно недоступна. Пожалуйста, попробуйте позже.
                </p>
              )}
            </div>

            {selectionType !== 'topup' || hasValidAmount ? (
              <div className="self-start rounded-xl border bg-card p-5">
                <p className="text-sm font-medium text-muted-foreground">
                  {selectionType === 'topup' ? 'К оплате' : 'К оплате онлайн'}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                  {amountPreviewLabel}
                </p>
                <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  Платёж обрабатывается защищённым платёжным провайдером.
                </p>
                {selectionType === 'package' && selectedPackage ? (
                  <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-muted-foreground">
                    <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    Пакет будет доступен сразу после подтверждения.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};
