-- CreateTable
CREATE TABLE IF NOT EXISTS "FeedbackStatusHistory" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "oldStatus" "FeedbackStatus",
    "newStatus" "FeedbackStatus" NOT NULL,
    "internalNote" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeedbackStatusHistory_feedbackId_idx" ON "FeedbackStatusHistory"("feedbackId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeedbackStatusHistory_createdAt_idx" ON "FeedbackStatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeedbackStatusHistory_changedBy_idx" ON "FeedbackStatusHistory"("changedBy");

-- AddForeignKey
ALTER TABLE "FeedbackStatusHistory" ADD CONSTRAINT "FeedbackStatusHistory_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackStatusHistory" ADD CONSTRAINT "FeedbackStatusHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

