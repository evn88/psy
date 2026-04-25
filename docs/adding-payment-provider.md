# Как добавить нового платёжного провайдера

Приложение использует абстракцию для работы с платежными шлюзами. Это позволяет легко переключать провайдеров (например, с PayPal на Stripe) без изменения бизнес-логики приложения. 

Вся логика переключения основана на переменной окружения `ACTIVE_PAYMENT_PROVIDER` (см. `README.md`). Ниже описаны пошаговые действия для добавления новой платежной системы.

## Шаг 1: Обновление схемы БД (Prisma)

Провайдеры жестко типизированы в базе данных. Откройте `prisma/schema.prisma` и добавьте название вашей системы в перечисление `PaymentProvider`:

```prisma
enum PaymentProvider {
  PAYPAL
  STRIPE // Ваша новая система
}
```

Не забудьте сгенерировать клиент и создать миграцию:
```bash
npx prisma generate
npx prisma migrate dev --name add_stripe_provider
```

## Шаг 2: Реализация интерфейса сервиса

Создайте файл для вашего провайдера в папке сервисов, например `src/shared/lib/payments/providers/stripe-service.ts`.

Класс должен реализовывать интерфейс `IPaymentService`:

```typescript
import { PaymentProvider } from '@prisma/client';
import type { CaptureOrderParams, CreateOrderParams, IPaymentService, OrderResponse } from '../types';

export class StripeService implements IPaymentService {
  get providerName(): PaymentProvider {
    return PaymentProvider.STRIPE;
  }

  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    // 1. Вызов Stripe SDK для создания PaymentIntent или Checkout Session
    // 2. Создание черновой записи (PENDING) в локальной БД через prisma.payment.create
    // 3. Возврат ID ордера (intent ID) и статуса
  }

  async captureOrder(params: CaptureOrderParams): Promise<void> {
    // В зависимости от системы, ордер может подтверждаться автоматически.
    // Если необходим ручной capture, добавьте вызов SDK здесь.
  }
}
```

## Шаг 3: Обновление Фабрики

Добавьте ваш новый сервис в фабрику `src/shared/lib/payments/factory.ts`:

1. В `getActivePaymentProviderConfig()` добавьте условие обработки переменной окружения.
2. В `getPaymentService()` добавьте инициализацию в `switch`.

```typescript
import { StripeService } from './providers/stripe-service';

export const getPaymentService = (): IPaymentService => {
  // ...
  switch (activeProvider) {
    case PaymentProvider.PAYPAL:
      activeServiceInstance = new PayPalService();
      break;
    case PaymentProvider.STRIPE:
      activeServiceInstance = new StripeService();
      break;
    // ...
  }
}
```

## Шаг 4: Обработка Webhook'ов

Вебхуки очень специфичны для каждой системы, поэтому для них НЕ существует общей абстракции. Создайте свой роут:

`src/app/api/payments/webhooks/stripe/route.ts`

Внутри этого файла проверяйте подпись вебхука с помощью официального SDK провайдера и обновляйте статус операции (`status`, `capturedAt`) в локальной БД `prisma.payment`. Приложение будет опираться на эту синхронизацию как на источник правды.

## Шаг 5: Обновление UI (Чекаут карты)

Перейдите в компонент `src/app/[locale]/(main)/my/payments/_components/payment-checkout-card.tsx`.

1. Добавьте проверку того, какой провайдер сейчас активен (например, передав пропс с сервера).
2. Замените или дополните кнопки. Если это Stripe, выведите Elements `<PaymentElement />` вместо `<PayPalButtons />`.

Серверная часть уже абстрагирована (вызовы `fetch('/api/payments/orders')`). При нажатии на логическую кнопку оплаты, всё, что вам нужно — отправить стандартный payload, и система обернёт его в вашу новую логику.
