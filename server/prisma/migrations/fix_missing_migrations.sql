-- Bu script production sunucusunda eksik migration'ları uygular
-- Çalıştırmadan önce veritabanı yedeklemesi alın!

-- 1. Settings tablosuna showExpiredLeads kolonu ekle
-- Eğer kolon zaten varsa hata verebilir, bu durumda bu satırı atlayın
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Settings' 
        AND column_name = 'showExpiredLeads'
    ) THEN
        ALTER TABLE "Settings" ADD COLUMN "showExpiredLeads" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 2. Feedback tablosu ve enum'ları oluştur
-- FeedbackStatus enum'ı oluştur (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackStatus') THEN
        CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
    END IF;
END $$;

-- FeedbackPriority enum'ı oluştur (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackPriority') THEN
        CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
    END IF;
END $$;

-- Feedback tablosu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL,
    "leadSaleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "FeedbackPriority" NOT NULL DEFAULT 'MEDIUM',
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- FeedbackReply tablosu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS "FeedbackReply" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackReply_pkey" PRIMARY KEY ("id")
);

-- Index'leri oluştur (eğer yoksa)
CREATE INDEX IF NOT EXISTS "Feedback_userId_idx" ON "Feedback"("userId");
CREATE INDEX IF NOT EXISTS "Feedback_status_idx" ON "Feedback"("status");
CREATE INDEX IF NOT EXISTS "Feedback_assignedTo_idx" ON "Feedback"("assignedTo");
CREATE INDEX IF NOT EXISTS "Feedback_createdAt_idx" ON "Feedback"("createdAt");
CREATE INDEX IF NOT EXISTS "FeedbackReply_feedbackId_idx" ON "FeedbackReply"("feedbackId");
CREATE INDEX IF NOT EXISTS "FeedbackReply_userId_idx" ON "FeedbackReply"("userId");
CREATE INDEX IF NOT EXISTS "FeedbackReply_createdAt_idx" ON "FeedbackReply"("createdAt");

-- Foreign key'leri ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Feedback_userId_fkey'
    ) THEN
        ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Feedback_leadSaleId_fkey'
    ) THEN
        ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_leadSaleId_fkey" 
        FOREIGN KEY ("leadSaleId") REFERENCES "LeadSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Feedback_assignedTo_fkey'
    ) THEN
        ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_assignedTo_fkey" 
        FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'FeedbackReply_feedbackId_fkey'
    ) THEN
        ALTER TABLE "FeedbackReply" ADD CONSTRAINT "FeedbackReply_feedbackId_fkey" 
        FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'FeedbackReply_userId_fkey'
    ) THEN
        ALTER TABLE "FeedbackReply" ADD CONSTRAINT "FeedbackReply_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Unique constraint ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Feedback_leadSaleId_key'
    ) THEN
        ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_leadSaleId_key" UNIQUE ("leadSaleId");
    END IF;
END $$;

-- Eğer Feedback_leadSaleId_idx index'i varsa sil (unique constraint zaten index oluşturur)
DROP INDEX IF EXISTS "Feedback_leadSaleId_idx";

