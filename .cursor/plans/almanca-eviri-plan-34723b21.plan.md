<!-- 34723b21-17fb-4b15-a705-6ea446f0a9be 43a2e51f-85da-4cd8-89ca-85fd970dbb82 -->
# Admin Panel ve Default İçerik Çevirisi

## Kapsam

Admin panelindeki tüm sayfaların kullanıcıya görünen Türkçe metinlerini Almanca'ya çevirmek ve sistemdeki default içerikleri (FAQ, Homepage, About, Insurance Types) Almanca'ya çevirmek.

## Fazlar

### Faz 1: Default İçeriklerin Çevirisi (Server-side)

**Dosyalar:**

- `server/src/routes/faq.js` - Default FAQ'lar (16 adet, 4 kategori: general, bidding, account, payment)
- `server/src/routes/settings.js` - Default homepage içeriği ve default insurance types
- `server/src/routes/about.js` - Default About sayfası içerikleri

**Yapılacaklar:**

- `defaultFAQs` array'indeki tüm soru ve cevapları Almanca'ya çevir
- `defaultHomepage` objesindeki tüm metinleri Almanca'ya çevir
- `defaultSections` array'indeki About sayfası içeriklerini Almanca'ya çevir
- `defaultInsuranceTypes` array'indeki sigorta tipi isimlerini Almanca'ya çevir
- Server-side hata mesajlarını da kontrol et ve çevir (ör: "Varsayılan FAQ'lar başarıyla yüklendi")

### Faz 2: Frontend Default İçeriklerin Çevirisi ✅ TAMAMLANDI

**Dosyalar:**

- `leadportal/src/views/HomeView.vue` - `defaultHomepageContent` objesi ✅
- `leadportal/src/views/AdminHomepageSettingsView.vue` - `defaultContent` objesi ✅

**Yapılacaklar:**

- ✅ Frontend'deki default içeriklerin server-side ile tutarlı olduğundan emin ol
- ✅ Eğer farklılık varsa, server-side versiyonuna göre güncelle

### Faz 3: Admin Sayfalarının Çevirisi ✅ TAMAMLANDI

**20 Admin sayfası:**

