# Руководство по Prisma: dev и production

В проекте используются две физически разные Prisma Postgres базы:

- **development** — локальная разработка, тестовые данные и создание миграций;
- **production** — рабочее приложение в Vercel, только применение заранее созданных и проверенных миграций.

## 1. Переменные окружения

### Локальная dev-база

Локальные подключения хранятся в `.env.local`. Достаточно двух переменных:

```dotenv
# Прямой PostgreSQL URL dev-базы: Prisma CLI, миграции, backup и административные команды.
DATABASE_URL="postgres://..."

# Runtime URL той же dev-базы через Prisma Accelerate.
PRISMA_DATABASE_URL="prisma+postgres://..."
```

Не нужно одновременно дублировать подключение в `POSTGRES_URL`, `DIRECT_DATABASE_URL` и
`POSTGRES_URL_NON_POOLING`. Конфигурация проекта использует `DATABASE_URL` как direct URL, если отдельный alias не
задан.

### Production-база

Production URL должны храниться только:

- в Vercel Environment Variables;
- в secrets защищённого CI/release job;
- в менеджере секретов для разового ручного деплоя.

Не записывайте production URL в локальные `.env` и `.env.local`. Это защищает production от случайного запуска
`migrate dev`, `migrate reset`, Prisma Studio и ручных запросов.

## 2. Обязательные правила

> [!CAUTION]
> Любое изменение `prisma/schema.prisma`, влияющее на БД, должно поставляться вместе с новой SQL-миграцией в
> `prisma/migrations`.
>
> На production строго запрещено:
>
> - запускать `prisma migrate dev`;
> - запускать `prisma migrate reset`;
> - использовать `prisma db push`;
> - открывать Prisma Studio;
> - изменять схему или данные вручную в обход проверенной миграции;
> - изменять или удалять уже опубликованные миграции;
> - выполнять разрушающие изменения без стратегии **expand → migrate/backfill → contract**;
> - применять миграцию одновременно из нескольких CI jobs или терминалов.
>
> Для production разрешён только `npx prisma migrate deploy`, запущенный после проверки identity, SQL миграции,
> checksums и успешного применения этой же миграции к dev-базе.

- Новые миграции создаются только на dev-базе.
- На production применяется только `npx prisma migrate deploy`.
- Не изменяйте уже опубликованные миграции.
- Не используйте на production `migrate dev`, `migrate reset`, `db push` и Prisma Studio.
- Не выполняйте разрушающие изменения без стратегии **expand → migrate/backfill → contract**.
- SQL новой миграции необходимо проверить вручную до коммита.

## 3. Как проверить выбранную базу

Перед любой миграцией выполните:

```bash
npm run database:verify-identity
npx prisma migrate status
```

`database:verify-identity` проверяет, что runtime и direct URL ведут к одному экземпляру БД. `migrate status`
показывает host базы и состояние миграций.

Если база или окружение вызывают сомнения, не продолжайте.

## 4. Создание и применение миграции в dev

### Шаг 1. Проверить подключение

Убедитесь, что `.env.local` содержит URL development-базы:

```bash
npm run database:verify-identity
npx prisma migrate status
```

### Шаг 2. Изменить Prisma-схему

Внесите необходимые изменения в:

```text
prisma/schema.prisma
```

### Шаг 3. Создать миграцию

```bash
npx prisma migrate dev --name add_user_avatar
```

Команда:

1. сравнит dev-базу с `schema.prisma`;
2. создаст `prisma/migrations/<timestamp>_add_user_avatar/migration.sql`;
3. применит миграцию к dev-базе;
4. обновит Prisma Client.

### Шаг 4. Проверить SQL и проект

Откройте созданный `migration.sql` и проверьте:

- отсутствуют ли неожиданные `DROP TABLE` и `DROP COLUMN`;
- не теряются ли существующие данные;
- безопасны ли новые `NOT NULL` и `UNIQUE`;
- нужны ли backfill и поэтапный rollout;
- не будет ли миграция долго блокировать большую таблицу.

После проверки выполните:

```bash
npm run migrations:verify
npx prisma validate
npm run type-check
npm test
```

### Шаг 5. Закоммитить изменения

В один коммит должны попасть:

- изменения `prisma/schema.prisma`;
- новая директория `prisma/migrations/<timestamp>_<name>`;
- код и тесты, использующие новую схему.

## 5. Как применить готовую миграцию к dev

Если миграция уже создана другим разработчиком и получена через Git:

```bash
npm run database:verify-identity
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
```

Для уже созданной миграции предпочтителен `migrate deploy`: он применит только отсутствующие файлы миграций и не
попытается создать новую миграцию.

После выполнения:

```bash
npx prisma migrate status
```

Ожидаемый результат:

```text
Database schema is up to date!
```

## 6. Как применить миграции к production

Production не создаёт миграции. Она только применяет файлы из `prisma/migrations`, которые уже прошли проверку на
dev-базе.

### Рекомендуемый способ: отдельный CI/release job

В защищённом job задаются production-переменные:

```dotenv
DATABASE_URL="прямой production PostgreSQL URL"
PRISMA_DATABASE_URL="production Prisma Accelerate URL"
```

Job выполняется перед запуском версии приложения, которой нужна новая схема:

```bash
npm ci
npm run database:verify-identity
npx prisma migrate status
npm run migrations:verify
npx prisma migrate deploy
npx prisma migrate status
```

Деплой приложения должен продолжаться только после успешного `migrate deploy`. Не запускайте несколько production
migration jobs параллельно.

### Ручное применение к production

Используйте отдельную сессию терминала и временно передайте production URL через переменные процесса. Не меняйте
локальный `.env.local`.

```bash
export DATABASE_URL="<production-direct-url>"
export PRISMA_DATABASE_URL="<production-runtime-url>"

npm run database:verify-identity
npx prisma migrate status
npm run migrations:verify
npx prisma migrate deploy
npx prisma migrate status

unset DATABASE_URL PRISMA_DATABASE_URL
```

Перед `migrate deploy` убедитесь, что `migrate status` показывает production-базу и только ожидаемые миграции. После
выполнения статус должен быть `Database schema is up to date`.

`migrate deploy`:

- не создаёт новую миграцию;
- не изменяет файлы миграций;
- применяет только отсутствующие миграции из `prisma/migrations`;
- безопаснее для production, чем `migrate dev`.

## 7. Полезные команды

### Генерация Prisma Client

```bash
npx prisma generate
```

### Проверка схемы

```bash
npx prisma validate
```

### Проверка истории миграций

```bash
npm run migrations:verify
```

### Просмотр данных dev-базы

```bash
npx prisma studio
```

Перед Prisma Studio обязательно выполните `npx prisma migrate status`. Studio разрешено использовать только с
dev-базой.

## 8. Команды, которые нельзя запускать на production

```bash
npx prisma migrate dev
npx prisma migrate reset
npx prisma db push
npx prisma studio
```

`migrate reset` полностью пересоздаёт базу и удаляет данные. `db push` меняет схему без сохранения полноценной истории
миграций.

Если production-миграция завершилась ошибкой, не редактируйте применённый SQL и не запускайте `resolve` наугад.
Зафиксируйте состояние, сохраните логи и подготовьте отдельную корректирующую миграцию.
