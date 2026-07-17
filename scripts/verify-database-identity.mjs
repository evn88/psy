import { pathToFileURL } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { Pool } from 'pg';

const DATABASE_IDENTITY_KEY = 'primary';

const isDirectPostgresUrl = value =>
  Boolean(value && (value.startsWith('postgres://') || value.startsWith('postgresql://')));

const getFirstConfiguredValue = variableNames => {
  for (const variableName of variableNames) {
    const value = process.env[variableName]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
};

const resolveRuntimeDatabaseUrl = () => {
  const value = getFirstConfiguredValue([
    'PRISMA_DATABASE_URL',
    'DATABASE_URL',
    'POSTGRES_URL'
  ]);

  if (!value) {
    throw new Error('Для identity-проверки требуется runtime URL базы данных.');
  }

  return value;
};

const resolveDirectDatabaseUrl = () => {
  const explicitDirectUrl = getFirstConfiguredValue([
    'DIRECT_DATABASE_URL',
    'POSTGRES_URL_NON_POOLING'
  ]);
  if (explicitDirectUrl) {
    if (isDirectPostgresUrl(explicitDirectUrl)) {
      return explicitDirectUrl;
    }

    throw new Error('Явный direct URL имеет неподдерживаемый протокол.');
  }

  if (getFirstConfiguredValue(['PRISMA_DATABASE_URL', 'POSTGRES_URL'])) {
    throw new Error(
      'При отдельном runtime URL требуется DIRECT_DATABASE_URL или POSTGRES_URL_NON_POOLING.'
    );
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (isDirectPostgresUrl(databaseUrl)) {
    return databaseUrl;
  }

  throw new Error('Для identity-проверки требуется direct PostgreSQL URL.');
};

const createRuntimePrismaClient = runtimeUrl => {
  if (runtimeUrl.startsWith('prisma://') || runtimeUrl.startsWith('prisma+postgres://')) {
    const baseClient = new PrismaClient({ accelerateUrl: runtimeUrl });

    return {
      client: baseClient.$extends(withAccelerate()),
      close: () => baseClient.$disconnect()
    };
  }

  if (!isDirectPostgresUrl(runtimeUrl)) {
    throw new Error('Runtime URL имеет неподдерживаемый протокол.');
  }

  const pool = new Pool({ connectionString: runtimeUrl });
  const baseClient = new PrismaClient({
    adapter: new PrismaPg(pool)
  });

  return {
    client: baseClient,
    close: async () => {
      await baseClient.$disconnect();
      await pool.end();
    }
  };
};

/**
 * Создаёт только служебный identity sentinel через direct URL до любых domain-миграций.
 * Операция идемпотентна и сохраняет уже назначенный instanceId.
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<unknown> }} directPool
 */
export const bootstrapDirectDatabaseIdentity = async directPool => {
  await directPool.query(`
    BEGIN;

    CREATE TABLE IF NOT EXISTS "DatabaseIdentity" (
      "key" TEXT NOT NULL DEFAULT 'primary',
      "instanceId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DatabaseIdentity_pkey" PRIMARY KEY ("key")
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "DatabaseIdentity_instanceId_key"
    ON "DatabaseIdentity"("instanceId");

    INSERT INTO "DatabaseIdentity" ("key", "instanceId")
    VALUES (
      'primary',
      md5(
        random()::text
        || clock_timestamp()::text
        || pg_backend_pid()::text
        || current_database()
      )
    )
    ON CONFLICT ("key") DO NOTHING;

    COMMIT;
  `);
};

/**
 * Сравнивает identity, полученный через runtime Prisma, с direct PostgreSQL.
 * @param {{ databaseIdentity: { findUnique: (args: object) => Promise<{ instanceId: string } | null> } }} runtimeClient
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ instanceId?: string }> }> }} directPool
 */
export const assertDatabaseIdentitiesMatch = async (runtimeClient, directPool) => {
  const [runtimeIdentity, directIdentityResult] = await Promise.all([
    runtimeClient.databaseIdentity.findUnique({
      where: { key: DATABASE_IDENTITY_KEY },
      select: { instanceId: true }
    }),
    directPool.query(
      `
        SELECT "instanceId"
        FROM "DatabaseIdentity"
        WHERE "key" = $1
        LIMIT 1
      `,
      [DATABASE_IDENTITY_KEY]
    )
  ]);
  const directInstanceId = directIdentityResult.rows[0]?.instanceId;

  if (!runtimeIdentity?.instanceId || !directInstanceId) {
    throw new Error('DatabaseIdentity отсутствует в runtime или direct БД.');
  }

  if (runtimeIdentity.instanceId !== directInstanceId) {
    throw new Error('Runtime и direct URL указывают на разные экземпляры базы данных.');
  }
};

const main = async () => {
  const runtimeDatabase = createRuntimePrismaClient(resolveRuntimeDatabaseUrl());
  const directPool = new Pool({
    connectionString: resolveDirectDatabaseUrl(),
    max: 1
  });

  try {
    await bootstrapDirectDatabaseIdentity(directPool);
    await assertDatabaseIdentitiesMatch(runtimeDatabase.client, directPool);
    console.info('Runtime и direct database identity совпадают.');
  } finally {
    await Promise.all([runtimeDatabase.close(), directPool.end()]);
  }
};

const isDirectExecution =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
