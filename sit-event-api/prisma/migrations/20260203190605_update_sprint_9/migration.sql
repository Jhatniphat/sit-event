/*
  Warnings:

  - A unique constraint covering the columns `[eventId,type]` on the table `event_forms` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "FormType" AS ENUM ('PRE_EVENT', 'POST_EVENT');

-- DropIndex
DROP INDEX "event_forms_eventId_key";

-- AlterTable
ALTER TABLE "event_forms" ADD COLUMN     "type" "FormType" NOT NULL DEFAULT 'POST_EVENT';

-- AlterTable
ALTER TABLE "event_sessions" ADD COLUMN     "autoRegister" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "event_forms_eventId_type_key" ON "event_forms"("eventId", "type");
