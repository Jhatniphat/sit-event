/*
  Warnings:

  - The values [StudentName] on the enum `FieldType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FieldType_new" AS ENUM ('ParticipantName', 'EventName', 'EventStartDate', 'EventEndDate', 'Date', 'SerialNumber', 'Text', 'Image');
ALTER TABLE "CertificateElement" ALTER COLUMN "fieldType" TYPE "FieldType_new" USING ("fieldType"::text::"FieldType_new");
ALTER TYPE "FieldType" RENAME TO "FieldType_old";
ALTER TYPE "FieldType_new" RENAME TO "FieldType";
DROP TYPE "public"."FieldType_old";
COMMIT;
