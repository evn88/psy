'use client';

import { useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard } from 'lucide-react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useRouter } from '@/i18n/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatPaymentAmount } from '@/shared/lib/payments';

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
 * Карточка checkout-оплаты через PayPal для личного кабинета.
 */
export const PayPalCheckoutCard = ({ clientId, currency }: PayPalCheckoutCardProps) => {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const form = useForm<PaymentCheckoutValues>({
    resolver: zodResolver(paymentCheckoutSchema),
    mode: 'onChange',
    defaultValues: {
      amount: '',
      description: 'Оплата консультации'
    }
  });
  const [watchedAmount, watchedDescription] = useWatch({
    control: form.control,
    name: ['amount', 'description']
  });

  const handleSuccessfulCapture = () => {
    toast.success('Платёж успешно проведён');
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Оплатить через PayPal
        </CardTitle>
        <CardDescription>
          PayPal используется только как checkout UI. Создание и capture order выполняются на
          сервере.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <form className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="paypal-amount">Сумма</Label>
            <Input
              id="paypal-amount"
              inputMode="decimal"
              placeholder="Например, 50.00"
              {...form.register('amount')}
            />
            <p className="text-xs text-muted-foreground">
              Валюта платежа: {currency}. Пример: {formatPaymentAmount(50, currency)}
            </p>
            {form.formState.errors.amount ? (
              <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paypal-description">Описание платежа</Label>
            <Textarea
              id="paypal-description"
              rows={3}
              placeholder="Оплата консультации"
              {...form.register('description')}
            />
            {form.formState.errors.description ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>
        </form>

        <PayPalScriptProvider
          options={{
            clientId,
            currency,
            intent: 'capture',
            components: 'buttons'
          }}
        >
          <div className={isRefreshing ? 'pointer-events-none opacity-70 transition-opacity' : ''}>
            <PayPalButtons
              style={{
                layout: 'vertical',
                shape: 'rect',
                label: 'paypal'
              }}
              disabled={!form.formState.isValid}
              forceReRender={[currency, watchedAmount, watchedDescription]}
              createOrder={async () => {
                const isValid = await form.trigger();

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
              }}
              onApprove={async data => {
                const response = await fetch(`/api/paypal/orders/${data.orderID}/capture`, {
                  method: 'POST'
                });

                if (!response.ok) {
                  const payload = (await response.json()) as { message?: string };
                  throw new Error(payload.message || 'Не удалось завершить платёж');
                }

                handleSuccessfulCapture();
              }}
              onError={error => {
                if (error instanceof Error && error.message === 'FORM_INVALID') {
                  return;
                }

                toast.error('PayPal checkout завершился с ошибкой');
                console.error('PayPal checkout failed:', error);
              }}
            />
          </div>
        </PayPalScriptProvider>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => form.reset({ amount: '', description: 'Оплата консультации' })}
          >
            Очистить форму
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
