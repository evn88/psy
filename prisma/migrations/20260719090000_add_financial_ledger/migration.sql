BEGIN;

CREATE TYPE "FinancialOperationType" AS ENUM (
  'MIGRATION_OPENING_BALANCE',
  'TOPUP',
  'PACKAGE_PURCHASE',
  'PACKAGE_PURCHASE_REVERSAL',
  'CONSULTATION_CHARGE',
  'CONSULTATION_REVERSAL',
  'PROVIDER_REFUND',
  'MANUAL_ADJUSTMENT'
);

CREATE TYPE "FinancialOperationStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REVERSED',
  'REQUIRES_REVIEW'
);

CREATE TYPE "WalletTransactionType" AS ENUM (
  'MIGRATION_OPENING_BALANCE',
  'TOPUP',
  'PACKAGE_PURCHASE',
  'PACKAGE_PURCHASE_REVERSAL',
  'CONSULTATION_CHARGE',
  'CONSULTATION_REVERSAL',
  'PROVIDER_REFUND',
  'MANUAL_ADJUSTMENT'
);

CREATE TYPE "PurchasedPackageStatus" AS ENUM (
  'ACTIVE',
  'EXHAUSTED',
  'EXPIRED',
  'SUSPENDED',
  'REVOKED'
);

CREATE TYPE "PackageTransactionType" AS ENUM (
  'PURCHASE_CREDIT',
  'CONSULTATION_DEBIT',
  'CONSULTATION_REVERSAL',
  'MANUAL_ADJUSTMENT',
  'EXPIRATION',
  'REVOCATION'
);

CREATE TYPE "EventBillingSource" AS ENUM (
  'WALLET',
  'PACKAGE',
  'COMPLIMENTARY'
);

CREATE TYPE "BillingAllocationStatus" AS ENUM (
  'RESERVED',
  'SETTLED',
  'REVERSED'
);

CREATE TYPE "FinancialEmailTemplate" AS ENUM (
  'BALANCE_TOPUP',
  'PACKAGE_PURCHASE',
  'CONSULTATION_CHARGE',
  'CONSULTATION_REVERSAL',
  'PROVIDER_REFUND',
  'MANUAL_ADJUSTMENT',
  'ADMIN_PAYMENT_RECEIVED',
  'ADMIN_REFUND'
);

CREATE TYPE "FinancialEmailStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED'
);

ALTER TABLE "ServicePackage"
ADD COLUMN "includedMinutes" INTEGER NOT NULL DEFAULT 60;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ServicePackage"
    WHERE UPPER("currency") <> 'EUR'
  ) THEN
    RAISE EXCEPTION
      'ServicePackage contains non-EUR rows. Convert prices manually before applying the financial ledger migration.';
  END IF;
END
$$;

UPDATE "ServicePackage"
SET "currency" = UPPER("currency");

ALTER TABLE "ServicePackage"
ADD CONSTRAINT "ServicePackage_currency_check" CHECK ("currency" = 'EUR'),
ADD CONSTRAINT "ServicePackage_included_minutes_check" CHECK ("includedMinutes" > 0);

ALTER TABLE "Payment"
ADD COLUMN "fulfilledAt" TIMESTAMP(3);

CREATE TABLE "FinancialOperation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "FinancialOperationType" NOT NULL,
  "status" "FinancialOperationStatus" NOT NULL DEFAULT 'PENDING',
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "paymentId" TEXT,
  "eventId" TEXT,
  "initiatedById" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "correlationId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancialOperation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinancialOperation_currency_check" CHECK ("currency" = 'EUR')
);

CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "type" "WalletTransactionType" NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "balanceBefore" DECIMAL(12, 2) NOT NULL,
  "balanceAfter" DECIMAL(12, 2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WalletTransaction_currency_check" CHECK ("currency" = 'EUR'),
  CONSTRAINT "WalletTransaction_amount_check" CHECK ("amount" <> 0)
);

