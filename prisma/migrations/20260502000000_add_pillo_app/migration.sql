-- CreateEnum
CREATE TYPE "PilloIntakeStatus" AS ENUM ('PENDING', 'TAKEN', 'SKIPPED', 'MISSED');

-- CreateTable
CREATE TABLE "PilloMedication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "description" TEXT,
    "dosage" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "packagesCount" INTEGER NOT NULL DEFAULT 0,
    "unitsPerPackage" INTEGER,
    "stockUnits" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minThresholdUnits" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilloMedication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilloScheduleRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "doseUnits" DECIMAL(10,2) NOT NULL,
    "daysOfWeek" INTEGER[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "comment" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reminderWorkflowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilloScheduleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilloIntake" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "scheduleRuleId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "localDate" TEXT NOT NULL,
    "localTime" TEXT NOT NULL,
    "doseUnits" DECIMAL(10,2) NOT NULL,
    "status" "PilloIntakeStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "takenAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "missedAt" TIMESTAMP(3),
    "reminderWorkflowStartedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilloIntake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilloIntakeActionToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilloIntakeActionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilloUserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lowStockEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lowStockPushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilloUserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PilloMedication_userId_isActive_idx" ON "PilloMedication"("userId", "isActive");

-- CreateIndex
CREATE INDEX "PilloMedication_userId_name_idx" ON "PilloMedication"("userId", "name");

-- CreateIndex
CREATE INDEX "PilloScheduleRule_userId_isActive_idx" ON "PilloScheduleRule"("userId", "isActive");

-- CreateIndex
CREATE INDEX "PilloScheduleRule_medicationId_idx" ON "PilloScheduleRule"("medicationId");

-- CreateIndex
CREATE UNIQUE INDEX "PilloIntake_scheduleRuleId_scheduledFor_key" ON "PilloIntake"("scheduleRuleId", "scheduledFor");

-- CreateIndex
CREATE INDEX "PilloIntake_userId_scheduledFor_idx" ON "PilloIntake"("userId", "scheduledFor");

-- CreateIndex
CREATE INDEX "PilloIntake_userId_status_scheduledFor_idx" ON "PilloIntake"("userId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "PilloIntake_medicationId_idx" ON "PilloIntake"("medicationId");

-- CreateIndex
CREATE UNIQUE INDEX "PilloIntakeActionToken_tokenHash_key" ON "PilloIntakeActionToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PilloIntakeActionToken_intakeId_idx" ON "PilloIntakeActionToken"("intakeId");

-- CreateIndex
CREATE INDEX "PilloIntakeActionToken_userId_expiresAt_idx" ON "PilloIntakeActionToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PilloUserSettings_userId_key" ON "PilloUserSettings"("userId");

-- AddForeignKey
ALTER TABLE "PilloMedication" ADD CONSTRAINT "PilloMedication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilloScheduleRule" ADD CONSTRAINT "PilloScheduleRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilloScheduleRule" ADD CONSTRAINT "PilloScheduleRule_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "PilloMedication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilloIntake" ADD CONSTRAINT "PilloIntake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilloIntake" ADD CONSTRAINT "PilloIntake_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "PilloMedication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilloIntake" ADD CONSTRAINT "PilloIntake_scheduleRuleId_fkey" FOREIGN KEY ("scheduleRuleId") REFERENCES "PilloScheduleRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilloIntakeActionToken" ADD CONSTRAINT "PilloIntakeActionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilloIntakeActionToken" ADD CONSTRAINT "PilloIntakeActionToken_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "PilloIntake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilloUserSettings" ADD CONSTRAINT "PilloUserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
