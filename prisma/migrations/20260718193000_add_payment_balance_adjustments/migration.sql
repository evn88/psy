BEGIN;

ALTER TABLE "Payment"
ADD COLUMN "balanceCreditedAt" TIMESTAMP(3),
ADD COLUMN "refundedAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0;

UPDATE "Payment"
SET "balanceCreditedAt" = COALESCE("capturedAt", "updatedAt")
WHERE "kind" = 'TOPUP'
  AND (
    "status" IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'REVERSED')
    OR "capturedAt" IS NOT NULL
    OR "rawCapture"->>'status' = 'COMPLETED'
  );

WITH "refundTotals" AS (
  SELECT
    payment."id" AS "paymentId",
    LEAST(
      payment."amount",
      COALESCE(SUM(event."amount"), 0)
    ) AS "refundedAmount",
    BOOL_OR(event."eventType" = 'PAYMENT.CAPTURE.REVERSED') AS "isReversed"
  FROM "Payment" AS payment
  INNER JOIN "PaymentEvent" AS event
    ON event."paymentId" = payment."id"
  WHERE payment."kind" = 'TOPUP'
    AND payment."balanceCreditedAt" IS NOT NULL
    AND event."isProcessed" = TRUE
    AND event."amount" IS NOT NULL
    AND event."eventType" IN (
      'PAYMENT.CAPTURE.REFUNDED',
      'PAYMENT.CAPTURE.REVERSED',
      'PAYMENT.REFUND.COMPLETED'
    )
  GROUP BY payment."id", payment."amount"
)
UPDATE "Payment" AS payment
SET
  "refundedAmount" = totals."refundedAmount",
  "status" = CASE
    WHEN totals."refundedAmount" >= payment."amount" AND totals."isReversed" THEN 'REVERSED'
    WHEN totals."refundedAmount" >= payment."amount" THEN 'REFUNDED'
    ELSE 'PARTIALLY_REFUNDED'
  END
FROM "refundTotals" AS totals
WHERE payment."id" = totals."paymentId"
  AND totals."refundedAmount" > 0;

WITH "userRefundTotals" AS (
  SELECT
    "userId",
    SUM("refundedAmount") AS "refundedAmount"
  FROM "Payment"
  WHERE "kind" = 'TOPUP'
    AND "balanceCreditedAt" IS NOT NULL
    AND "refundedAmount" > 0
  GROUP BY "userId"
)
UPDATE "User" AS appUser
SET "balance" = appUser."balance" - totals."refundedAmount"
FROM "userRefundTotals" AS totals
WHERE appUser."id" = totals."userId";

COMMIT;
