-- CreateEnum
CREATE TYPE "BackgroundType" AS ENUM ('PARTICLE', 'IMAGE');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('PRE_EVENT', 'REGISTRATION', 'IN_EVENT', 'OTHERS');

-- CreateTable
CREATE TABLE "suggestions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT,
    "eventId" TEXT,
    "backgroundType" "BackgroundType" NOT NULL DEFAULT 'PARTICLE',
    "backgroundImage" TEXT,
    "icons" TEXT[],
    "announcementType" "AnnouncementType" NOT NULL DEFAULT 'OTHERS',
    "startDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ,
    "contentDate" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
