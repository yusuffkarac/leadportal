#!/bin/bash

# Lead Portal - Production Başlatma Scripti
# Bu script production ortamında uygulamayı başlatır

echo "🚀 Lead Portal Production Başlatılıyor..."
echo "========================================"

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
    exit 1
fi
echo -e "${GREEN}✅ Node.js versiyonu: $node_version${NC}"

# Backend bağımlılıklarını kontrol et ve yükle
echo -e "${BLUE}📦 Backend bağımlılıkları kontrol ediliyor...${NC}"
if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Backend bağımlılıkları yükleniyor...${NC}"
    cd server
    npm install --production
    check_error "Backend bağımlılıkları yüklenemedi"
    cd ..
fi

# Frontend build
echo -e "${BLUE}🏗️  Frontend build ediliyor...${NC}"
cd leadportal
npm install
check_error "Frontend bağımlılıkları yüklenemedi"

npm run build
check_error "Frontend build edilemedi"
cd ..

# Prisma client'ı generate et
echo -e "${BLUE}🗄️  Prisma client generate ediliyor...${NC}"
cd server
npm run prisma:generate
check_error "Prisma client generate edilemedi"

# Veritabanını push et
echo -e "${BLUE}🗄️  Veritabanı şeması push ediliyor...${NC}"
npm run prisma:push
check_error "Veritabanı şeması push edilemedi"
cd ..

echo -e "${GREEN}✅ Tüm hazırlıklar tamamlandı!${NC}"
echo ""

# Backend'i başlat
echo -e "${BLUE}🔧 Backend başlatılıyor... (Port: 3000)${NC}"
cd server
npm start &
BACKEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}🎉 Lead Portal Production başarıyla başlatıldı!${NC}"
echo "========================================"
echo -e "${BLUE}🔧 Backend:  http://localhost:3000${NC}"
echo -e "${BLUE}📱 Frontend: http://localhost:3000 (Static files)${NC}"
echo ""
echo -e "${YELLOW}💡 Durdurmak için Ctrl+C tuşlarına basın${NC}"

# Process'leri temizleme fonksiyonu
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Uygulama kapatılıyor...${NC}"
    kill $BACKEND_PID 2>/dev/null
    echo -e "${GREEN}✅ Uygulama kapatıldı.${NC}"
    exit 0
}

# Ctrl+C yakalama
trap cleanup SIGINT

# Process'in çalışmasını bekle
wait
