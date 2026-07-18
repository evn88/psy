import { defineConfig } from 'prisma/config';
import 'dotenv/config';
import { resolveDirectDatabaseUrlIfConfigured } from './src/lib/database-url';

/**
 * Конфигурация Prisma для CLI инструментов.
 * Генерация клиента не требует подключения к БД, поэтому Vercel build может
 * работать только с runtime URL. Миграции по-прежнему получают datasource
 * исключительно из явного direct URL.
 */
const directDatabaseUrl = resolveDirectDatabaseUrlIfConfigured();

export default defineConfig({
  ...(directDatabaseUrl
    ? {
        datasource: {
          url: directDatabaseUrl
        }
      }
    : {})
});
