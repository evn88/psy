-- Add per-channel reminder markers so workflow retries do not duplicate a channel that was already delivered.
ALTER TABLE "PilloIntake"
ADD COLUMN "reminderEmailSentAt" TIMESTAMP(3),
ADD COLUMN "reminderPushSentAt" TIMESTAMP(3);

CREATE INDEX "PilloIntake_scheduledFor_reminderEmailSentAt_reminderPushSentAt_idx"
ON "PilloIntake"("scheduledFor", "reminderEmailSentAt", "reminderPushSentAt");

UPDATE "PilloIntake"
SET
  "reminderEmailSentAt" = "reminderSentAt",
  "reminderPushSentAt" = "reminderSentAt"
WHERE "reminderSentAt" IS NOT NULL;
