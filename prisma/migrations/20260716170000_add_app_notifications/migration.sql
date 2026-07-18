CREATE TYPE "AppNotificationKind" AS ENUM ('INFO', 'WARNING', 'SUCCESS');

CREATE TABLE "AppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AppNotificationKind" NOT NULL DEFAULT 'INFO',
    "source" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppNotification_dedupeKey_key" ON "AppNotification"("dedupeKey");
CREATE INDEX "AppNotification_userId_readAt_dismissedAt_createdAt_idx"
    ON "AppNotification"("userId", "readAt", "dismissedAt", "createdAt" DESC);
CREATE INDEX "AppNotification_userId_createdAt_idx"
    ON "AppNotification"("userId", "createdAt" DESC);

ALTER TABLE "AppNotification"
    ADD CONSTRAINT "AppNotification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
