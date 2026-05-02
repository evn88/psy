-- CreateTable
CREATE TABLE "PilloManualIntake" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "doseUnits" DECIMAL(10,2) NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localDate" TEXT NOT NULL,
    "localTime" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilloManualIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PilloManualIntake_userId_takenAt_idx" ON "PilloManualIntake"("userId", "takenAt");

-- CreateIndex
CREATE INDEX "PilloManualIntake_userId_localDate_idx" ON "PilloManualIntake"("userId", "localDate");

-- CreateIndex
CREATE INDEX "PilloManualIntake_medicationId_idx" ON "PilloManualIntake"("medicationId");

-- AddForeignKey
ALTER TABLE "PilloManualIntake" ADD CONSTRAINT "PilloManualIntake_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "PilloMedication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilloManualIntake" ADD CONSTRAINT "PilloManualIntake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
