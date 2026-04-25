-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYPAL');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM (
  'CHECKOUT',
  'SUBSCRIPTION',
  'SUBSCRIPTION_RENEWAL',
  'REFUND',
  'DISPUTE'
);

-- CreateTable
CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYPAL',
  "kind" "PaymentKind" NOT NULL DEFAULT 'CHECKOUT',
  "userId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "captureId" TEXT,
  "subscriptionId" TEXT,
  "invoiceId" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "description" TEXT,
  "payerEmail" TEXT,
  "rawOrder" JSONB,
  "rawCapture" JSONB,
  "capturedAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYPAL',
  "paymentId" TEXT,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "orderId" TEXT,
  "captureId" TEXT,
  "subscriptionId" TEXT,
  "disputeId" TEXT,
  "status" TEXT,
  "amount" DECIMAL(12,2),
  "currency" TEXT,
  "occurredAt" TIMESTAMP(3),
  "payload" JSONB NOT NULL,
  "isProcessed" BOOLEAN NOT NULL DEFAULT false,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentDispute" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT,
  "disputeId" TEXT NOT NULL,
  "stage" TEXT,
  "status" TEXT NOT NULL,
  "reason" TEXT,
  "amount" DECIMAL(12,2),
  "currency" TEXT,
  "responseDueAt" TIMESTAMP(3),
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_captureId_key" ON "Payment"("captureId");

-- CreateIndex
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_providerEventId_key" ON "PaymentEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_createdAt_idx" ON "PaymentEvent"("paymentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PaymentEvent_orderId_idx" ON "PaymentEvent"("orderId");

-- CreateIndex
CREATE INDEX "PaymentEvent_captureId_idx" ON "PaymentEvent"("captureId");

-- CreateIndex
CREATE INDEX "PaymentEvent_subscriptionId_idx" ON "PaymentEvent"("subscriptionId");

-- CreateIndex
CREATE INDEX "PaymentEvent_disputeId_idx" ON "PaymentEvent"("disputeId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentDispute_disputeId_key" ON "PaymentDispute"("disputeId");

-- CreateIndex
CREATE INDEX "PaymentDispute_paymentId_idx" ON "PaymentDispute"("paymentId");

-- AddForeignKey
ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent"
ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDispute"
ADD CONSTRAINT "PaymentDispute_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
