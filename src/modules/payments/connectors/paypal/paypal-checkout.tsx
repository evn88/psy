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
  onError,
  validate
}: PayPalCheckoutProps) => {
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const paymentMethods = [
    {
      key: 'paypal',
      fundingSource: FUNDING.PAYPAL,
      style: {
        color: isDarkTheme ? 'black' : 'blue',
        borderRadius: 12,
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
        borderRadius: 12,
        disableMaxWidth: true,
        height: 48,
        layout: 'horizontal' as const,
        shape: 'rect' as const,
        tagline: false
      }
    }
  ] as const;

  return (
    <PayPalScriptProvider
      options={{
        clientId: config.clientId,
        currency,
        intent: 'capture',
        components: 'buttons,funding-eligibility'
      }}
    >
      <PayPalCurrencySync currency={currency} />
      <div className="grid gap-3">
        {paymentMethods.map(method => (
          <div
            key={method.key}
            aria-busy={disabled}
            className={cn(disabled && 'pointer-events-none opacity-70')}
          >
            <PayPalButtons
              fundingSource={method.fundingSource}
              className="w-full overflow-hidden rounded-xl [&_.paypal-buttons]:overflow-hidden [&_iframe]:rounded-xl [&_iframe]:[clip-path:inset(1px_round_11px)]"
              style={method.style}
              disabled={disabled}
              forceReRender={[currency, amount, description, isDarkTheme, method.key, config.id]}
              onClick={async (_data, actions) =>
                (await validate()) ? actions.resolve() : actions.reject()
              }
              createOrder={async () => {
                const order = await createOrder();

                if (order.checkoutKind !== 'paypal') {
                  throw new Error('Unexpected checkout response for PayPal');
                }

                return order.id;
              }}
              onApprove={async data => onApprove(data.orderID)}
              onError={onError}
            />
          </div>
        ))}
      </div>
    </PayPalScriptProvider>
  );
};
