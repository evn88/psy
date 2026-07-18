'use client';

import type { PaymentProviderCheckoutConfig } from '@/modules/payments/types';
import { PayPalCheckout } from '@/modules/payments/connectors/paypal/paypal-checkout';

interface PaymentProviderCheckoutProps {
  amount: string;
  config: PaymentProviderCheckoutConfig;
  currency: string;
  description: string;
  disabled: boolean;
  createOrder: () => Promise<string>;
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
      return <PayPalCheckout {...props} />;
    default:
      return (
        <p role="alert" className="text-sm text-destructive">
          Этот способ оплаты пока недоступен.
        </p>
      );
  }
};
