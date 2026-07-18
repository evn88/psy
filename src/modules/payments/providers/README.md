# Добавление платёжного провайдера

Эта папка содержит application-адаптеры внешних платёжных систем. Каждый адаптер реализует
общий контракт `IPaymentService`, а устанавливаемый коннектор в `../connectors/<provider>`
описывает возможности провайдера, настройки админки, health check и клиентский checkout.

Ниже приведён порядок подключения нового провайдера на примере установленного Stripe-коннектора.
Stripe уже реализует этот контракт и служит рабочим эталоном: при добавлении следующего провайдера
копируйте структуру и гарантии, но не Stripe-specific API и статусы.

## Границы модулей

```text
src/modules/payments/
  providers/
    stripe-service.ts                 # реализация IPaymentService
  stripe/
    client.server.ts                  # инициализация Stripe SDK и запросы
    mappers.ts                        # minor units и нормализация статусов
    service.server.ts                 # синхронизация Payment/PaymentEvent/PaymentDispute
  connectors/
    stripe/
      connector.server.ts             # metadata, settings, health check
      constants.ts                    # ID и поддерживаемые валюты
      stripe-checkout.tsx             # Stripe Elements или Embedded Checkout
  components/
    payment-provider-checkout.tsx     # выбор renderer по checkoutKind
src/app/api/payments/webhooks/stripe/
  route.ts                            # проверка подписи и обработка webhook
```

Правила зависимостей:

- общие страницы и Route Handlers работают через `IPaymentService` и registry;
- Stripe SDK импортируется только из Stripe-specific файлов;
- `connector.server.ts` и файлы с секретами никогда не импортируются в Client Components;
- клиент получает только publishable key и `clientSecret`, ограниченный конкретным PaymentIntent;
- секретный ключ, webhook secret и полные объекты Stripe не передаются в браузер;
- provider-specific статусы преобразуются в общие статусы приложения до записи в `Payment`.

## 1. Выбрать Stripe flow

Для текущего контракта проекта удобнее использовать Stripe Payment Intents + Payment Element:

1. Сервер создаёт один `PaymentIntent` на одну локальную попытку оплаты.
2. Клиент подтверждает PaymentIntent через Stripe Elements и обрабатывает 3D Secure.
3. При `capture_method: 'manual'` клиент вызывает существующий capture Route Handler после того,
   как PaymentIntent перешёл в `requires_capture`.
4. Webhook остаётся источником асинхронной сверки и восстанавливает состояние после закрытия
   вкладки, сетевой ошибки или повторной доставки события.

Если отдельный серверный capture не нужен, можно использовать автоматический capture. В таком
случае `captureOrder()` должен быть идемпотентной синхронизацией, а не повторной попыткой списания.

Официальные материалы:

