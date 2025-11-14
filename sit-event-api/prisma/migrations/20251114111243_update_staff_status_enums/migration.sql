-- AlterEnum
ALTER TYPE "StaffStatus" ADD VALUE 'WITHDRAWN';

-- AlterTable
ALTER TABLE "event_staff" ALTER COLUMN "status" SET DEFAULT 'PENDING';
