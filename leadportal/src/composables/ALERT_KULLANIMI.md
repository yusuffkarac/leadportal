# Global Alert Sistemi Kullanım Kılavuzu

Bu proje için oluşturulmuş global alert/notification sistemi. Chrome'un native alert'ı yerine uygulamanın kendi tasarımıyla uyumlu, modern bir bildirim sistemi.

## Kurulum

Alert sistemi zaten App.vue'ya eklenmiş durumda. Herhangi bir ek kurulum gerektirmiyor.

## Kullanım

### 1. Composable'ı import edin

```javascript
import { useAlert } from '../composables/useAlert'

// Component içinde
const { success, error, warning, info } = useAlert()
```

### 2. Alert gösterin

```javascript
// Başarı mesajı (yeşil, 3 saniye)
success('İşlem başarıyla tamamlandı')

// Hata mesajı (kırmızı, 5 saniye)
error('Bir hata oluştu')

// Uyarı mesajı (turuncu, 4 saniye)
warning('Dikkat! Bu işlem geri alınamaz')

// Bilgi mesajı (mavi, 3 saniye)
info('Yeni bir güncelleme var')
```

### 3. Özel süre belirleyin

```javascript
// 10 saniye göster
success('İşlem tamamlandı', 10000)

// Süresiz göster (0)
error('Bu mesaj kapanmayacak', 0)

// Manuel kapatma için
const alertId = info('Manuel kapatılabilir mesaj', 0)
// Daha sonra:
removeAlert(alertId)
```

## Alert Tipleri

| Tip | Renk | Varsayılan Süre | Kullanım Alanı |
|-----|------|-----------------|----------------|
| `success` | Yeşil | 3 saniye | İşlem başarılı, kayıt oluşturuldu, güncelleme tamamlandı |
| `error` | Kırmızı | 5 saniye | Hata mesajları, validasyon hataları, sunucu hataları |
| `warning` | Turuncu | 4 saniye | Uyarılar, dikkat edilmesi gerekenler |
| `info` | Mavi | 3 saniye | Bilgilendirme mesajları, ipuçları |

## Örnekler

### Form Submit İşlemi

```javascript
async function submitForm() {
  try {
    await axios.post('/api/data', formData)
    success('Kayıt başarıyla oluşturuldu')
    router.push('/list')
  } catch (e) {
    if (e.response?.status === 400) {
      error('Lütfen tüm alanları doldurun')
    } else if (e.response?.status === 409) {
      warning('Bu kayıt zaten mevcut')
    } else {
      error('Sunucu hatası oluştu')
    }
  }
}
```

### Dosya Yükleme

```javascript
async function uploadFile(file) {
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  if (file.size > maxSize) {
    warning('Dosya boyutu 5MB\'dan küçük olmalıdır')
    return
  }
  
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    await axios.post('/api/upload', formData)
    success('Dosya başarıyla yüklendi')
  } catch (e) {
    error('Dosya yüklenirken hata oluştu')
  }
}
```

### Silme İşlemi

```javascript
async function deleteItem(id) {
  if (!confirm('Silmek istediğinizden emin misiniz?')) return
  
  try {
    await axios.delete(`/api/items/${id}`)
    success('Kayıt başarıyla silindi')
    loadItems()
  } catch (e) {
    error('Silme işlemi başarısız oldu')
  }
}
```

### Logout İşlemi

```javascript
function logout() {
  localStorage.removeItem('token')
  success('Başarıyla çıkış yapıldı')
  router.push('/login')
}
```

## Özellikler

- ✅ Otomatik kapanma (süre ayarlanabilir)
- ✅ Manuel kapatma (X butonu veya tıklayarak)
- ✅ Animasyonlu giriş/çıkış
- ✅ Birden fazla alert aynı anda gösterilebilir
- ✅ Mobil responsive
- ✅ Modern gradient tasarım
- ✅ İkonlu gösterim
- ✅ Sağ üstten giriş animasyonu

## Notlar

- Alert'ler sağ üst köşede gösterilir
- Mobil cihazlarda tam genişlikte görünür
- Hover efekti ile vurgulanır
- Üstüne tıklayarak kapatılabilir
- Her alert benzersiz bir ID'ye sahiptir
- Alert sayısına sınır yoktur (ancak ekranda çok fazla alert olması önerilmez)

## Mevcut Kullanım Örnekleri

Projede şu dosyalarda kullanım örnekleri bulabilirsiniz:
- `src/components/UserProfile.vue` - Logout işleminde
- `src/views/AdminUserNewView.vue` - Kullanıcı ekleme/düzenleme işlemlerinde

