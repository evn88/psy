import { describe, expect, it } from 'vitest';

import { verifyAppliedMigrations } from '../../../scripts/verify-migration-checksums.mjs';

type MigrationRecord = {
  migrationName: string;
  checksum: string;
  finishedAt: Date | null;
  rolledBackAt: Date | null;
};

const legacyChecksums = new Map([
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

const toAppliedMigration = ([migrationName, checksum]: [string, string]): MigrationRecord => ({
  migrationName,
  checksum,
  finishedAt: new Date('2026-07-17T10:00:00.000Z'),
  rolledBackAt: null
});

describe('migration checksum policy', () => {
  it('принимает точную squashed-историю', () => {
    // Arrange
    const localChecksums = new Map([
      ['0_init', 'current-baseline'],
      ['20260717130000_add_workflow_lease', 'current-forward-migration']
    ]);
    const migrations = Array.from(localChecksums.entries(), toAppliedMigration);

    // Act + Assert
    expect(() => verifyAppliedMigrations(migrations, localChecksums)).not.toThrow();
  });

  it('принимает только полный legacy-профиль', () => {
    // Arrange
    const localChecksums = new Map([['0_init', 'current-baseline']]);
    const migrations = Array.from(legacyChecksums.entries(), toAppliedMigration);

    // Act + Assert
    expect(() => verifyAppliedMigrations(migrations, localChecksums)).not.toThrow();
  });

  it('отклоняет старый 0_init без полного набора legacy-миграций', () => {
    // Arrange
    const localChecksums = new Map([['0_init', 'current-baseline']]);
    const migrations = [toAppliedMigration(['0_init', legacyChecksums.get('0_init') ?? ''])];

    // Act + Assert
    expect(() => verifyAppliedMigrations(migrations, localChecksums)).toThrow(
      'отсутствует обязательная legacy-миграция'
    );
  });

  it('отклоняет смешанную и неизвестную историю', () => {
    // Arrange
    const localChecksums = new Map([['0_init', 'current-baseline']]);
    const migrations = [
      toAppliedMigration(['0_init', 'current-baseline']),
      toAppliedMigration([
        '20260408000432_client_intake',
        legacyChecksums.get('20260408000432_client_intake') ?? ''
      ])
    ];

    // Act + Assert
    expect(() => verifyAppliedMigrations(migrations, localChecksums)).toThrow(
      'legacy-миграция не допускается'
    );
  });
});
