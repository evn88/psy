-- AlterTable
ALTER TABLE "PilloMedication" ADD COLUMN     "dosageUnit" TEXT,
ADD COLUMN     "dosageValue" DECIMAL(10,2),
ALTER COLUMN "dosage" DROP NOT NULL;
