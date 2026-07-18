import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationsDirectory = join(projectRoot, 'prisma', 'migrations');

// До 2026-05-02 проект имел развёрнутую историю, затем она была сведена в 0_init.
// Разрешены только точные checksum обеих уже опубликованных веток истории.
const legacyMigrationChecksums = new Map([
  ['0_init', '19e0422fd0226b2fea21ea0e8c60d552eba918e5580042e3ef312244e2c0b79f'],
  [
    '20260408000432_client_intake',
    'f5b3cf81c0c5d8c4d870c03692a31d23b2c6d3571148999a4ea50fe062c9954b'
  ],
  [
    '20260408164448_add_filetype_to_client_document',
    '31158b77836adf8de7909ec7d85858d20349b8a138080b838aeb3814de309a61'
  ],
  [
    '20260414103000_paypal_payments',
    'e9598098d8462570faff5112c51e5bc72da66761d17a96c59f8604284c561a94'
  ],
  [
    '20260419014023_add_packages_and_balance',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  ],
  [
    '20260419014050_add_packages_and_balance',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  ],
  [
    '20260419014251_add_packages_and_balance',
    '7503bdff14edabf57b9afec6afac7c7245354f10a2e21687bf69298fd1a70e27'
  ],
  [
    '20260425223000_add_system_logs',
    'b51faabcd9d8d56561a2ba8b340ad4a6c05b6d5d18a1f26629e38dcb2141e53a'
  ],
  [
    '20260502000000_add_pillo_app',
    '8c7f9c86d65d922b401057a2d4008e616a0ea716e8a5c42a88b63f6572065158'
  ],
  [
    '20260502003348_add_medication_dosage_split',
    'cce8212b6237e853360d44ec22b21d43986da484a0774627454bb2ff1b3a385d'
  ],
  [
    '20260502023600_add_course_end_notified_at',
    '8f80fe228e13f2f09ea9a6c35c516fa92fb29db42d7e706c7ef5b59f90033ee9'
  ],
  [
    '20260502030000_add_pillo_low_stock_warning_days',
    'b36d664774c91ac913f4acc5a0f0dff34266554e498a3ec2cec624b7fdcdbf7f'
  ]
]);

const isDirectPostgresUrl = value =>
  Boolean(value && (value.startsWith('postgres://') || value.startsWith('postgresql://')));

const resolveDirectDatabaseUrl = () => {
  const explicitDirectUrl = [
    'DIRECT_DATABASE_URL',
    'POSTGRES_URL_NON_POOLING'
  ]
    .map(variableName => process.env[variableName]?.trim())
    .find(Boolean);

  if (explicitDirectUrl) {
    if (isDirectPostgresUrl(explicitDirectUrl)) {
      return explicitDirectUrl;
    }

    throw new Error('Явный direct URL для проверки миграций имеет неверный протокол.');
  }

  if (process.env.PRISMA_DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim()) {
    throw new Error(
      'При отдельном runtime URL требуется DIRECT_DATABASE_URL или POSTGRES_URL_NON_POOLING.'
    );
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (isDirectPostgresUrl(databaseUrl)) {
    return databaseUrl;
  }

  throw new Error('Для проверки миграций требуется прямой PostgreSQL URL.');
};

const calculateChecksum = value => createHash('sha256').update(value).digest('hex');

const loadLocalMigrationChecksums = async () => {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });
  const checksums = new Map();

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const migrationSql = await readFile(
      join(migrationsDirectory, entry.name, 'migration.sql')
    );
    checksums.set(entry.name, calculateChecksum(migrationSql));
  }

  return checksums;
};

