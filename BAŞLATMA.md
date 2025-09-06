# LeadPortal Başlatma Rehberi

## 🚀 Hızlı Başlatma

Projeyi başlatmak için iki farklı script kullanabilirsiniz:

### 1. Detaylı Başlatma (Önerilen)
```bash
./start.sh
```

### 2. Hızlı Başlatma
```bash
./quick-start.sh
```

## 📋 Script Özellikleri

### `start.sh` - Detaylı Başlatma
- ✅ Adım adım ilerleme gösterir
- ✅ Hata kontrolü yapar
- ✅ Renkli çıktı verir
- ✅ Servis durumlarını gösterir
- ✅ Temizlik fonksiyonu içerir

### `quick-start.sh` - Hızlı Başlatma
- ⚡ Daha hızlı başlatma
- 🔄 Paralel servis başlatma
- 📝 Minimal çıktı

## 🛠️ Manuel Başlatma

Eğer script'ler çalışmazsa manuel olarak:

```bash
# 1. PostgreSQL'i başlat
cd server
docker-compose up -d

# 2. Prisma setup
npm run prisma:generate
npm run prisma:push

# 3. Backend'i başlat
npm run dev

# 4. Yeni terminal'de frontend'i başlat
cd leadportal
npm run dev
```

## 🌐 Servis Adresleri

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Prisma Studio**: `cd server && npm run prisma:studio`

## 🛑 Servisleri Durdurma

- **Script ile**: Ctrl+C tuşlayın
- **Manuel**: 
  ```bash
  # Backend/Frontend'i durdur
  pkill -f "npm run dev"
  
  # PostgreSQL'i durdur
  cd server && docker-compose down
  ```

## ⚠️ Gereksinimler

- Docker Desktop
- Node.js (v20.19.0+)
- npm

## 🔧 Sorun Giderme

### Docker çalışmıyor
```bash
# Docker'ı başlat
open -a Docker
```

### Port çakışması
```bash
# Kullanılan portları kontrol et
lsof -i :3000
lsof -i :5173
lsof -i :5432
```

### Prisma hataları
```bash
cd server
npm run prisma:generate
npm run prisma:push
```
