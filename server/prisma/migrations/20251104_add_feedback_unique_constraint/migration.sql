-- AddUniqueConstraint
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_leadSaleId_key" UNIQUE ("leadSaleId");

-- DropIndex
DROP INDEX "Feedback_leadSaleId_idx";
