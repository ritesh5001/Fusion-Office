-- Early testers thanked in the mobile app (invite-only sign-up page).
-- CreateTable
CREATE TABLE "Tester" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "usernameKey" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "photo" BYTEA NOT NULL,
    "photoType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tester_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tester_usernameKey_key" ON "Tester"("usernameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Tester_email_key" ON "Tester"("email");

-- CreateIndex
CREATE INDEX "Tester_visible_createdAt_idx" ON "Tester"("visible", "createdAt");

