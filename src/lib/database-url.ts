type DatabaseEnvironment = Record<string, string | undefined>;

const getFirstDefinedValue = (
  environment: DatabaseEnvironment,
  keys: readonly string[]
): string | undefined => {
  for (const key of keys) {
    const value = environment[key]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
};

/**
 * Проверяет, что URL можно использовать для прямого подключения PostgreSQL.
 * @param value - строка подключения.
 * @returns `true` для postgres:// и postgresql://.
 */
export const isDirectPostgresUrl = (value: string | undefined): value is string => {
  return Boolean(value && (value.startsWith('postgres://') || value.startsWith('postgresql://')));
};

const getDatabaseName = (value: string): string | null => {
  if (!isDirectPostgresUrl(value)) {
    return null;
  }

  try {
    const pathname = new URL(value).pathname.replace(/^\/+/, '');
    return pathname ? decodeURIComponent(pathname) : null;
  } catch {
    return null;
  }
};

/**
 * Выполняет только предварительную эвристическую проверку имени БД в direct URL.
 * Она не подтверждает identity экземпляра: для backup/restore и CI обязательна
 * проверка стабильного `DatabaseIdentity.instanceId` через оба подключения.
 * Для pool/direct хостов здесь сравнивается имя базы, так как host закономерно различается.
 * @param runtimeUrl - URL, используемый приложением.
 * @param directUrl - URL, используемый миграциями и backup.
 */
export const assertCompatibleDatabaseUrls = (runtimeUrl: string, directUrl: string): void => {
  const runtimeDatabase = getDatabaseName(runtimeUrl);
  const directDatabase = getDatabaseName(directUrl);

  if (runtimeDatabase && directDatabase && runtimeDatabase !== directDatabase) {
    throw new Error(
      `Database URL mismatch: runtime uses "${runtimeDatabase}", direct operations use "${directDatabase}"`
    );
  }
};

const findDirectDatabaseUrl = (environment: DatabaseEnvironment): string | undefined => {
  const explicitDirectUrl = getFirstDefinedValue(environment, [
    'DIRECT_DATABASE_URL',
    'POSTGRES_URL_NON_POOLING'
  ]);
  if (explicitDirectUrl) {
    return isDirectPostgresUrl(explicitDirectUrl) ? explicitDirectUrl : undefined;
  }

  const hasSeparateRuntimeUrl = Boolean(
    getFirstDefinedValue(environment, ['PRISMA_DATABASE_URL', 'POSTGRES_URL'])
  );
  if (hasSeparateRuntimeUrl) {
    return undefined;
  }

  const databaseUrl = environment.DATABASE_URL?.trim();
  return isDirectPostgresUrl(databaseUrl) ? databaseUrl : undefined;
};

/**
 * Возвращает URL runtime Prisma по единой политике проекта.
 * @param environment - переменные окружения.
 * @returns Accelerate или прямой PostgreSQL URL.
 */
export const resolvePrismaRuntimeDatabaseUrl = (
  environment: DatabaseEnvironment = process.env
): string => {
  const runtimeUrl = getFirstDefinedValue(environment, [
    'PRISMA_DATABASE_URL',
    'DATABASE_URL',
    'POSTGRES_URL'
  ]);

  if (!runtimeUrl) {
    throw new Error('PRISMA_DATABASE_URL, DATABASE_URL or POSTGRES_URL must be configured');
  }

  const directUrl = findDirectDatabaseUrl(environment);
  if (directUrl) {
    assertCompatibleDatabaseUrls(runtimeUrl, directUrl);
  }

  return runtimeUrl;
};

/**
 * Возвращает прямой PostgreSQL URL для Prisma CLI, backup и restore.
 * @param environment - переменные окружения.
 * @returns Прямой PostgreSQL URL.
 */
export const resolveDirectDatabaseUrl = (
  environment: DatabaseEnvironment = process.env
): string => {
  const directUrl = findDirectDatabaseUrl(environment);
  if (!directUrl) {
    throw new Error(
      'DIRECT_DATABASE_URL or POSTGRES_URL_NON_POOLING must contain a direct PostgreSQL URL when a separate runtime URL is configured; DATABASE_URL fallback is allowed only in local direct mode'
    );
  }

  const runtimeUrl = getFirstDefinedValue(environment, [
    'PRISMA_DATABASE_URL',
    'DATABASE_URL',
    'POSTGRES_URL'
  ]);
  if (runtimeUrl) {
    assertCompatibleDatabaseUrls(runtimeUrl, directUrl);
  }

  return directUrl;
};
