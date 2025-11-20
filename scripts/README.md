# Route Senkronizasyon Script'i

Bu script, `leadportal/src/router/index.js` dosyasındaki route'ları otomatik olarak `server/src/routes/pages.js` dosyasına senkronize eder.

## Kullanım

Yeni bir route ekledikten sonra, şu komutu çalıştırın:

```bash
node scripts/sync-routes.js
```

Script otomatik olarak:
1. Router dosyasındaki tüm route'ları okur
2. Hariç tutulan route'ları (login, forbidden, vb.) filtreler
3. Route'ları Türkçe isimleriyle eşleştirir
4. `pages.js` dosyasındaki `STATIC_PAGES` array'ini günceller

## Yeni Route'ların Görünmesi

Script'i çalıştırdıktan sonra:

1. Sunucuyu yeniden başlatın
2. Admin paneline giriş yapın
3. **Kullanıcı Tipleri** > **Yetkilendirmeler** sekmesine gidin
4. Yeni route'lar otomatik olarak listelenecektir

## Route İsimleri

Script, route isimlerini `routeNameMap` objesinden alır. Yeni bir route eklerseniz ve özel bir Türkçe isim vermek isterseniz, `sync-routes.js` dosyasındaki `routeNameMap`'e ekleyin:

```javascript
const routeNameMap = {
  'your-route-name': 'Türkçe İsim',
  // ...
}
```

## Hariç Tutulan Route'lar

Bazı route'lar (login, forbidden, vb.) sayfa yetkilendirmelerinde gösterilmemelidir. Bu route'ları hariç tutmak için `excludedRoutes` array'ine ekleyin:

```javascript
const excludedRoutes = ['login', 'forbidden', 'forgot-password', 'reset-password']
```

## Parametreli Route'lar

Parametreli route'lar (örneğin `/admin/leads/:id`) için özel isimler `specialPaths` objesinde tanımlanır:

```javascript
const specialPaths = {
  '/admin/leads/:id': 'Lead Düzenle',
  '/lead/:id': 'Lead Detayı'
}
```
