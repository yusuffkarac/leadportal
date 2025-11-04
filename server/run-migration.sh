#!/bin/bash

# Production sunucusunda migration çalıştırma scripti
# Kullanım: ./run-migration.sh

echo "🚀 Migration çalıştırılıyor..."
echo ""

# .env dosyasını yükle (eğer varsa)
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# DATABASE_URL kontrolü
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable bulunamadı!"
    echo "Lütfen .env dosyasında DATABASE_URL'i kontrol edin."
    exit 1
fi

# DATABASE_URL'i parse et
# Format: postgresql://user:password@host:port/database
DB_URL=$DATABASE_URL

# PostgreSQL bağlantı bilgilerini çıkar
# sed ile parse et
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Alternatif: python/perl ile parse et (daha güvenilir)
if command -v python3 &> /dev/null; then
    # Python ile parse et
    DB_INFO=$(python3 <<EOF
import os
import re
url = os.environ.get('DATABASE_URL', '')
match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', url)
if match:
    print(f"{match.group(1)}|{match.group(2)}|{match.group(3)}|{match.group(4)}|{match.group(5)}")
EOF
)
    
    if [ ! -z "$DB_INFO" ]; then
        IFS='|' read -r DB_USER DB_PASS DB_HOST DB_PORT DB_NAME <<< "$DB_INFO"
    fi
fi

# Hala boşsa, alternatif yöntem dene
if [ -z "$DB_USER" ] || [ -z "$DB_HOST" ]; then
    echo "⚠️  DATABASE_URL parse edilemedi. Alternatif yöntem deneniyor..."
    
    # Node.js script kullan
    if command -v node &> /dev/null; then
        node scripts/run-migration.js
        exit $?
    else
        echo "❌ Node.js bulunamadı. Lütfen manuel olarak bağlanın:"
        echo ""
        echo "psql -h HOST -p PORT -U USER -d DATABASE -f prisma/migrations/fix_missing_migrations.sql"
        exit 1
    fi
fi

echo "📊 Veritabanı: $DB_NAME"
echo "🌐 Host: $DB_HOST:$DB_PORT"
echo "👤 Kullanıcı: $DB_USER"
echo ""

# PGPASSWORD ile psql çalıştır
export PGPASSWORD=$DB_PASS

echo "🚀 Migration çalıştırılıyor..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f prisma/migrations/fix_missing_migrations.sql

EXIT_CODE=$?

# PGPASSWORD'u temizle
unset PGPASSWORD

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Migration başarıyla tamamlandı!"
else
    echo ""
    echo "❌ Migration sırasında hata oluştu!"
    exit $EXIT_CODE
fi

