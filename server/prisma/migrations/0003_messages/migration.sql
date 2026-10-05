-- Contact messages and pay-it-forward stories share the feedback inbox.
ALTER TABLE "Feedback" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'feedback';
ALTER TABLE "Feedback" ADD COLUMN "email" TEXT;
ALTER TABLE "Feedback" ADD COLUMN "subject" TEXT;

-- CreateIndex
CREATE INDEX "Feedback_kind_createdAt_idx" ON "Feedback"("kind", "createdAt");
