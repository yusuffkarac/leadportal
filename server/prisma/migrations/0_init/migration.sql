-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('AUCTION', 'SOFORT_KAUF');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "userTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "profileImage" TEXT,
    "lastActivity" TIMESTAMP(3),
    "lastIP" TEXT,
    "lastUserAgent" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentMethod" TEXT NOT NULL DEFAULT 'balance',
    "ibanAccountHolder" TEXT,
    "ibanNumber" TEXT,
    "ibanBic" TEXT,
    "ibanAddress" TEXT,
    "ibanPostalCode" TEXT,
    "ibanCity" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "privateDetails" TEXT,
    "postalCode" TEXT,
    "leadType" "LeadType" NOT NULL DEFAULT 'AUCTION',
    "startPrice" INTEGER NOT NULL,
    "minIncrement" INTEGER NOT NULL,
    "instantBuyPrice" INTEGER,
    "reservePrice" INTEGER,
    "antiSnipeSeconds" INTEGER NOT NULL DEFAULT 120,
    "insuranceType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isShowcase" BOOLEAN NOT NULL DEFAULT false,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isSold" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "maxBid" INTEGER NOT NULL,
    "isAutoBid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadWatch" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSale" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'balance',
    "paymentStatus" "PaymentStatus",
    "balanceBefore" INTEGER,
    "balanceAfter" INTEGER,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "adminNotes" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "leadIdFormat" TEXT NOT NULL DEFAULT 'numeric',
    "customFormat" TEXT NOT NULL DEFAULT 'L{YYYY}{MM}{DD}-{NUM}',
    "leadPrefix" TEXT NOT NULL DEFAULT 'LEAD',
    "startingNumber" INTEGER NOT NULL DEFAULT 1,
    "numberType" TEXT NOT NULL DEFAULT 'sequential',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "defaultAuctionDays" INTEGER NOT NULL DEFAULT 7,
    "defaultMinIncrement" INTEGER NOT NULL DEFAULT 10,
    "homepageHeroEyebrow" TEXT NOT NULL DEFAULT 'Sigorta lead pazaryeri',
    "homepageHeroTitle" TEXT NOT NULL DEFAULT 'Almanya''nın önde gelen',
    "homepageHeroHighlight" TEXT NOT NULL DEFAULT 'sigorta lead',
    "homepageHeroTitleSuffix" TEXT NOT NULL DEFAULT 'pazaryeri',
    "homepageHeroSubtitle" TEXT NOT NULL DEFAULT 'LeadPortal, sigorta brokerleri için profesyonel açık artırma altyapısı, doğrulanmış lead kalitesi ve canlı teklif takibi sunar.',
    "homepageHeroPrimaryCtaText" TEXT NOT NULL DEFAULT 'Şimdi kaydol',
    "homepageHeroPrimaryCtaLink" TEXT NOT NULL DEFAULT '/login',
    "homepageHeroSecondaryCtaText" TEXT NOT NULL DEFAULT 'Canlı açık artırmaları gör',
    "homepageHeroSecondaryCtaLink" TEXT NOT NULL DEFAULT '/leads',
    "homepageFeatureHeading" TEXT NOT NULL DEFAULT 'LeadPortal''ı neden seçmelisiniz?',
    "homepageFeatures" JSONB NOT NULL DEFAULT '[{"icon":"mdi:scale-balance","title":"Adil Açık Artırmalar","description":"Şeffaf kurallar ve gerçek zamanlı teklifler ile esnek açık artırma modelleri."},{"icon":"mdi:shield-check","title":"Onaylı Kalite","description":"Her lead yayına alınmadan önce kalite ve doğruluk kontrollerinden geçer."},{"icon":"mdi:account-group","title":"Güvenilir İş Ortağı","description":"Broker topluluğumuz için doğrulama süreci ve puanlama sistemi."}]',
    "homepageShowcaseEyebrow" TEXT NOT NULL DEFAULT 'Vitrin leadler',
    "homepageShowcaseTitle" TEXT NOT NULL DEFAULT 'Aktüel açık artırmalar',
    "homepageShowcaseCtaText" TEXT NOT NULL DEFAULT 'Hepsini gör',
    "homepageShowcaseCtaLink" TEXT NOT NULL DEFAULT '/leads',
    "homepageStatsEyebrow" TEXT NOT NULL DEFAULT 'Güven veren rakamlar',
    "homepageStatsTitle" TEXT NOT NULL DEFAULT 'Broker topluluğumuz büyümeye devam ediyor',
    "homepageStats" JSONB NOT NULL DEFAULT '[{"value":"2.500+","label":"Aktif Broker"},{"value":"15.000+","label":"Satılan Lead"},{"value":"98%","label":"Memnuniyet"},{"value":"€2.1M","label":"Toplam Hacim"}]',
    "homepageCtaTitle" TEXT NOT NULL DEFAULT 'Başlamak için hazır mısınız?',
    "homepageCtaSubtitle" TEXT NOT NULL DEFAULT 'LeadPortal topluluğuna katılın, doğrulanmış leadlere erişin ve işinizi güvenle büyütün.',
    "homepageCtaPrimaryText" TEXT NOT NULL DEFAULT 'Ücretsiz kaydol',
    "homepageCtaPrimaryLink" TEXT NOT NULL DEFAULT '/login',
    "homepageCtaSecondaryText" TEXT NOT NULL DEFAULT 'Leadleri incele',
    "homepageCtaSecondaryLink" TEXT NOT NULL DEFAULT '/leads',
    "enableBiddingHours" BOOLEAN NOT NULL DEFAULT false,
    "biddingStartHour" TEXT NOT NULL DEFAULT '08:00',
    "biddingEndHour" TEXT NOT NULL DEFAULT '20:00',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT NOT NULL DEFAULT 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
    "smtpHost" TEXT NOT NULL DEFAULT '',
    "smtpPort" INTEGER NOT NULL DEFAULT 465,
    "smtpUser" TEXT NOT NULL DEFAULT '',
    "smtpPass" TEXT NOT NULL DEFAULT '',
    "smtpFromName" TEXT NOT NULL DEFAULT 'LeadPortal',
    "smtpUseTLS" BOOLEAN NOT NULL DEFAULT false,
    "smtpUseSSL" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyLogoUrl" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT 'LeadPortal',
    "faviconUrl" TEXT NOT NULL DEFAULT '',
    "footerDescription" TEXT NOT NULL DEFAULT 'Almanya''nın önde gelen lead pazar yeri. Profesyonel açık artırmalar ve lead yönetimi platformu.',
    "footerEmail" TEXT NOT NULL DEFAULT 'info@leadportal.com',
    "footerNote" TEXT NOT NULL DEFAULT '',
    "footerPhone" TEXT NOT NULL DEFAULT '+90 (212) 123 45 67',
    "insuranceTypes" JSONB NOT NULL DEFAULT '[{"icon": "fa-paw", "name": "Hayvan"}, {"icon": "fa-car", "name": "Araba"}, {"icon": "fa-heart-pulse", "name": "Sağlık"}]',
    "legalLinks" JSONB,
    "servicesLinks" JSONB,
    "socialMedia" JSONB,
    "supportLinks" JSONB,
    "tradeRegisterNumber" TEXT NOT NULL DEFAULT 'İstanbul Ticaret Sicil No: 12345',

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTypePermission" (
    "id" SERIAL NOT NULL,
    "userTypeId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "hasAccess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTypePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTypePermission" (
    "id" SERIAL NOT NULL,
    "userTypeId" TEXT NOT NULL,
    "leadType" TEXT NOT NULL,
    "hasAccess" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadTypePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLeadTypePermission" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "leadType" TEXT NOT NULL,
    "hasAccess" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLeadTypePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "About" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "data" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "About_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "colors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "relatedId" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationTypeId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRolePermission" (
    "id" SERIAL NOT NULL,
    "userTypeId" TEXT NOT NULL,
    "notificationTypeId" TEXT NOT NULL,
    "canReceive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "LeadWatch_leadId_userId_key" ON "LeadWatch"("leadId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSale_leadId_key" ON "LeadSale"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTypePermission_userTypeId_pageId_key" ON "UserTypePermission"("userTypeId", "pageId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadTypePermission_userTypeId_leadType_key" ON "LeadTypePermission"("userTypeId", "leadType");

-- CreateIndex
CREATE UNIQUE INDEX "UserLeadTypePermission_userId_leadType_key" ON "UserLeadTypePermission"("userId", "leadType");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_type_key" ON "EmailTemplate"("type");

-- CreateIndex
CREATE UNIQUE INDEX "SMSTemplate_type_key" ON "SMSTemplate"("type");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "BalanceTransaction_userId_idx" ON "BalanceTransaction"("userId");

-- CreateIndex
CREATE INDEX "BalanceTransaction_createdAt_idx" ON "BalanceTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "BalanceTransaction_type_idx" ON "BalanceTransaction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationType_code_key" ON "NotificationType"("code");

-- CreateIndex
CREATE INDEX "NotificationType_code_idx" ON "NotificationType"("code");

-- CreateIndex
CREATE INDEX "NotificationType_category_idx" ON "NotificationType"("category");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_notificationTypeId_key" ON "NotificationPreference"("userId", "notificationTypeId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_notificationTypeId_idx" ON "Notification"("notificationTypeId");

-- CreateIndex
CREATE INDEX "NotificationRolePermission_userTypeId_idx" ON "NotificationRolePermission"("userTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRolePermission_userTypeId_notificationTypeId_key" ON "NotificationRolePermission"("userTypeId", "notificationTypeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_userTypeId_fkey" FOREIGN KEY ("userTypeId") REFERENCES "UserType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadWatch" ADD CONSTRAINT "LeadWatch_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadWatch" ADD CONSTRAINT "LeadWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadSale" ADD CONSTRAINT "LeadSale_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadSale" ADD CONSTRAINT "LeadSale_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTypePermission" ADD CONSTRAINT "UserTypePermission_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTypePermission" ADD CONSTRAINT "UserTypePermission_userTypeId_fkey" FOREIGN KEY ("userTypeId") REFERENCES "UserType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTypePermission" ADD CONSTRAINT "LeadTypePermission_userTypeId_fkey" FOREIGN KEY ("userTypeId") REFERENCES "UserType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLeadTypePermission" ADD CONSTRAINT "UserLeadTypePermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_notificationTypeId_fkey" FOREIGN KEY ("notificationTypeId") REFERENCES "NotificationType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_notificationTypeId_fkey" FOREIGN KEY ("notificationTypeId") REFERENCES "NotificationType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRolePermission" ADD CONSTRAINT "NotificationRolePermission_userTypeId_fkey" FOREIGN KEY ("userTypeId") REFERENCES "UserType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRolePermission" ADD CONSTRAINT "NotificationRolePermission_notificationTypeId_fkey" FOREIGN KEY ("notificationTypeId") REFERENCES "NotificationType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

