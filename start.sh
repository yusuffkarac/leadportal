#!/bin/bash

# LeadPortal Başlatma Scripti
# Bu script tüm servisleri sırasıyla başlatır

set -e  # Hata durumunda scripti durdur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logo ve başlık
echo -e "${BLUE}"
echo "╔══════════════════════════════════════╗"
echo "║           LeadPortal Starter         ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

# Proje dizinini kontrol et
if [ ! -d "leadportal" ] || [ ! -d "server" ]; then
    echo -e "${RED}❌ Hata: Bu script proje kök dizininde çalıştırılmalıdır!${NC}"
    echo "Script şu dizinde çalıştırılmalı: /Users/yusufsimply/Desktop/leadportal"
    exit 1
fi

echo -e "${YELLOW}🚀 LeadPortal başlatılıyor...${NC}"

# 1. Docker servislerini başlat (PostgreSQL)
echo -e "\n${BLUE}📦 1. PostgreSQL veritabanı başlatılıyor...${NC}"
cd server
if ! docker-compose up -d; then
    echo -e "${RED}❌ Docker Compose başlatılamadı. Docker'ın çalıştığından emin olun.${NC}"
    exit 1
fi

# Veritabanının hazır olmasını bekle
echo -e "${YELLOW}⏳ Veritabanının hazır olması bekleniyor...${NC}"
sleep 5

# 2. Prisma client'ı generate et
echo -e "\n${BLUE}🔧 2. Prisma client generate ediliyor...${NC}"
if ! npm run prisma:generate; then
    echo -e "${RED}❌ Prisma client generate edilemedi.${NC}"
    exit 1
fi

# 3. Veritabanı şemasını push et
echo -e "\n${BLUE}🗄️  3. Veritabanı şeması push ediliyor...${NC}"
if ! npm run prisma:push; then
    echo -e "${RED}❌ Veritabanı şeması push edilemedi.${NC}"
    exit 1
fi

# 3.5 Prisma Studio'yu başlat
echo -e "\n${BLUE}🔎 3.5 Prisma Studio başlatılıyor...${NC}"
npx prisma studio --schema ./prisma/schema.prisma &

# 4. Backend'i başlat (arka planda)
echo -e "\n${BLUE}🖥️  4. Backend sunucusu başlatılıyor...${NC}"
npm run dev &
BACKEND_PID=$!

# Backend'in başlamasını bekle
echo -e "${YELLOW}⏳ Backend'in başlaması bekleniyor...${NC}"
sleep 3

# 5. Frontend'e geç ve başlat
echo -e "\n${BLUE}🎨 5. Frontend başlatılıyor...${NC}"
cd ../leadportal

# Node modules kontrolü
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Frontend dependencies yükleniyor...${NC}"
    npm install
fi

# Frontend'i başlat
npm run dev &
FRONTEND_PID=$!

# Başarı mesajı
echo -e "\n${GREEN}✅ Tüm servisler başarıyla başlatıldı!${NC}"
echo -e "\n${BLUE}📋 Servis Bilgileri:${NC}"
echo -e "  🗄️  PostgreSQL: http://localhost:5432"
echo -e "  🖥️  Backend API: http://localhost:4000"
echo -e "  🎨 Frontend: http://localhost:5173"
echo -e "  🔧 Prisma Studio: http://localhost:5555 (veya terminaldeki bağlantı linki)"

echo -e "\n${YELLOW}💡 İpuçları:${NC}"
echo -e "  • Prisma Studio'yu açmak için: cd server && npx prisma studio --schema ./prisma/schema.prisma"
echo -e "  • Servisleri durdurmak için: Ctrl+C"
echo -e "  • Docker'ı durdurmak için: cd server && docker-compose down"

echo -e "\n${GREEN}🎉 LeadPortal hazır! Tarayıcınızda http://localhost:5173 adresini açın.${NC}"

# Script sonunda process'leri temizle
cleanup() {
    echo -e "\n${YELLOW}🛑 Servisler durduruluyor...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    # Prisma Studio'yu da kapat
    pkill -f "prisma studio" 2>/dev/null || true
    cd server
    docker-compose down
    echo -e "${GREEN}✅ Tüm servisler durduruldu.${NC}"
    exit 0
}

# Ctrl+C ile temizlik
trap cleanup SIGINT SIGTERM

# Script'in açık kalması için bekle
echo -e "\n${BLUE}Servisler çalışıyor... Durdurmak için Ctrl+C tuşlayın.${NC}"
wait