CREATE TABLE "PurchasedPackage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "servicePackageId" TEXT,
  "purchaseOperationId" TEXT NOT NULL,
  "titleSnapshot" JSONB NOT NULL,
  "priceSnapshot" DECIMAL(12, 2) NOT NULL,
  "currencySnapshot" TEXT NOT NULL DEFAULT 'EUR',
  "totalMinutes" INTEGER NOT NULL,
  "remainingMinutes" INTEGER NOT NULL,
  "status" "PurchasedPackageStatus" NOT NULL DEFAULT 'ACTIVE',
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PurchasedPackage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchasedPackage_currency_check" CHECK ("currencySnapshot" = 'EUR'),
  CONSTRAINT "PurchasedPackage_total_minutes_check" CHECK ("totalMinutes" > 0),
  CONSTRAINT "PurchasedPackage_remaining_minutes_check" CHECK (
    "remainingMinutes" >= 0
    AND "remainingMinutes" <= "totalMinutes"
  )
);

CREATE TABLE "PackageTransaction" (
  "id" TEXT NOT NULL,
  "purchasedPackageId" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "eventId" TEXT,
  "type" "PackageTransactionType" NOT NULL,
  "minutes" INTEGER NOT NULL,
  "remainingBefore" INTEGER NOT NULL,
  "remainingAfter" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PackageTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PackageTransaction_minutes_check" CHECK ("minutes" <> 0),
  CONSTRAINT "PackageTransaction_remaining_check" CHECK (
    "remainingBefore" >= 0
    AND "remainingAfter" >= 0
  )
);

CREATE TABLE "EventBillingAllocation" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "chargeOperationId" TEXT NOT NULL,
  "source" "EventBillingSource" NOT NULL,
  "status" "BillingAllocationStatus" NOT NULL DEFAULT 'RESERVED',
  "chargedMinutes" INTEGER NOT NULL,
  "chargedAmount" DECIMAL(12, 2),
  "currency" TEXT DEFAULT 'EUR',
  "purchasedPackageId" TEXT,
  "pricingSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventBillingAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EventBillingAllocation_currency_check" CHECK (
    "currency" IS NULL
    OR "currency" = 'EUR'
  ),
  CONSTRAINT "EventBillingAllocation_minutes_check" CHECK ("chargedMinutes" > 0)
);

CREATE TABLE "ConsultationRate" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConsultationRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConsultationRate_currency_check" CHECK ("currency" = 'EUR'),
  CONSTRAINT "ConsultationRate_amount_check" CHECK ("amount" >= 0)
);

CREATE TABLE "FinancialEmailOutbox" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "template" "FinancialEmailTemplate" NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "recipientName" TEXT,
  "locale" TEXT NOT NULL DEFAULT 'ru',
  "payload" JSONB NOT NULL,
  "status" "FinancialEmailStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimedAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancialEmailOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialOperation_idempotencyKey_key"
ON "FinancialOperation"("idempotencyKey");

CREATE INDEX "FinancialOperation_userId_createdAt_idx"
ON "FinancialOperation"("userId", "createdAt" DESC);

CREATE INDEX "FinancialOperation_type_status_createdAt_idx"
ON "FinancialOperation"("type", "status", "createdAt" DESC);

CREATE INDEX "FinancialOperation_paymentId_createdAt_idx"
ON "FinancialOperation"("paymentId", "createdAt" DESC);

CREATE INDEX "FinancialOperation_eventId_idx"
ON "FinancialOperation"("eventId");

CREATE INDEX "WalletTransaction_userId_createdAt_idx"
ON "WalletTransaction"("userId", "createdAt" DESC);

CREATE INDEX "WalletTransaction_operationId_idx"
ON "WalletTransaction"("operationId");

CREATE UNIQUE INDEX "PurchasedPackage_purchaseOperationId_key"
ON "PurchasedPackage"("purchaseOperationId");

CREATE INDEX "PurchasedPackage_userId_status_purchasedAt_idx"
ON "PurchasedPackage"("userId", "status", "purchasedAt" DESC);

CREATE INDEX "PurchasedPackage_servicePackageId_idx"
ON "PurchasedPackage"("servicePackageId");

CREATE INDEX "PackageTransaction_purchasedPackageId_createdAt_idx"
ON "PackageTransaction"("purchasedPackageId", "createdAt" DESC);

CREATE INDEX "PackageTransaction_operationId_idx"
ON "PackageTransaction"("operationId");

CREATE INDEX "PackageTransaction_eventId_idx"
ON "PackageTransaction"("eventId");

CREATE UNIQUE INDEX "EventBillingAllocation_eventId_key"
ON "EventBillingAllocation"("eventId");

CREATE UNIQUE INDEX "EventBillingAllocation_chargeOperationId_key"
ON "EventBillingAllocation"("chargeOperationId");

