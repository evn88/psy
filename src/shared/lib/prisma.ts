import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Создает экземпляр PrismaClient с поддержкой Prisma Accelerate.
 */
const createPrismaClient = () => {
  const url = process.env.DATABASE_URL;

  // Если URL начинается с prisma:// или prisma+postgres://, используем accelerateUrl
  if (url && (url.startsWith('prisma://') || url.startsWith('prisma+postgres://'))) {
    return new PrismaClient({
      accelerateUrl: url
    }).$extends(withAccelerate());
  }

  // Иначе используем адаптер для прямого подключения (требуется для Prisma 7)
  // Удаляем sslmode из URL, чтобы избежать предупреждения pg, так как мы настраиваем ssl вручную
  const poolUrl = url ? url.replace(/([?&])sslmode=[^&]+&?/, '$1').replace(/[?&]$/, '') : url;

  const pool = new Pool({
    connectionString: poolUrl,
    ssl: process.env.NODE_ENV === 'development' ? { rejectUnauthorized: false } : true // true enforces SSL in production
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter
  }).$extends(withAccelerate());
};

const globalForPrisma = global as unknown as {
  prisma: ReturnType<typeof createPrismaClient>;
};

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