1. ✅ `AdminStatisticsView.vue` - İstatistikler sayfası
2. ✅ `AdminLeadsListView.vue` - Lead listesi sayfası
3. ✅ `AdminUsersListView.vue` - Kullanıcı listesi sayfası
4. ✅ `AdminFAQView.vue` - FAQ yönetimi sayfası
5. ✅ `AdminHomepageSettingsView.vue` - Ana sayfa ayarları
6. ✅ `AdminAboutView.vue` - Hakkında sayfası yönetimi
7. ✅ `AdminFeedbackView.vue` - Geri bildirim yönetimi
8. ✅ `AdminSettingsView.vue` - Genel ayarlar
9. ✅ `AdminEmailSMSSettingsView.vue` - Email/SMS ayarları (UI ve default template'ler çevrildi)
10. ✅ `AdminNotificationSettingsView.vue` - Bildirim ayarları
11. ✅ `AdminCustomPagesView.vue` - Özel sayfalar yönetimi
12. ✅ `AdminDesignSettingsView.vue` - Tasarım ayarları
13. ✅ `AdminPendingPaymentsView.vue` - Bekleyen ödemeler
14. ✅ `AdminBalanceView.vue` - Bakiye yönetimi
15. ✅ `AdminActivityLogView.vue` - Aktivite logları
16. ✅ `AdminUserNewView.vue` - Yeni kullanıcı oluşturma
17. ✅ `AdminUserTypesView.vue` - Kullanıcı tipleri yönetimi
18. ✅ `AdminLeadTypePermissionsView.vue` - Lead tipi izinleri
19. ✅ `AdminLeadNewView.vue` - Yeni lead oluşturma
20. ✅ `AdminLeadEditView.vue` - Lead düzenleme

**Her sayfada çevrilecekler:**

- Sayfa başlıkları ve alt başlıklar
- Buton metinleri (Yeni Ekle, Düzenle, Sil, Kaydet, İptal, vb.)
- Form etiketleri ve placeholder'lar
- Tablo başlıkları
- Filtre ve arama metinleri
- Durum mesajları (başarı, hata, uyarı)
- Modal başlıkları ve içerikleri
- Validasyon mesajları
- Boş durum mesajları ("Hiç veri yok", "Yükleniyor...", vb.)
- Kategori ve durum etiketleri
- Tarih formatları (tr-TR → de-DE)

**Özel dikkat edilecekler:**

- `AdminStatisticsView.vue`: Metrik kartları, grafik etiketleri, kategori başlıkları
- `AdminLeadsListView.vue`: Lead form alanları, durum etiketleri, filtreler
- `AdminUsersListView.vue`: Kullanıcı listesi, filtreler, durumlar
- `AdminFAQView.vue`: Kategori isimleri (Genel Sorular → Allgemeine Fragen, vb.)
- Tüm sayfalarda: `formatDate` fonksiyonlarında `'tr-TR'` → `'de-DE'` değişikliği

### Faz 4: Server-side Admin Mesajlarının Çevirisi ✅ TAMAMLANDI

**Dosyalar:**

- ✅ `server/src/routes/faq.js` - Admin endpoint mesajları
- ✅ `server/src/routes/about.js` - Admin endpoint mesajları
- ✅ `server/src/routes/settings.js` - Admin endpoint mesajları
- ✅ `server/src/routes/customPages.js` - Custom pages mesajları
- ✅ `server/src/routes/feedback.js` - Feedback mesajları
- ✅ `server/src/routes/userTypes.js` - User types mesajları
- ✅ `server/src/routes/designSettings.js` - Design settings mesajları
- ✅ `server/src/routes/balance.js` - Balance mesajları
- ✅ `server/src/routes/emailSmsSettings.js` - Email/SMS settings mesajları (API mesajları çevrildi, default template içerikleri kaldı)

**Yapılacaklar:**

- ✅ API response mesajlarını Almanca'ya çevir
- ✅ Hata mesajlarını Almanca'ya çevir
- ✅ Başarı mesajlarını Almanca'ya çevir

### Faz 5: Default Email/SMS Template İçeriklerinin Çevirisi ✅ TAMAMLANDI

**Dosyalar:**

- ✅ `server/src/routes/emailSmsSettings.js` - Default email ve SMS template'lerinin HTML/text içerikleri

**Yapılacaklar:**

- ✅ Default email template'lerinin HTML içeriklerini Almanca'ya çevir
- ✅ Default email template'lerinin text içeriklerini Almanca'ya çevir
- ✅ Default SMS template'lerinin içeriklerini Almanca'ya çevir
- ✅ Template'lerdeki placeholder'ları kontrol et (ör: `{{userName}}`, `{{leadTitle}}` gibi değişkenler korunmalı)
- ✅ Template name, description ve subject alanlarını Almanca'ya çevir

## Notlar

- Tarih formatları: `toLocaleString('tr-TR')` → `toLocaleString('de-DE')` veya `toLocaleDateString('tr-TR')` → `toLocaleDateString('de-DE')`
- Kategori isimleri: "Genel Sorular" → "Allgemeine Fragen", "Teklif Verme" → "Gebote abgeben", "Hesap Yönetimi" → "Kontoverwaltung", "Ödeme" → "Zahlung"
- Durum etiketleri: "Aktif" → "Aktiv", "Pasif" → "Inaktiv", "Beklemede" → "Ausstehend"
- Admin sayfalarında console.error mesajları da çevrilebilir ama öncelik kullanıcıya görünen metinlerde

## Tamamlanan İşler Özeti

✅ **Faz 1:** Server-side default içerikler (FAQ, Homepage, About, Insurance Types) çevrildi
✅ **Faz 2:** Frontend default içerikler çevrildi ve server-side ile senkronize edildi
✅ **Faz 3:** Tüm admin sayfaları çevrildi (20 sayfa)
✅ **Faz 4:** Server-side admin mesajları çevrildi
✅ **Faz 5:** Default email ve SMS template içerikleri çevrildi

## Önemli Notlar

- Tüm placeholder'lar (`{{variableName}}`) korundu
- Tarih formatları `de-DE` olarak güncellendi
- API response mesajları Almanca'ya çevrildi
- Template içerikleri (HTML, text, SMS) tamamen Almanca'ya çevrildi
- Email template'lerindeki HTML yapısı ve stil korundu