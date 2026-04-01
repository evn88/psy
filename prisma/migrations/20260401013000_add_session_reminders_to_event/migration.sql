-- AlterTable
ALTER TABLE "Event"
ADD COLUMN     "bookingReminderMinutesBeforeStart" INTEGER,
ADD COLUMN     "reminderEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "reminderMinutesBeforeStart" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "reminderPushSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Event_userId_status_start_idx" ON "Event"("userId", "status", "start");

-- CreateIndex
CREATE INDEX "Event_start_reminderEmailSentAt_reminderPushSentAt_idx" ON "Event"("start", "reminderEmailSentAt", "reminderPushSentAt");
