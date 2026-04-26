/*
  Warnings:

  - The values [RESERVE] on the enum `RegistrationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RegistrationStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RESERVED');
ALTER TABLE "public"."event_registrations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "event_registrations" ALTER COLUMN "status" TYPE "RegistrationStatus_new" USING ("status"::text::"RegistrationStatus_new");
ALTER TYPE "RegistrationStatus" RENAME TO "RegistrationStatus_old";
ALTER TYPE "RegistrationStatus_new" RENAME TO "RegistrationStatus";
DROP TYPE "public"."RegistrationStatus_old";
ALTER TABLE "event_registrations" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
