#!/bin/bash

# Lead Portal - Kurulum Scripti
# Bu script tüm bağımlılıkları yükler ve gerekli ayarları yapar

echo "📦 Lead Portal Kurulum Başlatılıyor..."
echo "====================================="

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Hata kontrolü fonksiyonu
check_error() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Hata: $1${NC}"
        exit 1
    fi
}

# Node.js versiyon kontrolü
echo -e "${BLUE}📋 Node.js versiyonu kontrol ediliyor...${NC}"
node_version=$(node --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Node.js yüklü değil. Lütfen Node.js'i yükleyin.${NC}"
    echo -e "${YELLOW}💡 https://nodejs.org/ adresinden Node.js'i indirebilirsiniz.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js versiyonu: $node_version${NC}"

# NPM versiyon kontrolü
echo -e "${BLUE}📋 NPM versiyonu kontrol ediliyor...${NC}"
npm_version=$(npm --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ NPM yüklü değil.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ NPM versiyonu: $npm_version${NC}"

# Root package.json bağımlılıklarını yükle
echo -e "${BLUE}📦 Root bağımlılıkları yükleniyor...${NC}"
npm install
check_error "Root bağımlılıkları yüklenemedi"

# Backend bağımlılıklarını yükle
echo -e "${BLUE}📦 Backend bağımlılıkları yükleniyor...${NC}"
cd server
npm install
check_error "Backend bağımlılıkları yüklenemedi"
cd ..

# Frontend bağımlılıklarını yükle
echo -e "${BLUE}📦 Frontend bağımlılıkları yükleniyor...${NC}"
cd leadportal
npm install
check_error "Frontend bağımlılıkları yüklenemedi"
cd ..

# Prisma client'ı generate et
echo -e "${BLUE}🗄️  Prisma client generate ediliyor...${NC}"
cd server
npm run prisma:generate
check_error "Prisma client generate edilemedi"
cd ..

# .env dosyası kontrolü
echo -e "${BLUE}🔧 Environment dosyası kontrol ediliyor...${NC}"
if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}⚠️  .env dosyası bulunamadı. Örnek dosya oluşturuluyor...${NC}"
    cat > server/.env << EOF
# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:5173"
EOF
    echo -e "${GREEN}✅ .env dosyası oluşturuldu. Lütfen gerekli değerleri düzenleyin.${NC}"
else
    echo -e "${GREEN}✅ .env dosyası mevcut.${NC}"
fi

# Script dosyalarını çalıştırılabilir yap
echo -e "${BLUE}🔧 Script dosyaları çalıştırılabilir yapılıyor...${NC}"
chmod +x start-dev.sh
chmod +x start-prod.sh
chmod +x install.sh

echo ""
echo -e "${GREEN}🎉 Kurulum başarıyla tamamlandı!${NC}"
echo "====================================="
echo ""
echo -e "${BLUE}📋 Kullanılabilir komutlar:${NC}"
echo -e "${YELLOW}  ./start-dev.sh    - Geliştirme ortamında başlat${NC}"
echo -e "${YELLOW}  ./start-prod.sh   - Production ortamında başlat${NC}"
echo -e "${YELLOW}  ./install.sh      - Yeniden kurulum yap${NC}"
echo ""
echo -e "${BLUE}💡 İlk çalıştırmadan önce server/.env dosyasını kontrol edin!${NC}"
