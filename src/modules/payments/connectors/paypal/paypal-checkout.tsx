'use client';

import {
  DISPATCH_ACTION,
  FUNDING,
  PayPalButtons,
  PayPalScriptProvider,
  usePayPalScriptReducer
} from '@paypal/react-paypal-js';
import { useEffect } from 'react';

import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import type { OrderResponse, PayPalCheckoutConfig } from '@/modules/payments/types';

interface PayPalCheckoutProps {
  amount: string;
  config: PayPalCheckoutConfig;
  currency: string;
  description: string;
  disabled: boolean;
  createOrder: () => Promise<OrderResponse>;
  onApprove: (orderId: string) => Promise<void>;
  onError: (error: unknown) => void;
  validate: () => Promise<boolean>;
}

const PAYMENT_METHODS = [
  { key: 'paypal', fundingSource: FUNDING.PAYPAL },
  { key: 'card', fundingSource: FUNDING.CARD }
] as const;

/**
 * Возвращает стили для кнопки PayPal в зависимости от темы и метода.
 */
const getPayPalButtonStyle = (fundingSource: string, isDarkTheme: boolean) => {
  const baseStyle = {
    borderRadius: 12,
    disableMaxWidth: true,
    height: 48,
    layout: 'horizontal' as const,
    shape: 'rect' as const,
    tagline: false
  };

  if (fundingSource === FUNDING.PAYPAL) {
    return {
      ...baseStyle,
      color: isDarkTheme ? ('black' as const) : ('blue' as const),
      label: 'paypal' as const
    };
  }

  return {
    ...baseStyle,
    color: 'black' as const
  };
};

const PayPalCurrencySync = ({ currency }: { currency: string }) => {
  const [{ options }, dispatch] = usePayPalScriptReducer();

  useEffect(() => {
    if (options.currency === currency) {
      return;
    }

    dispatch({
      type: DISPATCH_ACTION.RESET_OPTIONS,
      value: { ...options, currency }
    });
  }, [currency, dispatch, options]);

  return null;
};

/**
 * Клиентский renderer PayPal. SDK и funding sources не протекают в общий checkout.
 */
export const PayPalCheckout = ({
  amount,
  config,
  currency,
  description,
  disabled,
  createOrder,
  onApprove,
  onError
}: PayPalCheckoutProps) => {
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';

  const handleCreateOrder = async () => {
    const order = await createOrder();

    if (order.checkoutKind !== 'paypal') {
      throw new Error('Unexpected checkout response for PayPal');
    }

    return order.id;
  };

  const handleApprove = async (data: Record<string, unknown>) => {
    if (typeof data.orderID === 'string') {
      await onApprove(data.orderID);
    }
  };

  return (
    <PayPalScriptProvider
      options={{
        clientId: config.clientId,
        currency,
        intent: 'capture',
        components: 'buttons,funding-eligibility,card-fields'
      }}
    >
      <PayPalCurrencySync currency={currency} />

      <div className="relative z-0 isolate grid gap-3">
        {PAYMENT_METHODS.map(({ key, fundingSource }) => (
          <div
            key={key}
            aria-busy={disabled}
            className={cn('relative z-0 isolate', disabled && 'pointer-events-none opacity-70')}
          >
            <PayPalButtons
              fundingSource={fundingSource}
              className="w-full overflow-hidden rounded-xl [&_.paypal-buttons]:overflow-hidden [&_iframe]:rounded-xl [&_iframe]:[clip-path:inset(1px_round_11px)]"
              style={getPayPalButtonStyle(fundingSource, isDarkTheme)}
              disabled={disabled}
              forceReRender={[currency, amount, description, isDarkTheme, key, config.id]}
              createOrder={handleCreateOrder}
              onApprove={handleApprove}
              onError={onError}
            />
          </div>
        ))}
      </div>
    </PayPalScriptProvider>
  );
};
