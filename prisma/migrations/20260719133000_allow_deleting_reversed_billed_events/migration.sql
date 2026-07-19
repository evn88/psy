ALTER TABLE "EventBillingAllocation"
DROP CONSTRAINT "EventBillingAllocation_eventId_fkey";

ALTER TABLE "EventBillingAllocation"
ALTER COLUMN "eventId" DROP NOT NULL;

ALTER TABLE "EventBillingAllocation"
ADD CONSTRAINT "EventBillingAllocation_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
