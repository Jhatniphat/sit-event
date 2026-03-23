-- CreateEnum
CREATE TYPE "StaffPermissionType" AS ENUM ('CHECK_IN');

-- CreateTable
CREATE TABLE "event_staff_scopes" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "sessionId" TEXT,
    "permission" "StaffPermissionType" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_staff_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_staff_scopes_staffId_sessionId_permission_key" ON "event_staff_scopes"("staffId", "sessionId", "permission");

-- AddForeignKey
ALTER TABLE "event_staff_scopes" ADD CONSTRAINT "event_staff_scopes_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "event_staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff_scopes" ADD CONSTRAINT "event_staff_scopes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "event_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
