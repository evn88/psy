'use client';

import { PayPalCheckout } from '@/modules/payments/connectors/paypal/paypal-checkout';
import { StripeCheckout } from '@/modules/payments/connectors/stripe/stripe-checkout';
import type { OrderResponse, PaymentProviderCheckoutConfig } from '@/modules/payments/types';

interface PaymentProviderCheckoutProps {
  amount: string;
  config: PaymentProviderCheckoutConfig;
  currency: string;
  description: string;
  disabled: boolean;
  createOrder: () => Promise<OrderResponse>;
  onApprove: (orderId: string) => Promise<void>;
  onError: (error: unknown) => void;
  validate: () => Promise<boolean>;
}

/**
 * Provider-neutral точка подключения клиентских checkout-renderers.
 */
export const PaymentProviderCheckout = (props: PaymentProviderCheckoutProps) => {
  switch (props.config.checkoutKind) {
    case 'paypal':
      return <PayPalCheckout {...props} config={props.config} />;
    case 'stripe-elements':
      return <StripeCheckout {...props} config={props.config} />;
    default:
      return (
        <p role="alert" className="text-sm text-destructive">
          Этот способ оплаты пока недоступен.
        </p>
      );
  }
};
