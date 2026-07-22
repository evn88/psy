-- AlterTable
ALTER TABLE "Event" ADD COLUMN "rescheduleFromEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_rescheduleFromEventId_key" ON "Event"("rescheduleFromEventId");

-- AddForeignKey
ALTER TABLE "Event"
ADD CONSTRAINT "Event_rescheduleFromEventId_fkey"
FOREIGN KEY ("rescheduleFromEventId") REFERENCES "Event"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
