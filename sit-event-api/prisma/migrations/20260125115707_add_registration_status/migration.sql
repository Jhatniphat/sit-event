-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "event_registrations" ADD COLUMN     "approvedAt" TIMESTAMPTZ,
ADD COLUMN     "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING';
