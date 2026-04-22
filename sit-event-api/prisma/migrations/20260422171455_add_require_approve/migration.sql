-- AlterTable
ALTER TABLE "event_sessions" ADD COLUMN     "requireApprove" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "requireApprove" BOOLEAN NOT NULL DEFAULT false;
