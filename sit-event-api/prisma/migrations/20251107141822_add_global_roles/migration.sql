/*
  Warnings:

  - You are about to drop the column `role` on the `event_staff` table. All the data in the column will be lost.
  - The `roleInSchool` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `eventRole` to the `event_staff` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ORGANIZER', 'INTERNAL_STUDENT', 'EXTERNAL_STUDENT');

-- CreateEnum
CREATE TYPE "RoleInSchool" AS ENUM ('STUDENT', 'TEACHER', 'STAFF');

-- AlterTable
ALTER TABLE "event_staff" DROP COLUMN "role",
ADD COLUMN     "eventRole" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "userRole" "UserRole" NOT NULL DEFAULT 'EXTERNAL_STUDENT',
DROP COLUMN "roleInSchool",
ADD COLUMN     "roleInSchool" "RoleInSchool";

-- DropEnum
DROP TYPE "public"."Role";