CREATE INDEX "EventBillingAllocation_userId_createdAt_idx"
ON "EventBillingAllocation"("userId", "createdAt" DESC);

CREATE INDEX "EventBillingAllocation_purchasedPackageId_idx"
ON "EventBillingAllocation"("purchasedPackageId");

CREATE UNIQUE INDEX "FinancialEmailOutbox_dedupeKey_key"
ON "FinancialEmailOutbox"("dedupeKey");

CREATE INDEX "FinancialEmailOutbox_status_nextAttemptAt_idx"
ON "FinancialEmailOutbox"("status", "nextAttemptAt");

CREATE INDEX "FinancialEmailOutbox_operationId_idx"
ON "FinancialEmailOutbox"("operationId");

ALTER TABLE "FinancialOperation"
ADD CONSTRAINT "FinancialOperation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinancialOperation"
ADD CONSTRAINT "FinancialOperation_initiatedById_fkey"
FOREIGN KEY ("initiatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancialOperation"
ADD CONSTRAINT "FinancialOperation_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancialOperation"
ADD CONSTRAINT "FinancialOperation_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
ADD CONSTRAINT "WalletTransaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
ADD CONSTRAINT "WalletTransaction_operationId_fkey"
FOREIGN KEY ("operationId") REFERENCES "FinancialOperation"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchasedPackage"
ADD CONSTRAINT "PurchasedPackage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchasedPackage"
ADD CONSTRAINT "PurchasedPackage_servicePackageId_fkey"
FOREIGN KEY ("servicePackageId") REFERENCES "ServicePackage"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchasedPackage"
ADD CONSTRAINT "PurchasedPackage_purchaseOperationId_fkey"
FOREIGN KEY ("purchaseOperationId") REFERENCES "FinancialOperation"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PackageTransaction"
ADD CONSTRAINT "PackageTransaction_purchasedPackageId_fkey"
FOREIGN KEY ("purchasedPackageId") REFERENCES "PurchasedPackage"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PackageTransaction"
ADD CONSTRAINT "PackageTransaction_operationId_fkey"
FOREIGN KEY ("operationId") REFERENCES "FinancialOperation"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PackageTransaction"
ADD CONSTRAINT "PackageTransaction_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventBillingAllocation"
ADD CONSTRAINT "EventBillingAllocation_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventBillingAllocation"
ADD CONSTRAINT "EventBillingAllocation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventBillingAllocation"
ADD CONSTRAINT "EventBillingAllocation_chargeOperationId_fkey"
FOREIGN KEY ("chargeOperationId") REFERENCES "FinancialOperation"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventBillingAllocation"
ADD CONSTRAINT "EventBillingAllocation_purchasedPackageId_fkey"
FOREIGN KEY ("purchasedPackageId") REFERENCES "PurchasedPackage"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConsultationRate"
ADD CONSTRAINT "ConsultationRate_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancialEmailOutbox"
ADD CONSTRAINT "FinancialEmailOutbox_operationId_fkey"
FOREIGN KEY ("operationId") REFERENCES "FinancialOperation"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ConsultationRate" (
  "id",
  "amount",
  "currency",
  "createdAt",
  "updatedAt"
)
VALUES (
  'default',
  0,
  'EUR',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "FinancialOperation" (
  "id",
  "userId",
  "type",
  "status",
  "currency",
  "idempotencyKey",
  "reason",
  "completedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  'migration-opening-operation-' || app_user."id",
  app_user."id",
  'MIGRATION_OPENING_BALANCE',
  'COMPLETED',
  'EUR',
  'migration-opening-balance:' || app_user."id",
  'Opening balance imported from User.balance',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" AS app_user
WHERE app_user."balance" <> 0;

INSERT INTO "WalletTransaction" (
  "id",
  "userId",
  "operationId",
  "type",
  "amount",
  "currency",
  "balanceBefore",
  "balanceAfter",
  "createdAt"
)
SELECT
  'migration-opening-wallet-' || app_user."id",
  app_user."id",
  'migration-opening-operation-' || app_user."id",
  'MIGRATION_OPENING_BALANCE',
  app_user."balance",
  'EUR',
  0,
  app_user."balance",
  CURRENT_TIMESTAMP
FROM "User" AS app_user
WHERE app_user."balance" <> 0;

COMMIT;
