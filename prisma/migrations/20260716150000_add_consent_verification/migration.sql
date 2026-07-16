-- AlterTable
ALTER TABLE "ClientConsent" ADD COLUMN "signatureKeyId" TEXT;
ALTER TABLE "ClientConsent" ADD COLUMN "signaturePayload" JSONB;

-- AlterTable
ALTER TABLE "IntakeResponse" ADD COLUMN "consentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "IntakeResponse_consentId_key" ON "IntakeResponse"("consentId");

-- AddForeignKey
ALTER TABLE "IntakeResponse" ADD CONSTRAINT "IntakeResponse_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "ClientConsent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
