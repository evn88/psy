CREATE TYPE "SystemLogCategory" AS ENUM ('API', 'AI', 'PAYMENT');

CREATE TYPE "SystemLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

CREATE TABLE "SystemLogEntry" (
  "id" TEXT NOT NULL,
  "category" "SystemLogCategory" NOT NULL,
  "level" "SystemLogLevel" NOT NULL,
  "source" TEXT NOT NULL,
  "operation" TEXT,
  "service" TEXT,
  "method" TEXT,
  "path" TEXT,
  "statusCode" INTEGER,
  "durationMs" INTEGER,
  "initiatorIp" TEXT,
  "userAgent" TEXT,
  "requestId" TEXT,
  "userId" TEXT,
  "requestBody" JSONB,
  "responseBody" JSONB,
  "errorName" TEXT,
  "errorMessage" TEXT,
  "errorStack" TEXT,
  "errorDetails" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SystemLogEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemLogSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "apiRequestsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "aiErrorsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "paymentErrorsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "retentionDays" INTEGER NOT NULL DEFAULT 30,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SystemLogSettings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SystemLogEntry_category_createdAt_idx" ON "SystemLogEntry"("category", "createdAt" DESC);
CREATE INDEX "SystemLogEntry_level_createdAt_idx" ON "SystemLogEntry"("level", "createdAt" DESC);
CREATE INDEX "SystemLogEntry_statusCode_idx" ON "SystemLogEntry"("statusCode");
CREATE INDEX "SystemLogEntry_path_idx" ON "SystemLogEntry"("path");
CREATE INDEX "SystemLogEntry_initiatorIp_idx" ON "SystemLogEntry"("initiatorIp");
CREATE INDEX "SystemLogEntry_userId_createdAt_idx" ON "SystemLogEntry"("userId", "createdAt" DESC);
CREATE INDEX "SystemLogEntry_createdAt_idx" ON "SystemLogEntry"("createdAt" DESC);

ALTER TABLE "SystemLogEntry"
ADD CONSTRAINT "SystemLogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "SystemLogSettings" ("id", "apiRequestsEnabled", "aiErrorsEnabled", "paymentErrorsEnabled", "retentionDays", "updatedAt")
VALUES ('default', true, true, true, 30, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
