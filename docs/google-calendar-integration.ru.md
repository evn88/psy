# Интеграция с Google Calendar

## Реализованный поток

Приложение использует серверный OAuth 2.0 flow и минимальный scope
`https://www.googleapis.com/auth/calendar.events`. После подключения:

- будущие события расписания отправляются в основной Google Calendar;
- создание, изменение, отмена и удаление записи синхронизируются автоматически;
- access token обновляется через offline refresh token;
- OAuth-токены хранятся в PostgreSQL в зашифрованном виде;
- кнопка «Синхронизировать сейчас» повторно отправляет будущие записи.

Legacy-поле с приватным iCal URL оставлено только для прежнего read-only отображения занятости.
Оно не используется для отправки записей в Google.

## Настройка Google Cloud

1. Создать или выбрать проект в Google Cloud Console.
2. Включить Google Calendar API.
3. Настроить OAuth consent screen.
4. Создать OAuth Client ID с типом `Web application`.
5. Добавить точные redirect URI:
   - production: `https://<домен>/api/google-calendar/callback`;
   - local: `http://localhost:3000/api/google-calendar/callback`.
6. Добавить переменные окружения:

```dotenv
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=https://<домен>
ENCRYPTION_KEY=<стабильный-секрет-для-шифрования>
```

`NEXT_PUBLIC_APP_URL` должен в точности совпадать с origin зарегистрированного redirect URI.
`ENCRYPTION_KEY` нельзя менять после подключения календаря, иначе сохранённые токены невозможно
будет расшифровать.

## Деплой

Перед включением функции применить миграцию и сгенерировать Prisma Client:

```bash
npx prisma generate
npx prisma migrate deploy
```

После деплоя открыть «Админка → Расписание → Настройки», нажать «Подключить Google Calendar»
и пройти экран согласия Google. Первичная синхронизация будущих записей запускается автоматически.

## План обратной синхронизации Google → приложение

Обратную синхронизацию следует реализовать отдельно, чтобы не смешивать её с исходящим потоком:

1. Расширить scope на чтение событий только после отдельного согласия администратора.
2. Выполнить initial sync через `events.list` с `singleEvents=true`, временным диапазоном и
   сохранением `nextSyncToken`.
3. Подключить Google push notifications (`events.watch`) на отдельный проверяемый webhook.
4. На webhook запускать инкрементальный `events.list` по `syncToken`, а не доверять payload webhook.
5. Хранить внешние события в отдельной модели `ExternalCalendarEvent`, не смешивая их с `Event`.
6. Применить явные правила конфликтов: внешние события блокируют время, но не создают клиента,
   консультацию или уведомления автоматически.
7. Исключать события приложения по `extendedProperties.private.vershkovEventId`, чтобы избежать
   циклической синхронизации и дублей.
8. Обрабатывать удаление, recurring events, all-day events, смену timezone, `410 Gone` для
   протухшего sync token и повторную регистрацию watch channel.
9. Добавить журнал синхронизации, ручной retry и интеграционные тесты с зафиксированными ответами
   Google API.
