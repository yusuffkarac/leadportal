-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "sessionTimeoutMessage" TEXT NOT NULL DEFAULT 'Oturumunuz hareketsizlik nedeniyle sonlandırılmıştır. Lütfen tekrar giriş yapınız.',
ADD COLUMN     "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 120;
