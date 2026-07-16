# In-app уведомления

Документ описывает единый механизм persistent-уведомлений в верхней панели личного кабинета и админки.

## Основные свойства

- Уведомления хранятся в PostgreSQL в модели `AppNotification` и синхронизируются между устройствами.
- Колокольчик показывает только записи без `readAt` и `dismissedAt`.
- «Прочитано» устанавливает `readAt`. «Очистить все» устанавливает `dismissedAt`, история не удаляется физически.
- Администратор может удалить запись из своей истории: `deletedAt` скрывает её из центра и истории, но сохраняет ключ дедупликации системного события.
- Системные уведомления используют `dedupeKey` и после прочтения или очистки не создаются повторно.
- Хук работает без React Provider. Все экземпляры используют общий SWR-кэш `/api/notifications`.
- Пока вкладка активна, хук проверяет новые уведомления каждые 5 секунд; при возврате во вкладку или восстановлении сети обновление выполняется сразу.
- Клиент не может создавать уведомления для других пользователей. Создание выполняется только серверным сервисом.

## Клиентский хук

```ts
import { useNotifications } from '@/lib/hooks/use-notifications';

const {
  notifications,
  unreadCount,
  isLoading,
  isValidating,
  error,
  refresh,
  markAsRead,
  markAllAsRead,
  clearAll
} = useNotifications();
```

Хук можно использовать в любом Client Component внутри авторизованной части приложения. Дополнительная обёртка или регистрация модуля не требуется.

### Интерфейс `UseNotificationsResult`

| Поле              | Тип                    | Назначение                                        |
| ----------------- | ---------------------- | ------------------------------------------------- |
| `notifications`   | `AppNotificationDto[]` | Активные непрочитанные уведомления, новые первыми |
| `unreadCount`     | `number`               | Количество активных уведомлений                   |
| `isLoading`       | `boolean`              | Первичная загрузка                                |
| `isValidating`    | `boolean`              | Фоновое обновление SWR                            |
| `error`           | `Error \| null`        | Ошибка последней загрузки                         |
| `refresh()`       | `Promise<void>`        | Принудительно обновить общий кэш                  |
| `markAsRead(id)`  | `Promise<void>`        | Optimistic-отметка одной записи как прочитанной   |
| `markAllAsRead()` | `Promise<void>`        | Отметить все активные записи прочитанными         |
| `clearAll()`      | `Promise<void>`        | Скрыть все активные записи с сохранением истории  |

### DTO уведомления

```ts
interface AppNotificationDto {
  id: string;
  kind: 'INFO' | 'WARNING' | 'SUCCESS';
  source: string;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  createdAt: string;
}
```

Пример использования в модуле:

```tsx
'use client';

import { useNotifications } from '@/lib/hooks/use-notifications';

export const ModuleNotificationBadge = () => {
  const { unreadCount, refresh } = useNotifications();

  return (
    <button type="button" onClick={() => refresh()}>
      Обновить уведомления ({unreadCount})
    </button>
  );
};
```

## Серверное создание

Бизнес-модули не должны обращаться к `prisma.appNotification` напрямую. Используйте сервис:

```ts
import { createUserNotification } from '@/modules/notifications/notification-service.server';

await createUserNotification({
  userId,
  kind: 'INFO',
  source: 'PAYMENTS',
  title: 'Платёж подтверждён',
  message: 'Пакет консультаций доступен в личном кабинете.',
  actionUrl: '/my/payments',
  actionLabel: 'Открыть платежи',
  dedupeKey: `payment-confirmed:${paymentId}`
});
```

Для одинакового сообщения группе пользователей:

```ts
import { createNotificationsForUsers } from '@/modules/notifications/notification-service.server';

await createNotificationsForUsers(userIds, {
  kind: 'INFO',
  source: 'SURVEYS',
  title: 'Назначен новый тест',
  message: 'Тест доступен в разделе анкет.',
  actionUrl: '/my/surveys',
  actionLabel: 'Открыть тесты'
});
```

### Правила `dedupeKey`

- Используйте стабильный ключ для системного события, которое нельзя показывать повторно после прочтения.
- Ключ должен включать модуль и версию сценария: `payments:failed:v1`.
- Для событий конкретной сущности добавляйте её ID: `survey-assigned:${assignmentId}`.
- Не используйте `dedupeKey` для админских рассылок, если каждое отправленное сообщение должно стать новой записью.
- Сервис автоматически добавляет `userId` к ключу, передавать его в `dedupeKey` не нужно.

## Завершение системного уведомления

Если пользователь выполнил требуемое действие в другом интерфейсе, модуль может отметить уведомление прочитанным:

```ts
import {
  resolveUserNotificationByKey,
  systemNotificationKeys
} from '@/modules/notifications/notification-service.server';

await resolveUserNotificationByKey(userId, systemNotificationKeys.incompleteIntake);
```

Сейчас автоматически поддерживаются два системных сценария:

- `missingTimezone`: профиль не содержит часовой пояс;
- `incompleteIntake`: пользователь с ролью `USER` не прошёл первичную анкету.

## История уведомлений

- Пользователь открывает историю по адресу `/my/notifications`.
- Администратор открывает личную историю по адресу `/admin/notifications`.
- Первая страница загружается напрямую в Server Component, следующие страницы запрашиваются курсором через API.
- История показывает новые, прочитанные и очищенные записи. Записи с `deletedAt` не возвращаются.
- Только администратор может удалить одну запись или всю собственную историю. Server Actions повторно проверяют роль и всегда ограничивают операцию текущим `userId`.

## Ограничения и безопасность

- `title`: от 1 до 120 символов.
- `message`: от 1 до 500 символов.
- `actionLabel`: до 40 символов.
- `actionUrl` разрешает только внутренний путь, начинающийся с одного `/`.
- HTML не поддерживается. `title` и `message` всегда выводятся как обычный React-текст.
- Каждый API повторно проверяет сессию. Изменить можно только уведомления текущего пользователя.
- Массовое создание доступно только роли `ADMIN` через `/api/admin/notifications`.

## Правила для AI-агентов

1. Перед добавлением нового in-app уведомления прочитайте этот документ и `src/modules/notifications/types.ts`.
2. Не создавайте отдельный Zustand store, Context Provider или localStorage для уведомлений.
3. В Client Component используйте только `useNotifications()`.
4. В Server Action, Route Handler или workflow используйте `notification-service.server.ts`.
5. Не импортируйте server-сервис в Client Component.
6. Не пишите напрямую в `AppNotification`, кроме миграций и самого notification service.
7. Для повторяемых системных условий обязательно задавайте стабильный `dedupeKey`.
8. Не сбрасывайте `readAt` и `dismissedAt`: прочитанное пользователем решение имеет приоритет.
9. Всегда передавайте DTO, не отдавайте клиенту `userId`, `dedupeKey` или внутренние metadata.
10. Для нового типа поведения добавьте тест схемы/сервиса и обновите этот документ.

## API

| Метод    | Маршрут                       | Назначение                                                      |
| -------- | ----------------------------- | --------------------------------------------------------------- |
| `GET`    | `/api/notifications`          | Список активных уведомлений и инициализация системных сценариев |
| `GET`    | `/api/notifications/history`  | Следующая страница полной истории текущего пользователя         |
| `PATCH`  | `/api/notifications/:id`      | Отметить одну запись прочитанной                                |
| `POST`   | `/api/notifications/read-all` | Отметить все записи прочитанными                                |
| `DELETE` | `/api/notifications`          | Очистить все активные записи                                    |
| `POST`   | `/api/admin/notifications`    | Массовое создание, только `ADMIN`                               |
