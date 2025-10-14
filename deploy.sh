#!/bin/bash

# LeadPortal Production Deployment Script
# Bu script projeyi production ortamına deploy etmek için kullanılır

echo "🚀 LeadPortal Production Deployment Başlıyor..."

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Hata kontrolü
set -e

# 1. Frontend Build
echo -e "${YELLOW}📦 Frontend build ediliyor...${NC}"
cd leadportal
npm install
npm run build
echo -e "${GREEN}✅ Frontend build tamamlandı${NC}"

# 2. Backend Dependencies
echo -e "${YELLOW}📦 Backend dependencies yükleniyor...${NC}"
cd ../server
npm install --production
echo -e "${GREEN}✅ Backend dependencies yüklendi${NC}"

# 3. Database Migration
echo -e "${YELLOW}🗄️ Veritabanı güncelleniyor...${NC}"
npx prisma generate
npx prisma db push
echo -e "${GREEN}✅ Veritabanı güncellendi${NC}"

# 4. Uploads klasörü oluştur
echo -e "${YELLOW}📁 Uploads klasörü oluşturuluyor...${NC}"
mkdir -p uploads/profile-images
echo -e "${GREEN}✅ Uploads klasörü hazır${NC}"

# 5. Environment kontrolü
echo -e "${YELLOW}🔧 Environment variables kontrol ediliyor...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env dosyası bulunamadı!${NC}"
    echo "Lütfen .env dosyasını oluşturun ve gerekli değişkenleri ayarlayın."
    exit 1
fi
echo -e "${GREEN}✅ Environment variables hazır${NC}"

# 6. PM2 ile başlatma (opsiyonel)
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}🔄 PM2 ile server başlatılıyor...${NC}"
    pm2 stop leadportal-server 2>/dev/null || true
    pm2 start src/server.js --name leadportal-server
    pm2 save
    echo -e "${GREEN}✅ Server PM2 ile başlatıldı${NC}"
else
    echo -e "${YELLOW}⚠️ PM2 bulunamadı. Manuel olarak server'ı başlatın:${NC}"
    echo "cd server && npm start"
fi

echo -e "${GREEN}🎉 Deployment tamamlandı!${NC}"
echo ""
echo "📋 Sonraki adımlar:"
echo "1. Nginx/Apache konfigürasyonunu yapın"
echo "2. SSL sertifikası ekleyin"
echo "3. Domain'i yapılandırın"
echo "4. Firewall ayarlarını kontrol edin"
echo ""
echo "🌐 Frontend: leadportal/dist klasöründen serve edin"
echo "🔧 Backend: server/src/server.js çalışıyor"
echo "📁 Uploads: server/uploads klasörü"
