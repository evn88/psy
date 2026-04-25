# Системный журнал: API, AI и платежные интеграции

## Назначение

Системный журнал нужен для диагностики ошибок и спорных ситуаций в серверной части приложения.

В первой версии журнал покрывает:

- все обращения к `src/app/api/**`;
- ошибки AI-слоя;
- ошибки PayPal API.

Каждая запись сохраняется в БД и содержит:

- категорию (`API`, `AI`, `PAYMENT`);
- уровень (`INFO`, `WARN`, `ERROR`);
- путь, метод, статус и длительность запроса;
- IP инициатора запроса;
- `userId`, если запрос был выполнен авторизованным пользователем;
- безопасно очищенные фрагменты request/response body;
- детали ошибки и stack trace, если они есть.

> Важно: журнал не должен использоваться для хранения секретов, cookies, токенов, паролей или полных приватных данных
> пользователя.

---

## Где что лежит

```text
src/shared/lib/system-logs/
  redact-log-payload.ts
  request-context.server.ts
  system-log-settings.server.ts
  system-log-service.server.ts
  with-api-logging.server.ts

src/app/[locale]/(main)/admin/logs/
  page.tsx
  actions.ts
  _components/
    system-log-settings-form.tsx
    system-logs-table.tsx
```

Модели БД находятся в `prisma/schema.prisma`:

- `SystemLogEntry`;
- `SystemLogSettings`;
- `SystemLogCategory`;
- `SystemLogLevel`.

---

## Как оборачивать новый API route

Для нового route handler используйте `withApiLogging`.

```ts
import { NextResponse } from 'next/server';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

const postHandler = async (request: Request) => {
  const body = await request.json();

  return NextResponse.json({ ok: true, received: body.id });
};

export const POST = withApiLogging(postHandler);
```

Wrapper сам:

- считает длительность;
- определяет IP инициатора;
- определяет авторизованного пользователя через `auth()`;
- сохраняет request body, если это небольшой JSON;
- сохраняет response body для `4xx/5xx`;
- пишет uncaught exception в журнал и возвращает безопасный `500`.

Для NextAuth route нельзя повторно вызывать `auth()` внутри самого auth endpoint. Используйте режим:

```ts
export const GET = withApiLogging(handlers.GET, { resolveUser: false });
export const POST = withApiLogging(handlers.POST, { resolveUser: false });
```

---

## Как логировать внешний сервис

Для нового внешнего сервиса используйте `logExternalServiceError`.

```ts
import { SystemLogCategory } from '@prisma/client';
import { logExternalServiceError } from '@/shared/lib/system-logs/system-log-service.server';

try {
  await externalClient.send(payload);
} catch (error) {
  await logExternalServiceError({
    category: SystemLogCategory.PAYMENT,
    service: 'stripe',
    operation: 'create-payment-intent',
    error,
    metadata: {
      requestBody: payload
    }
  });

  throw error;
}
```

Если внутри интеграции есть `Request`, передайте его в сервис. Тогда журнал сохранит IP, user-agent, request id и `userId`.

```ts
await logExternalServiceError({
  category: SystemLogCategory.AI,
  service: 'custom-ai-provider',
  operation: 'generate-summary',
  request,
  userId,
  error,
  metadata
});
```

---

## Redaction и безопасность

Перед записью в БД payload проходит через `redactLogPayload`.

Автоматически скрываются ключи, похожие на:

- `authorization`;
- `cookie`;
- `password`;
- `token`;
- `secret`;
- `apiKey`;
- `access_token`;
- `refresh_token`;
- `credential`;
- `session`.

Правила:

1. Не передавайте в `metadata` сырые cookies, headers целиком или env-переменные.
2. Не сохраняйте полные документы, анкеты, медицинские данные и большие HTML/Markdown payload'ы.
3. Для диагностики передавайте только идентификаторы, статус, безопасные коды ошибок и короткий preview.

---

## IP и пользователь

IP определяется по приоритету:

1. `x-forwarded-for` — берётся первый IP;
2. `x-real-ip`;
3. `cf-connecting-ip`;
4. `x-client-ip`.

Если запрос выполняет авторизованный пользователь, `SystemLogEntry.userId` связывается с `User.id`.
Связь nullable и использует `onDelete: SetNull`, поэтому удаление пользователя не удаляет журнал.

---

## Настройки в админке

Страница доступна в админке:

```text
/admin/logs
```

На странице можно:

- включить или выключить запись API-запросов;
- включить или выключить запись AI-ошибок;
- включить или выключить запись ошибок платежей;
- задать срок хранения записей.
- вручную очистить записи старше срока хранения;
- вручную очистить весь журнал.

По умолчанию:

- API-запросы включены;
- AI-ошибки включены;
- ошибки платежей включены;
- retention — 30 дней.

Автоматическая очистка запускается ежедневно через Vercel Cron:

```text
/api/cron/system-logs-cleanup
```

Cron route защищён `CRON_SECRET` и запускает durable Workflow:

```text
src/workflows/system-log-cleanup-workflow.ts
```

Workflow читает `SystemLogSettings.retentionDays` и удаляет записи старше этого срока. Ручная очистка в админке
использует те же правила retention, но выполняется сразу по кнопке администратора.
