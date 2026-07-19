#!/usr/bin/env zsh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PG_BIN="${PG_BIN:-/opt/homebrew/opt/libpq/bin}"
BACKUP_DIR="${BACKUP_DIR:-/private/tmp/vershkov-db-clone-$(date +%Y%m%d-%H%M%S)}"

cd "$PROJECT_ROOT"

for command in pg_dump pg_restore psql; do
  if [[ ! -x "$PG_BIN/$command" ]]; then
    echo "Ошибка: $PG_BIN/$command не найден."
    echo "Установите PostgreSQL CLI: brew install libpq"
    exit 1
  fi
done

DEV_DATABASE_URL="$(
  node -e "
    const { loadEnvConfig } = require('@next/env');
    loadEnvConfig(process.cwd());
    process.stdout.write(process.env.DATABASE_URL || '');
  "
)"

read -s "PROD_DATABASE_URL?Production direct DATABASE_URL: "
echo

export PROD_DATABASE_URL DEV_DATABASE_URL

cleanup_environment() {
  unset PROD_DATABASE_URL DEV_DATABASE_URL PROD_ID DEV_ID
}

trap cleanup_environment EXIT

if [[ -z "$PROD_DATABASE_URL" || -z "$DEV_DATABASE_URL" ]]; then
  echo "Ошибка: production или development URL отсутствует."
  exit 1
fi

node -e "
  const crypto = require('node:crypto');
  const production = new URL(process.env.PROD_DATABASE_URL);
  const development = new URL(process.env.DEV_DATABASE_URL);

  for (const [name, url] of [
    ['Production', production],
    ['Development', development]
  ]) {
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
      throw new Error(name + ' URL должен быть прямым PostgreSQL URL');
    }
  }

  const source = [
    production.hostname,
    production.port,
    production.pathname,
    production.username
  ].join(':');

  const destination = [
    development.hostname,
    development.port,
    development.pathname,
    development.username
  ].join(':');

  if (source === destination) {
    throw new Error('Production и development указывают на одну базу');
  }

  console.log('Проверка пройдена: production и development — разные базы.');
  console.log(
    'Production fingerprint:',
    crypto.createHash('sha256').update(source).digest('hex').slice(0, 12)
  );
  console.log(
    'Development fingerprint:',
    crypto.createHash('sha256').update(destination).digest('hex').slice(0, 12)
  );
"

PROD_ID="$(
  "$PG_BIN/psql" "$PROD_DATABASE_URL" -Atc \
    'SELECT "instanceId" FROM "DatabaseIdentity" WHERE "key" = '\''primary'\'''
)"
DEV_ID="$(
  "$PG_BIN/psql" "$DEV_DATABASE_URL" -Atc \
    'SELECT "instanceId" FROM "DatabaseIdentity" WHERE "key" = '\''primary'\'''
)"

if [[ -z "$PROD_ID" || -z "$DEV_ID" ]]; then
  echo "Ошибка: в production или development отсутствует DatabaseIdentity."
  exit 1
fi

if [[ "$PROD_ID" == "$DEV_ID" ]]; then
  echo "Ошибка: production и development имеют одинаковый DatabaseIdentity."
  exit 1
fi

echo
echo "ВНИМАНИЕ: содержимое dev-базы будет полностью заменено production-копией."
echo "Копия содержит пользователей, email, токены, платежи и очереди уведомлений."
read "CONFIRMATION?Для продолжения введите CLONE_PRODUCTION_TO_DEV: "

if [[ "$CONFIRMATION" != "CLONE_PRODUCTION_TO_DEV" ]]; then
  echo "Операция отменена."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "Сохраняю резервную копию текущей dev-базы..."
"$PG_BIN/pg_dump" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$BACKUP_DIR/dev-before-restore.dump" \
  "$DEV_DATABASE_URL"

echo "Создаю согласованный dump production..."
"$PG_BIN/pg_dump" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$BACKUP_DIR/production.dump" \
  "$PROD_DATABASE_URL"

echo "Проверяю читаемость созданных dump-файлов..."
"$PG_BIN/pg_restore" --list "$BACKUP_DIR/dev-before-restore.dump" >/dev/null
"$PG_BIN/pg_restore" --list "$BACKUP_DIR/production.dump" >/dev/null

echo "Полностью заменяю содержимое dev-базы..."
"$PG_BIN/pg_restore" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --exit-on-error \
  --single-transaction \
  --dbname="$DEV_DATABASE_URL" \
  "$BACKUP_DIR/production.dump"

echo "Назначаю dev-базе отдельный DatabaseIdentity..."
"$PG_BIN/psql" "$DEV_DATABASE_URL" \
  --set=ON_ERROR_STOP=1 \
  -c "
    UPDATE \"DatabaseIdentity\"
    SET
      \"instanceId\" = md5(
        random()::text
        || clock_timestamp()::text
        || pg_backend_pid()::text
        || current_database()
      ),
      \"createdAt\" = NOW()
    WHERE \"key\" = 'primary';
  "

echo "Проверяю историю миграций production-копии..."
npm run migrations:verify

echo "Применяю к dev отсутствующие миграции из текущей ветки..."
npx prisma migrate deploy

echo "Проверяю восстановленную и обновлённую dev-базу..."
npm run database:verify-identity
npx prisma migrate status
npm run migrations:verify

echo
echo "Готово. Резервные копии находятся в: $BACKUP_DIR"
echo "После проверки удалите production dump:"
echo "rm -f \"$BACKUP_DIR/production.dump\""
