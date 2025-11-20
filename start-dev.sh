#!/bin/bash

# Lead Portal - Hızlı Başlatma Scripti
# Bu script hem frontend hem backend'i aynı anda başlatır

echo "🚀 Lead Portal Başlatılıyor..."
echo "=================================="

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
    npm install
    check_error "Backend bağımlılıkları yüklenemedi"
    cd ..
fi

# Frontend bağımlılıklarını kontrol et ve yükle
echo -e "${BLUE}📦 Frontend bağımlılıkları kontrol ediliyor...${NC}"
if [ ! -d "leadportal/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Frontend bağımlılıkları yükleniyor...${NC}"
    cd leadportal
    npm install
    check_error "Frontend bağımlılıkları yüklenemedi"
    cd ..
fi

# Prisma client'ı generate et
echo -e "${BLUE}🗄️  Prisma client generate ediliyor...${NC}"
cd server
npm run prisma:generate
check_error "Prisma client generate edilemedi"
cd ..

# Veritabanını push et (geliştirme için)
echo -e "${BLUE}🗄️  Veritabanı şeması push ediliyor...${NC}"
cd server
npm run prisma:push
check_error "Veritabanı şeması push edilemedi"
cd ..

echo -e "${GREEN}✅ Tüm hazırlıklar tamamlandı!${NC}"
echo ""

# Backend'i arka planda başlat
echo -e "${BLUE}🔧 Backend başlatılıyor... (Port: 3000)${NC}"
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# Kısa bir bekleme
sleep 3

# Frontend'i arka planda başlat
echo -e "${BLUE}🎨 Frontend başlatılıyor... (Port: 5173)${NC}"
cd leadportal
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}🎉 Lead Portal başarıyla başlatıldı!${NC}"
echo "=================================="
echo -e "${BLUE}📱 Frontend: http://localhost:5173${NC}"
echo -e "${BLUE}🔧 Backend:  http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}💡 Durdurmak için Ctrl+C tuşlarına basın${NC}"

# Process'leri temizleme fonksiyonu
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Uygulamalar kapatılıyor...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ Tüm uygulamalar kapatıldı.${NC}"
    exit 0
}

# Ctrl+C yakalama
trap cleanup SIGINT

# Process'lerin çalışmasını bekle
wait
