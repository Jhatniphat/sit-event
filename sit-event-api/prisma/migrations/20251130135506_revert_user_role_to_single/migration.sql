-- Convert array field back to scalar
-- Take the first element of each array as the single role value
ALTER TABLE "users" ALTER COLUMN "userRole" SET DATA TYPE "UserRole" USING "userRole"[1];

-- Add default and NOT NULL constraint
ALTER TABLE "users" ALTER COLUMN "userRole" SET NOT NULL,
ALTER COLUMN "userRole" SET DEFAULT 'EXTERNAL_STUDENT';
