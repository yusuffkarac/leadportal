# LeadPortal

Almanya'nın önde gelen lead pazar yeri - Sigorta brokerleri için profesyonel açık artırma platformu.

## Özellikler

- 🏠 Kullanıcı dostu arayüz
- 👤 Kullanıcı profil yönetimi
- 📸 Profil fotoğrafı yükleme
- 🔐 Güvenli kimlik doğrulama
- 💰 Canlı açık artırma sistemi
- 📱 Responsive tasarım
- ⚡ Real-time güncellemeler

## Teknolojiler

### Frontend
- Vue 3 + Composition API
- Vite
- Vue Router
- Axios
- Socket.io Client

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Socket.io
- Multer (File Upload)

## Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL
- npm veya yarn

### Development

1. **Repository'yi klonlayın:**
```bash
git clone <repository-url>
cd leadportal
```

2. **Dependencies'leri yükleyin:**
```bash
# Frontend
cd leadportal
npm install

# Backend
cd ../server
npm install
```

3. **Environment variables ayarlayın:**
```bash
# Server için .env dosyası oluşturun
cd server
cp .env.example .env
# .env dosyasını düzenleyin
```

4. **Veritabanını hazırlayın:**
```bash
cd server
npx prisma db push
npx prisma generate
```

5. **Servisleri başlatın:**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd leadportal
npm run dev
```

### Production Deployment

1. **Environment Variables:**
```bash
# Frontend için .env dosyası oluşturun
VITE_API_BASE_URL=/api
```

2. **Build:**
```bash
cd leadportal
npm run build
```

3. **Static dosyaları serve edin:**
```bash
# Nginx örneği
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend static files
    location / {
        root /path/to/leadportal/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Uploads proxy
    location /uploads {
        proxy_pass http://localhost:4000;
    }
    
    # Socket.io proxy
    location /socket.io {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Giriş
- `GET /api/auth/profile` - Profil bilgileri
- `PUT /api/auth/profile` - Profil güncelleme
- `PUT /api/auth/change-password` - Şifre değiştirme
- `POST /api/auth/upload-profile-image` - Profil fotoğrafı yükleme
- `DELETE /api/auth/profile-image` - Profil fotoğrafı silme

### Leads
- `GET /api/leads` - Lead listesi
- `POST /api/leads` - Yeni lead oluşturma
- `GET /api/leads/:id` - Lead detayı
- `PUT /api/leads/:id` - Lead güncelleme
- `DELETE /api/leads/:id` - Lead silme

### Bids
- `POST /api/bids` - Teklif verme
- `GET /api/bids/lead/:leadId` - Lead teklifleri

## Geliştirme

### Lint
```bash
npm run lint
```

### Build
```bash
npm run build
```

### Preview
```bash
npm run preview
```

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
