-- CreateEnum
CREATE TYPE "SystemAlertType" AS ENUM ('WORKFLOW_STEPS_THRESHOLD');

-- CreateTable
CREATE TABLE "SystemAlert" (
    "id" TEXT NOT NULL,
    "type" "SystemAlertType" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemAlert_type_periodKey_key" ON "SystemAlert"("type", "periodKey");
