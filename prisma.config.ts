import { defineConfig } from 'prisma/config';
import 'dotenv/config';
import { resolveDirectDatabaseUrl } from './src/lib/database-url';

/**
 * Конфигурация Prisma для CLI инструментов.
 */
export default defineConfig({
  datasource: {
    url: resolveDirectDatabaseUrl()
  }
});