- [Payment Intents](https://docs.stripe.com/payments/payment-intents)
- [Payment Element](https://docs.stripe.com/payments/payment-element)
- [Жизненный цикл PaymentIntent](https://docs.stripe.com/payments/paymentintents/lifecycle)
- [Проверка webhook](https://docs.stripe.com/webhooks)
- [Идемпотентные запросы](https://docs.stripe.com/api/idempotent_requests)

## 2. Добавить зависимости и переменные окружения

Для Stripe используются официальные зависимости, зафиксированные в lock-файле:

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

Ожидаемые переменные:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Нельзя сохранять эти значения в `PaymentProviderConfig.settings`. В базе хранятся только
несекретные управляемые настройки, например валюта по умолчанию или включённые способы оплаты.

## 3. Расширить универсальные checkout-типы

`PaymentProviderCheckoutConfig` реализован как discriminated union. Для нового renderer добавляйте
отдельный вариант, не превращая provider-specific поля в optional-поля общего типа.

Пример целевой формы в `../types.ts`:

```ts
interface PaymentProviderCheckoutConfigBase {
  id: PaymentProviderId;
  label: string;
  defaultCurrency: string;
  supportedCurrencies: string[];
  capabilities: PaymentProviderCapability[];
}

export interface PayPalCheckoutConfig extends PaymentProviderCheckoutConfigBase {
  checkoutKind: 'paypal';
  clientId: string;
}

export interface StripeCheckoutConfig extends PaymentProviderCheckoutConfigBase {
  checkoutKind: 'stripe-elements';
  publishableKey: string;
}

export type PaymentProviderCheckoutConfig = PayPalCheckoutConfig | StripeCheckoutConfig;
```

Stripe Elements требует `clientSecret`, поэтому результат создания внешней операции также должен
быть discriminated union:

```ts
export type OrderResponse =
  | {
      checkoutKind: 'paypal';
      id: string;
      status: string;
    }
  | {
      checkoutKind: 'stripe-elements';
      id: string;
      status: string;
      clientSecret: string;
    };
```

После этого `/api/payments/orders` возвращает безопасный вариант union, а каждый checkout renderer
сам адаптирует его к своему SDK. Нельзя логировать Stripe `clientSecret`, добавлять его в URL или
сохранять в analytics.

Также нужно:

- добавить `checkoutKind: 'paypal'` в результат `PayPalService.createOrder()`;
- вернуть из `/api/payments/orders` весь проверенный `OrderResponse`, включая Stripe
  `clientSecret`;
- изменить клиентский `createOrder`, чтобы он возвращал union, а не только строковый ID;
- проверить, что системные логи не сохраняют тело ответа с `clientSecret`.

## 4. Создать Stripe SDK adapter

`../stripe/client.server.ts` является server-only модулем. Клиент создаётся лениво, чтобы
установленный, но ещё не настроенный коннектор не ломал импорт registry.

```ts
import 'server-only';

import Stripe from 'stripe';

const getStripeSecretKey = (): string => {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  return secretKey;
};

export const stripe = new Stripe(getStripeSecretKey(), {
  maxNetworkRetries: 2
});
```

Версию Stripe API следует зафиксировать осознанно после установки SDK и проверки changelog. Не
копируйте случайную версию API из примера в интернете.

## 5. Реализовать StripeService

Создайте `stripe-service.ts`:

```ts
import { randomUUID } from 'node:crypto';

import type {
  CaptureOrderParams,
  CreateOrderParams,
  IPaymentService,
  OrderResponse,
  SyncPaymentParams
} from '@/modules/payments/types';
import { STRIPE_SUPPORTED_CURRENCIES } from '@/modules/payments/connectors/stripe/constants';
import { stripe } from '@/modules/payments/stripe/client.server';
import {
  convertToMinorUnits,
  normalizeStripePaymentStatus
} from '@/modules/payments/stripe/mappers';
import {
  syncPaymentFromStripe,
  syncPaymentWithStripe
} from '@/modules/payments/stripe/service.server';

export const STRIPE_PROVIDER_ID = 'STRIPE' as const;

export class StripeService implements IPaymentService {
  get providerName(): string {
    return STRIPE_PROVIDER_ID;
  }

  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    const paymentId = randomUUID();
    const amount = convertToMinorUnits(params.amount, params.currency);
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: params.currency.toLowerCase(),
        capture_method: 'manual',
        automatic_payment_methods: { enabled: true },
        description: params.description,
        metadata: {
          paymentId,
          userId: params.userId,
          kind: params.kind ?? 'CHECKOUT',
          servicePackageId: params.servicePackageId ?? ''
        }
      },
      {
        idempotencyKey: paymentId
      }
    );

    await syncPaymentFromStripe({
      paymentId,
      paymentIntent,
      userId: params.userId,
      kind: params.kind,
      servicePackageId: params.servicePackageId
    });

    if (!paymentIntent.client_secret) {
      throw new Error(`Stripe did not return clientSecret for ${paymentIntent.id}`);
    }

    return {
      checkoutKind: 'stripe-elements',
      id: paymentIntent.id,
      status: normalizeStripePaymentStatus(paymentIntent.status),
      clientSecret: paymentIntent.client_secret
    };
  }

  async captureOrder({ orderId }: CaptureOrderParams): Promise<void> {
    const paymentIntent = await stripe.paymentIntents.retrieve(orderId);

    if (paymentIntent.status === 'requires_capture') {
      const capturedIntent = await stripe.paymentIntents.capture(
        orderId,
        {},
        {
          idempotencyKey: `capture:${orderId}`
        }
      );
      await syncPaymentFromStripe({ paymentIntent: capturedIntent });
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      await syncPaymentFromStripe({ paymentIntent });
      return;
    }

    throw new Error(`Stripe PaymentIntent ${orderId} is not capturable`);
  }

  supportsCurrency(currency: string): boolean {
    return STRIPE_SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
  }

  async syncPayment(payment: SyncPaymentParams) {
    return syncPaymentWithStripe(payment);
  }
}
```

В примере намеренно не приведена реализация `convertToMinorUnits`,
`normalizeStripePaymentStatus` и sync-функций: это финансово-критичная логика, для которой
обязательны отдельные unit-тесты.

### Денежные суммы

Stripe принимает целое число в минимальных единицах валюты. Нельзя всегда умножать сумму на 100:
существуют zero-decimal и другие особые валюты. Утилита преобразования должна:

- принимать строку и ISO-код валюты;
- использовать `Prisma.Decimal`, а не JavaScript `number`;
- учитывать exponent валюты;
- отклонять дробную часть, недопустимую для выбранной валюты;
- проверять границы до обращения к Stripe.

## 6. Нормализовать статусы и локальные идентификаторы

Рекомендуемое отображение статусов Stripe:

| Stripe PaymentIntent      | Payment.status          |
| ------------------------- | ----------------------- |
| `requires_payment_method` | `CREATED`               |
| `requires_confirmation`   | `SAVED`                 |
| `requires_action`         | `PAYER_ACTION_REQUIRED` |
| `processing`              | `PENDING`               |
| `requires_capture`        | `APPROVED`              |
| `succeeded`               | `COMPLETED`             |
| `canceled`                | `CANCELLED`             |

Идентификаторы в `Payment`:

- `provider`: `STRIPE`;
- `orderId`: ID PaymentIntent (`pi_...`);
- `captureId`: ID Charge (`ch_...`), если он доступен;
- `invoiceId`: ID Stripe Invoice только для subscription flow;
- `rawOrder`: сериализованный PaymentIntent;
- `rawCapture`: сериализованный Charge;
- `payerEmail`: email из receipt/customer details, если он действительно доступен.

В `metadata` Stripe передавайте только внутренние ссылки, необходимые для сверки. Не передавайте
медицинские сведения, полные описания терапии, платёжные реквизиты или другие чувствительные данные.

## 7. Реализовать синхронизацию

`../stripe/service.server.ts` должен повторять гарантии PayPal sync-слоя:

- поиск по `paymentId`, затем по составным ключам `provider + orderId/captureId`;
- идемпотентный upsert локального `Payment`;
- начисление баланса только один раз через `balanceCreditedAt`;
- частичный и полный возврат через `refundedAmount`;
- короткие транзакции с `Serializable` и retry конфликта;
- сохранение безопасной копии provider payload в `Json`;
- отдельная обработка dispute;
- отсутствие сетевых запросов внутри транзакции БД.

Не вызывайте PayPal-specific функции из Stripe-кода. Общую финансовую транзакционную логику можно
выделять только после появления второго рабочего провайдера и подтверждения одинаковой семантики.

## 8. Создать Stripe connector

`../connectors/stripe/connector.server.ts`:

```ts
import { z } from 'zod';

import { StripeService, STRIPE_PROVIDER_ID } from '@/modules/payments/providers/stripe-service';
import { stripe } from '@/modules/payments/stripe/client.server';

import type { PaymentConnector } from '../types';
import { STRIPE_SUPPORTED_CURRENCIES } from './constants';

const stripeSettingsSchema = z.object({
  defaultCurrency: z
    .string()
    .trim()
    .length(3)
    .transform(value => value.toUpperCase())
    .refine(
      value => STRIPE_SUPPORTED_CURRENCIES.includes(value),
      'Currency is not supported by Stripe'
    )
});

export const stripeConnector: PaymentConnector = {
  metadata: {
    id: STRIPE_PROVIDER_ID,
    label: 'Stripe',
    description: 'Оплата картами через Stripe Payment Element.',
    capabilities: ['card', 'checkout', 'refund', 'sync', 'topup', 'webhook'],
    requiredEnvironmentVariables: [
      'STRIPE_SECRET_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ],
    supportedCurrencies: STRIPE_SUPPORTED_CURRENCIES,
    settingsFields: [
      {
        key: 'defaultCurrency',
        label: 'Валюта по умолчанию',
        description: 'Используется для пополнения баланса.',
        type: 'text'
      }
    ]
  },
  settingsSchema: stripeSettingsSchema,
  defaultSettings: {
    defaultCurrency: 'EUR'
  },
  createService: () => new StripeService(),
  getCheckoutConfig: settings => {
    const parsedSettings = stripeSettingsSchema.parse(settings);
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();

    if (!publishableKey) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured');
    }

    return {
      id: STRIPE_PROVIDER_ID,
      label: 'Stripe',
      checkoutKind: 'stripe-elements',
      publishableKey,
      defaultCurrency: parsedSettings.defaultCurrency,
      supportedCurrencies: STRIPE_SUPPORTED_CURRENCIES,
      capabilities: ['card', 'checkout', 'refund', 'sync', 'topup', 'webhook']
    };
  },
  testConnection: async () => {
    try {
      await stripe.balance.retrieve();
      return { status: 'configured', message: 'Соединение со Stripe установлено' };
    } catch {
      return { status: 'error', message: 'Stripe отклонил проверку credentials' };
    }
  }
};
```

Зарегистрируйте `stripeConnector` в массиве `paymentConnectors` файла
`../connectors/registry.server.ts`. После регистрации Stripe автоматически появится на странице
настроек провайдеров в админке.

## 9. Добавить Stripe checkout renderer

`../connectors/stripe/stripe-checkout.tsx` должен:

1. Инициализировать `loadStripe()` вне компонента или кешировать экземпляр по publishable key.
2. Создать PaymentIntent через `/api/payments/orders`.
3. Передать `clientSecret` в `<Elements>`.
4. Отрисовать `<PaymentElement>` с темой, соответствующей `resolvedTheme`.
5. Вызвать `stripe.confirmPayment({ elements, redirect: 'if_required' })`.
6. После успешной авторизации вызвать `/api/payments/orders/[orderId]/capture` для manual capture.
7. Не считать клиентский ответ окончательным источником истины: итог подтверждает webhook/sync.

Пример выбора renderer в `../components/payment-provider-checkout.tsx`:

```tsx
export const PaymentProviderCheckout = (props: PaymentProviderCheckoutProps) => {
  switch (props.config.checkoutKind) {
    case 'paypal':
      return <PayPalCheckout {...props} config={props.config} />;
    case 'stripe-elements':
      return <StripeCheckout {...props} config={props.config} />;
  }
};
```

При реализации обновите общий callback `createOrder`: он должен возвращать discriminated union,
а не только строковый `orderId`.

## 10. Добавить webhook Route Handler

Stripe требует исходное тело запроса для проверки подписи:

```ts
import { NextResponse } from 'next/server';

import { stripe } from '@/modules/payments/stripe/client.server';
import { processStripeWebhookEvent } from '@/modules/payments/stripe/service.server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ message: 'Missing Stripe signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    return NextResponse.json({ message: 'Webhook is not configured' }, { status: 503 });
  }

  try {
    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    await processStripeWebhookEvent(event);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: 'Invalid Stripe webhook' }, { status: 400 });
  }
}
```

Минимальный набор событий для одноразовых платежей:

- `payment_intent.succeeded`;
- `payment_intent.payment_failed`;
- `payment_intent.canceled`;
- `charge.refunded`;
- `charge.dispute.created`, `charge.dispute.updated` и `charge.dispute.closed`, если в продукте
  поддерживаются споры.

Каждое событие сначала регистрируется в `PaymentEvent` с `provider: 'STRIPE'` и
`providerEventId: event.id`. Составной unique index обеспечивает dedupe, но обработчик всё равно
должен корректно переживать параллельную доставку и retry после ошибки.

## 11. Тесты

До включения Stripe в админке должны проходить тесты:

- создание PaymentIntent с корректной minor-unit суммой;
- отклонение неподдерживаемой валюты;
- стабильный idempotency key при retry;
- отсутствие секретов в checkout config и HTTP-ответах;
- отображение 3D Secure / `requires_action`;
- capture только для `requires_capture`;
- повторный capture завершённого платежа не создаёт новое списание;
- sync по PaymentIntent и Charge;
- однократное начисление TOPUP;
- частичный и полный refund;
- webhook с неверной подписью;
- dedupe одинакового `event.id`;
- параллельная доставка webhook;
- retry webhook после временной ошибки;
- health check с отсутствующими env и с отклонённым ключом;
- registry возвращает Stripe только после регистрации;
- Stripe renderer выбирается по `checkoutKind: 'stripe-elements'`;
- светлая и тёмная тема Payment Element.

Stripe CLI удобно использовать только для локальной доставки тестовых webhook. Автоматические
тесты не должны зависеть от сети или реального Stripe account.

## 12. Чек-лист готовности

- [x] SDK версии совместимы и зафиксированы lock-файлом.
- [x] Секреты доступны только server-side коду.
- [x] Provider ID стабилен и не переименовывается после появления платежей в БД.
- [x] Поддерживаемые валюты совпадают в service и connector metadata.
- [x] Денежные суммы преобразуются через `Prisma.Decimal` без floating-point округления.
- [x] Create/capture используют idempotency keys.
- [x] Webhook проверяет подпись по raw body.
- [x] Webhook выполняет dedupe и допускает retry после ошибки обработки.
- [x] TOPUP начисляет баланс один раз.
- [x] Refund уменьшает баланс только на подтверждённую разницу.
- [x] Dispute не меняет баланс без явно согласованной бизнес-логики.
- [x] Админ может проверить соединение, включить Stripe и выбрать его по умолчанию.
- [x] Клиентский checkout не содержит secret key и чувствительные metadata.
- [x] Добавлены unit и integration-тесты серверного контракта.
- [ ] Добавлены браузерные тесты Stripe Elements с тестовым Stripe account.
- [ ] Выполнена ручная проверка webhook через Stripe CLI.
