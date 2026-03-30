-- AlterEnum
ALTER TYPE "FormType" ADD VALUE 'OTHER';

-- DropIndex
DROP INDEX "event_forms_eventId_type_key";

-- AlterTable
ALTER TABLE "event_sessions" ALTER COLUMN "maxSeats" DROP NOT NULL,
ALTER COLUMN "availableSeats" DROP NOT NULL;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "maxSeats" INTEGER;
