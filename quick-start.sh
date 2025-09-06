#!/bin/bash

# Hızlı Başlatma Scripti - LeadPortal
# Tüm servisleri paralel olarak başlatır

echo "🚀 LeadPortal Hızlı Başlatma..."

# Proje dizinini kontrol et
if [ ! -d "leadportal" ] || [ ! -d "server" ]; then
    echo "❌ Bu script proje kök dizininde çalıştırılmalıdır!"
    exit 1
fi

# Docker'ı başlat
echo "📦 PostgreSQL başlatılıyor..."
cd server && docker-compose up -d

# Prisma setup
echo "🔧 Prisma hazırlanıyor..."
npm run prisma:generate
npm run prisma:push

# Backend'i başlat (arka planda)
echo "🖥️ Backend başlatılıyor..."
npm run dev &

# Frontend'e geç ve başlat
echo "🎨 Frontend başlatılıyor..."
cd ../leadportal
npm run dev &

echo "✅ Tüm servisler başlatıldı!"
echo "🌐 Frontend: http://localhost:5173"
echo "🖥️ Backend: http://localhost:3000"
echo "🗄️ Database: localhost:5432"

# Temizlik fonksiyonu
cleanup() {
    echo "🛑 Servisler durduruluyor..."
    pkill -f "npm run dev"
    cd server && docker-compose down
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "Servisler çalışıyor... Durdurmak için Ctrl+C"
wait
