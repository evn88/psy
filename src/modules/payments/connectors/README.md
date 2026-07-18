# Платёжные коннекторы

Каждый внешний платёжный провайдер размещается в отдельной папке:

```text
connectors/
  paypal/
    connector.server.ts
    constants.ts
    paypal-checkout.tsx
```

## Контракт

Серверный `connector.server.ts` описывает:

- стабильный строковый `id`, сохраняемый в `Payment.provider`;
- возможности провайдера;
- поддерживаемые валюты;
- обязательные переменные окружения;
- схему безопасных настроек для админки;
- создание серверного `IPaymentService`;
- безопасную конфигурацию клиентского checkout;
- health check внешнего API.

SDK, API-типы и provider-specific преобразования не должны импортироваться общими страницами или route handlers.

## Добавление провайдера

1. Создайте папку `connectors/<provider>`.
2. Реализуйте `PaymentConnector` и `IPaymentService`.
3. Добавьте клиентский checkout renderer, если провайдер требует собственный SDK.
4. Зарегистрируйте серверный коннектор в `registry.server.ts`.
5. Добавьте renderer в `components/payment-provider-checkout.tsx`.
6. Создайте отдельный webhook Route Handler провайдера.
7. Добавьте unit-тесты create, capture, sync, webhook и проверки валют.

Секреты не включаются в metadata или checkout config. По умолчанию они читаются только из server-only env.
