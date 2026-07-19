import { describe, expect, it } from 'vitest';

import {
  resolveDirectDatabaseUrl,
  resolveDirectDatabaseUrlIfConfigured,
  resolvePrismaRuntimeDatabaseUrl
} from '../database-url';

describe('database URL policy', () => {
  it('использует отдельные runtime и direct URL по назначению', () => {
    // Arrange
    const environment = {
      PRISMA_DATABASE_URL: 'prisma://accelerate.example.test/?api_key=test',
      DIRECT_DATABASE_URL: 'postgresql://user:pass@db.example.test:5432/app'
    };

    // Act + Assert
    expect(resolvePrismaRuntimeDatabaseUrl(environment)).toBe(environment.PRISMA_DATABASE_URL);
    expect(resolveDirectDatabaseUrl(environment)).toBe(environment.DIRECT_DATABASE_URL);
  });

  it('использует одинаковый fallback для CLI и runtime без Accelerate', () => {
    // Arrange
    const environment = {
      DATABASE_URL: 'postgresql://user:pass@db.example.test:5432/app'
    };

    // Act + Assert
    expect(resolvePrismaRuntimeDatabaseUrl(environment)).toBe(environment.DATABASE_URL);
    expect(resolveDirectDatabaseUrl(environment)).toBe(environment.DATABASE_URL);
  });

  it('останавливает запуск при разных именах runtime и direct БД', () => {
    // Arrange
    const environment = {
      PRISMA_DATABASE_URL: 'postgresql://user:pass@pool.example.test:5432/runtime_db',
      DIRECT_DATABASE_URL: 'postgresql://user:pass@db.example.test:5432/backup_db'
    };

    // Act + Assert
    expect(() => resolvePrismaRuntimeDatabaseUrl(environment)).toThrow('Database URL mismatch');
    expect(() => resolveDirectDatabaseUrl(environment)).toThrow('Database URL mismatch');
  });

  it('не разрешает Accelerate URL для миграций и backup', () => {
    // Arrange
    const environment = {
      PRISMA_DATABASE_URL: 'prisma://accelerate.example.test/?api_key=test'
    };

    // Act + Assert
    expect(() => resolveDirectDatabaseUrl(environment)).toThrow(
      'must contain a direct PostgreSQL URL'
    );
  });

  it('предпочитает прямой DATABASE_URL потенциально pooled POSTGRES_URL', () => {
    // Arrange
    const environment = {
      POSTGRES_URL: 'postgresql://user:pass@pool.example.test:5432/app',
      DATABASE_URL: 'postgresql://user:pass@db.example.test:5432/app'
    };

    // Act + Assert
    expect(resolveDirectDatabaseUrl(environment)).toBe(environment.DATABASE_URL);
  });

  it('останавливает direct-операцию, если настроен только POSTGRES_URL', () => {
    // Arrange
    const environment = {
      POSTGRES_URL: 'postgresql://user:pass@pool.example.test:5432/app'
    };

    // Act + Assert
    expect(() => resolveDirectDatabaseUrl(environment)).toThrow(
      'must contain a direct PostgreSQL URL'
    );
  });

  it('использует прямой DATABASE_URL рядом с Prisma runtime URL', () => {
    // Arrange
    const environment = {
      PRISMA_DATABASE_URL: 'prisma://accelerate.example.test/?api_key=test',
      DATABASE_URL: 'postgresql://user:pass@db.example.test:5432/app'
    };

    // Act + Assert
    expect(resolveDirectDatabaseUrl(environment)).toBe(environment.DATABASE_URL);
  });

  it('возвращает DATABASE_URL для Prisma CLI рядом с runtime URL', () => {
    // Arrange
    const environment = {
      PRISMA_DATABASE_URL: 'prisma://accelerate.example.test/?api_key=test',
      DATABASE_URL: 'postgresql://user:pass@db.example.test:5432/app'
    };

    // Act + Assert
    expect(resolveDirectDatabaseUrlIfConfigured(environment)).toBe(environment.DATABASE_URL);
  });

  it('не скрывает ошибочный протокол явно настроенного direct URL', () => {
    // Arrange
    const environment = {
      PRISMA_DATABASE_URL: 'prisma://accelerate.example.test/?api_key=test',
      DIRECT_DATABASE_URL: 'https://db.example.test/app'
    };

    // Act + Assert
    expect(() => resolveDirectDatabaseUrlIfConfigured(environment)).toThrow('unsupported protocol');
  });
});
