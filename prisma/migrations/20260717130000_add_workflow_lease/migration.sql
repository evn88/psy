-- AddColumn
ALTER TABLE "PilloIntake"
ADD COLUMN "reminderPushClaimedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WorkflowLease" (
    "key" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowLease_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "WorkflowLease_expiresAt_idx" ON "WorkflowLease"("expiresAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "DatabaseIdentity" (
    "key" TEXT NOT NULL DEFAULT 'primary',
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatabaseIdentity_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DatabaseIdentity_instanceId_key"
ON "DatabaseIdentity"("instanceId");

-- SeedSingleton
INSERT INTO "DatabaseIdentity" ("key", "instanceId")
VALUES (
    'primary',
    md5(
        random()::text
        || clock_timestamp()::text
        || pg_backend_pid()::text
        || current_database()
    )
)
ON CONFLICT ("key") DO NOTHING;
