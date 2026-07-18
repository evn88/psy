ALTER TABLE "User"
ADD COLUMN "googleCalendarAccessToken" TEXT,
ADD COLUMN "googleCalendarRefreshToken" TEXT,
ADD COLUMN "googleCalendarTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "googleCalendarId" TEXT,
ADD COLUMN "googleCalendarName" TEXT;
