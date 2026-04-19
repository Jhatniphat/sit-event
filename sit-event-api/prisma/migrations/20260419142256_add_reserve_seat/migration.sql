-- AlterEnum
ALTER TYPE "RegistrationStatus" ADD VALUE 'RESERVE';

-- AlterTable
ALTER TABLE "event_sessions" ADD COLUMN     "enableReserve" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxReserveSeats" INTEGER;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "enableReserve" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxReserveSeats" INTEGER;
