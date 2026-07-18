-- Платёжные провайдеры становятся расширяемыми строковыми идентификаторами.
ALTER TABLE "Payment"
  ALTER COLUMN "provider" DROP DEFAULT,
  ALTER COLUMN "provider" TYPE TEXT USING "provider"::TEXT,
  ALTER COLUMN "provider" SET DEFAULT 'PAYPAL';

ALTER TABLE "PaymentEvent"
  ALTER COLUMN "provider" DROP DEFAULT,
  ALTER COLUMN "provider" TYPE TEXT USING "provider"::TEXT,
  ALTER COLUMN "provider" SET DEFAULT 'PAYPAL';

ALTER TABLE "PaymentDispute"
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'PAYPAL';

DROP TYPE "PaymentProvider";

DROP INDEX "Payment_orderId_key";
DROP INDEX "Payment_captureId_key";
DROP INDEX "PaymentEvent_providerEventId_key";
DROP INDEX "PaymentDispute_disputeId_key";

CREATE UNIQUE INDEX "Payment_provider_orderId_key"
  ON "Payment" ("provider", "orderId");

CREATE UNIQUE INDEX "Payment_provider_captureId_key"
  ON "Payment" ("provider", "captureId");

CREATE UNIQUE INDEX "PaymentEvent_provider_providerEventId_key"
  ON "PaymentEvent" ("provider", "providerEventId");

CREATE UNIQUE INDEX "PaymentDispute_provider_disputeId_key"
  ON "PaymentDispute" ("provider", "disputeId");

CREATE TABLE "PaymentProviderConfig" (
  "id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "settings" JSONB,
  "lastHealthStatus" TEXT,
  "lastHealthMessage" TEXT,
  "lastHealthCheckedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentProviderConfig_single_default_key"
  ON "PaymentProviderConfig" ("isDefault")
  WHERE "isDefault" = true;

INSERT INTO "PaymentProviderConfig" (
  "id",
  "enabled",
  "isDefault",
  "updatedAt"
)
VALUES (
  'PAYPAL',
  true,
  true,
  CURRENT_TIMESTAMP
);