export const verifyAppliedMigrations = (migrations, localChecksums) => {
  const problems = [];
  const appliedMigrations = new Map();

  for (const migration of migrations) {
    if (!migration.finishedAt && !migration.rolledBackAt) {
      problems.push(`${migration.migrationName}: применение не завершено`);
      continue;
    }

    if (migration.rolledBackAt) {
      continue;
    }

    if (appliedMigrations.has(migration.migrationName)) {
      problems.push(`${migration.migrationName}: обнаружено несколько завершённых применений`);
      continue;
    }

    appliedMigrations.set(migration.migrationName, migration.checksum);
  }

  if (appliedMigrations.size === 0) {
    if (problems.length > 0) {
      throw new Error(`Проверка истории миграций не пройдена:\n- ${problems.join('\n- ')}`);
    }
    return;
  }

  const localInitialChecksum = localChecksums.get('0_init');
  const databaseInitialChecksum = appliedMigrations.get('0_init');
  const legacyInitialChecksum = legacyMigrationChecksums.get('0_init');

  if (!localInitialChecksum) {
    problems.push('0_init: локальная baseline-миграция отсутствует');
  } else if (!databaseInitialChecksum) {
    problems.push('0_init: применённая baseline-миграция отсутствует');
  }

  const isSquashedHistory =
    Boolean(localInitialChecksum) && databaseInitialChecksum === localInitialChecksum;
  const isLegacyHistory =
    Boolean(legacyInitialChecksum) &&
    databaseInitialChecksum === legacyInitialChecksum &&
    legacyInitialChecksum !== localInitialChecksum;

  if (!isSquashedHistory && !isLegacyHistory && databaseInitialChecksum) {
    problems.push('0_init: checksum не соответствует ни одной полной опубликованной истории');
  }

  if (isSquashedHistory) {
    for (const legacyMigrationName of legacyMigrationChecksums.keys()) {
      if (legacyMigrationName !== '0_init' && appliedMigrations.has(legacyMigrationName)) {
        problems.push(
          `${legacyMigrationName}: legacy-миграция не допускается вместе со squashed 0_init`
        );
      }
    }
  }

  if (isLegacyHistory) {
    for (const [migrationName, expectedChecksum] of legacyMigrationChecksums.entries()) {
      const appliedChecksum = appliedMigrations.get(migrationName);

      if (!appliedChecksum) {
        problems.push(`${migrationName}: отсутствует обязательная legacy-миграция`);
      } else if (appliedChecksum !== expectedChecksum) {
        problems.push(`${migrationName}: checksum legacy-миграции изменён`);
      }
    }
  }

  for (const [migrationName, databaseChecksum] of appliedMigrations.entries()) {
    const localChecksum = localChecksums.get(migrationName);
    const isExactLocalMigration = localChecksum === databaseChecksum;
    const isExactLegacyMigration =
      isLegacyHistory && legacyMigrationChecksums.get(migrationName) === databaseChecksum;

    if (!isExactLocalMigration && !isExactLegacyMigration) {
      problems.push(`${migrationName}: неизвестный или изменённый checksum`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Проверка истории миграций не пройдена:\n- ${problems.join('\n- ')}`);
  }
};

const main = async () => {
  const connectionString = resolveDirectDatabaseUrl()
    .replace(/([?&])sslmode=[^&]+&?/, '$1')
    .replace(/[?&]$/, '');
  const pool = new Pool({
    connectionString,
    max: 1,
    ssl: process.env.NODE_ENV === 'development' ? { rejectUnauthorized: false } : true
  });

  try {
    const localChecksums = await loadLocalMigrationChecksums();
    let result;

    try {
      result = await pool.query(`
        SELECT
          "migration_name" AS "migrationName",
          "checksum",
          "finished_at" AS "finishedAt",
          "rolled_back_at" AS "rolledBackAt"
        FROM "_prisma_migrations"
        ORDER BY "started_at" ASC
      `);
    } catch (error) {
      if (error && typeof error === 'object' && error.code === '42P01') {
        console.info('Таблица _prisma_migrations ещё не создана; проверять нечего.');
        return;
      }

      throw error;
    }

    verifyAppliedMigrations(result.rows, localChecksums);
    console.info(`Checksum ${result.rows.length} записей истории миграций проверен.`);
  } finally {
    await pool.end();
  }
};

const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
