ALTER TABLE "PilloMedication"
ADD COLUMN "lowStockNotifiedAt" TIMESTAMP(3),
ADD COLUMN "emptyStockNotifiedAt" TIMESTAMP(3);
