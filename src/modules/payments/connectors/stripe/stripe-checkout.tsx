'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import type { OrderResponse, StripeCheckoutConfig } from '@/modules/payments/types';

interface StripeCheckoutProps {
  amount: string;
  config: StripeCheckoutConfig;
  currency: string;
  description: string;
  disabled: boolean;
  createOrder: () => Promise<OrderResponse>;
  onApprove: (orderId: string) => Promise<void>;
  onError: (error: unknown) => void;
  validate: () => Promise<boolean>;
}

interface StripePaymentFormProps {
  disabled: boolean;
  orderId: string;
  onApprove: (orderId: string) => Promise<void>;
  onError: (error: unknown) => void;
}

const stripePromises = new Map<string, PromiseLike<Stripe | null>>();

const getStripePromise = (publishableKey: string): PromiseLike<Stripe | null> => {
  const existingPromise = stripePromises.get(publishableKey);

  if (existingPromise) {
    return existingPromise;
  }

  const stripePromise = loadStripe(publishableKey);
  stripePromises.set(publishableKey, stripePromise);
  return stripePromise;
};

const StripePaymentForm = ({ disabled, orderId, onApprove, onError }: StripePaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements || disabled) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href
        },
        redirect: 'if_required'
      });

      if (result.error) {
        throw new Error(result.error.message || 'Stripe не смог подтвердить платёж');
      }

      if (
        !result.paymentIntent ||
        !['requires_capture', 'succeeded'].includes(result.paymentIntent.status)
      ) {
        throw new Error('Платёж ожидает дополнительного подтверждения');
      }

      await onApprove(orderId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Не удалось завершить платёж';
      setErrorMessage(message);
      onError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-border/60 bg-background p-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={!stripe || disabled || isSubmitting}>
        <CreditCard className="h-4 w-4" aria-hidden />
        {isSubmitting ? 'Подтверждаем…' : 'Оплатить через Stripe'}
      </Button>
    </form>
  );
};

/**
 * Клиентский Stripe Payment Element, подключённый через provider-neutral контракт.
 */
export const StripeCheckout = ({
  amount,
  config,
  currency,
  description,
  disabled,
  createOrder,
  onApprove,
  onError,
  validate
}: StripeCheckoutProps) => {
  const { resolvedTheme } = useTheme();
  const [order, setOrder] = useState<{ clientSecret: string; id: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const checkoutSignature = `${config.id}:${amount}:${currency}:${description}`;

  useEffect(() => {
    setOrder(null);
  }, [checkoutSignature]);

  const preparePayment = async () => {
    if (!(await validate())) {
      return;
    }

    setIsCreating(true);

    try {
      const createdOrder = await createOrder();

      if (createdOrder.checkoutKind !== 'stripe-elements') {
        throw new Error('Unexpected checkout response for Stripe');
      }

      setOrder({ id: createdOrder.id, clientSecret: createdOrder.clientSecret });
    } catch (error: unknown) {
      onError(error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!order) {
    return (
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={disabled || isCreating}
        onClick={preparePayment}
      >
        <CreditCard className="h-4 w-4" aria-hidden />
        {isCreating ? 'Подготавливаем оплату…' : 'Продолжить с Stripe'}
      </Button>
    );
  }

  return (
    <Elements
      stripe={getStripePromise(config.publishableKey)}
      options={{
        clientSecret: order.clientSecret,
        appearance: {
          theme: resolvedTheme === 'dark' ? 'night' : 'stripe',
          variables: {
            borderRadius: '12px',
            colorPrimary: resolvedTheme === 'dark' ? '#ffffff' : '#18181b'
          }
        }
      }}
    >
      <StripePaymentForm
        disabled={disabled}
        orderId={order.id}
        onApprove={onApprove}
        onError={onError}
      />
    </Elements>
  );
};
