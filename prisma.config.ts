import { defineConfig } from 'prisma/config';
import 'dotenv/config';

/**
 * Конфигурация Prisma для CLI инструментов.
 */
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL
  }
});
