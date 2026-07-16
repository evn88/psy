-- AlterTable
ALTER TABLE "IntakeResponse" ADD COLUMN "formVersion" INTEGER;
ALTER TABLE "IntakeResponse" ADD COLUMN "formSnapshot" JSONB;

-- CreateTable
CREATE TABLE "IntakeFormConfiguration" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeFormConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntakeFormConfiguration_locale_key" ON "IntakeFormConfiguration"("locale");
