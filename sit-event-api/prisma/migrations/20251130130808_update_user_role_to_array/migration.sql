/*
  Warnings:

  - Changed the column `userRole` on the `users` table from a scalar field to a list field. If there are non-null values in that column, this step will fail.

*/
-- AlterTable: Convert single UserRole to array
ALTER TABLE "users" ALTER COLUMN "userRole" DROP DEFAULT;

-- Update existing data: wrap single values in array using USING clause
ALTER TABLE "users" ALTER COLUMN "userRole" SET DATA TYPE "UserRole"[] USING ARRAY["userRole"]::"UserRole"[];
