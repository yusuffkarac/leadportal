<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const title = ref('')
const description = ref('')
const postalCode = ref('')
const startPrice = ref('0')
const minIncrement = ref('1')
const instantBuyPrice = ref('')
const endsAt = ref('')
const privateDetails = ref('')
const insuranceType = ref('')
const error = ref('')
const ok = ref('')
const insuranceTypes = ref([])
const isShowcase = ref(false)

// Formleadport entegrasyonu için yeni değişkenler
const formleadportFormId = ref('')
const formleadportData = ref(null)
const showFormPreview = ref(false)
const isLoadingFormData = ref(false)
const formleadportError = ref('')

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadInsuranceTypes() {
  try {
    const { data } = await axios.get('/api/settings', { headers: authHeaders() })
    insuranceTypes.value = data.insuranceTypes || [
      { name: 'Hayvan', icon: 'fa-paw' },
      { name: 'Araba', icon: 'fa-car' },
      { name: 'Sağlık', icon: 'fa-heart-pulse' }
    ]
    
    // Eski format compatibility kontrolü
    if (insuranceTypes.value && Array.isArray(insuranceTypes.value) && insuranceTypes.value.length > 0) {
      const firstItem = insuranceTypes.value[0]
      if (typeof firstItem === 'string') {
        const defaultIcons = {
          'Hayvan': 'fa-paw',
          'Araba': 'fa-car',
          'Sağlık': 'fa-heart-pulse'
        }
        insuranceTypes.value = insuranceTypes.value.map(name => ({
          name: name,
          icon: defaultIcons[name] || 'fa-file-alt'
        }))
      }
    }
  } catch (e) {
    console.error('Sigorta türleri yüklenemedi:', e)
    insuranceTypes.value = [
      { name: 'Hayvan', icon: 'fa-paw' },
      { name: 'Araba', icon: 'fa-car' },
      { name: 'Sağlık', icon: 'fa-heart-pulse' }
    ] // Fallback
  }
}

onMounted(loadInsuranceTypes)

// Formleadport'tan form verilerini çek
async function fetchFormleadportData() {
  if (!formleadportFormId.value.trim()) {
    formleadportError.value = 'Lütfen form numarası girin'
    return
  }
  
  isLoadingFormData.value = true
  formleadportError.value = ''
  
  try {
    const { data } = await axios.get(`/api/formleadport-data/${formleadportFormId.value}`, {
      headers: authHeaders()
    })
    
    if (data.success) {
      formleadportData.value = data.data
      showFormPreview.value = true
    } else {
      formleadportError.value = data.error || 'Form verileri alınamadı'
    }
  } catch (e) {
    const status = e?.response?.status
    const data = e?.response?.data
    
    if (status === 404) {
      formleadportError.value = 'Bu form numarası bulunamadı'
    } else if (status === 401) {
      formleadportError.value = 'Yetkilendirme hatası'
    } else if (status === 429) {
      formleadportError.value = 'Çok fazla istek gönderildi, lütfen bekleyin'
    } else {
      formleadportError.value = data?.error || 'Form verileri alınamadı'
    }
  } finally {
    isLoadingFormData.value = false
  }
}

// Form verilerini lead formuna otomatik doldur
function useFormleadportData() {
  if (!formleadportData.value) return
  
  const formData = formleadportData.value
  
  // Formleadport verilerini lead formuna map et
  title.value = `${formData.firma_adi} - ${formData.musteri_isim} ${formData.musteri_soyisim}`
  description.value = `Müşteri: ${formData.musteri_isim} ${formData.musteri_soyisim}\nFirma: ${formData.firma_adi}\nTelefon: ${formData.telefon || 'Belirtilmemiş'}\nEmail: ${formData.email || 'Belirtilmemiş'}`
  postalCode.value = formData.posta_kodu || ''
  
  // Sigorta türü mapping
  if (formData.sigorta) {
    const sigortaMapping = {
      'Özel': 'Sağlık',
      'Yasal': 'Sağlık', 
      'Sigorta Yok': 'Sağlık'
    }
    insuranceType.value = sigortaMapping[formData.sigorta] || 'Sağlık'
  }
  
  // Private details'e detaylı bilgileri ekle
  privateDetails.value = `FORMLEADPORT VERİLERİ:
Form ID: ${formData.form_id}
Müşteri: ${formData.musteri_isim} ${formData.musteri_soyisim}
Cinsiyet: ${formData.musteri_cinsiyet || 'Belirtilmemiş'}
Doğum Tarihi: ${formData.musteri_dogum_tarihi || 'Belirtilmemiş'}
Email: ${formData.email || 'Belirtilmemiş'}
Telefon: ${formData.telefon || 'Belirtilmemiş'}
Sabit Telefon: ${formData.sabit_telefon || 'Belirtilmemiş'}
Firma: ${formData.firma_adi}
Adres: ${formData.adres || 'Belirtilmemiş'}
Şehir: ${formData.sehir || 'Belirtilmemiş'}
Medeni Durum: ${formData.medeni_durum || 'Belirtilmemiş'}
Çalışma Durumu: ${formData.calisma_durumu || 'Belirtilmemiş'}
Sigorta: ${formData.sigorta || 'Belirtilmemiş'}
Sigorta Şirketi: ${formData.sigorta_sirket || 'Belirtilmemiş'}
Randevu Tarihi: ${formData.randevu_tarihi || 'Belirtilmemiş'}
Randevu Tipi: ${formData.randevu_tipi || 'Belirtilmemiş'}

ORİJİNAL FORMLAADPORT VERİLERİ:
${JSON.stringify(formData, null, 2)}`
  
  // Modal'ı kapat
  showFormPreview.value = false
  formleadportError.value = ''
}

// Modal'ı kapat
function closeFormPreview() {
  showFormPreview.value = false
  formleadportData.value = null
  formleadportError.value = ''
}

async function submit() {
  error.value = ''
  ok.value = ''
  if (!endsAt.value) {
    error.value = 'Bitiş zamanı zorunludur.'
    return
  }
  try {
    await axios.post('/api/leads', {
      title: title.value,
      description: description.value,
      privateDetails: privateDetails.value || undefined,
      postalCode: postalCode.value || undefined,
      startPrice: Number(startPrice.value),
      minIncrement: Number(minIncrement.value),
      instantBuyPrice: instantBuyPrice.value ? Number(instantBuyPrice.value) : undefined,
      insuranceType: insuranceType.value || undefined,
      endsAt: endsAt.value,
      isShowcase: isShowcase.value
    }, { headers: authHeaders() })
    ok.value = 'Lead oluşturuldu'
    title.value = ''
    description.value = ''
    postalCode.value = ''
    privateDetails.value = ''
    startPrice.value = '0'
    minIncrement.value = '1'
    instantBuyPrice.value = ''
    insuranceType.value = ''
    endsAt.value = ''
    isShowcase.value = false
  } catch (e) {
    const status = e?.response?.status
    const data = e?.response?.data
    if (status === 403) error.value = 'Oluşturulamadı (ADMIN gerekir)'
    else if (data?.issues?.length) error.value = data.issues.map(i => i.message).join(' • ')
    else error.value = data?.error || 'Geçersiz veri: lütfen alanları kontrol edin.'
  }
}
</script>

<template>
  <section class="section" style="max-width:720px">
    <h2>Yeni Lead Oluştur</h2>
    <div v-if="error" style="color:#ef4444">{{ error }}</div>
    <div v-if="ok" style="color:#16a34a">{{ ok }}</div>
    
    <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 16px; margin-top:10px">
      <div class="stack">
        <label>Formleadport Form Numarası (Opsiyonel)</label>
        <div style="display: flex; gap: 8px;">
          <input 
            class="input" 
            v-model="formleadportFormId" 
            placeholder="Örn: 123456" 
            maxlength="6"
            @keyup.enter="fetchFormleadportData"
            style="flex: 1;"
          />
          <button 
            class="btn" 
            @click="fetchFormleadportData" 
            :disabled="isLoadingFormData"
            style="background: #3b82f6; color: white; white-space: nowrap;"
          >
            {{ isLoadingFormData ? 'Yükleniyor...' : 'Getir' }}
          </button>
        </div>
        <div v-if="formleadportError" style="color: #ef4444; font-size: 0.875rem; margin-top: 4px;">
          {{ formleadportError }}
        </div>
      </div>
      <div class="stack">
        <label>Başlık</label>
        <input class="input" v-model="title" placeholder="Örn. Avrupa e-ticaret lead'i" />
      </div>
      <div class="stack">
        <label>Posta Kodu</label>
        <input class="input" v-model="postalCode" placeholder="Örn. 85309" />
      </div>
      <div class="stack">
        <label>Başlangıç Fiyatı</label>
        <input class="input" v-model="startPrice" type="number" />
      </div>
      <div class="stack" style="grid-column: 1 / 3;">
        <label>Açıklama</label>
        <textarea class="input" v-model="description" rows="4" placeholder="Kısa açıklama" />
      </div>
      <div class="stack" style="grid-column: 1 / 3;">
        <label>Lead Detayları (Sadece Satın Alan Görür)</label>
        <textarea class="input" v-model="privateDetails" rows="6" placeholder="Satın alan kişinin göreceği detay bilgileri girin" />
        <small style="color: var(--primary); font-size: 0.875rem;">Bu alan sadece leadi satın alan kişi, lead sahibi ve adminler tarafından görülebilir.</small>
      </div>
      <div class="stack">
        <label>Min. Artış</label>
        <input class="input" v-model="minIncrement" type="number" />
      </div>
      <div class="stack">
        <label>Anında Satın Alma Fiyatı (Opsiyonel)</label>
        <input class="input" v-model="instantBuyPrice" type="number" placeholder="Boş bırakılabilir" />
        <small style="color: var(--primary); font-size: 0.875rem;">Bu fiyatı ödeyen kişi açık artırmayı beklemeden hemen satın alabilir</small>
      </div>
      <div class="stack">
        <label>Sigorta Türü (Opsiyonel)</label>
        <select class="input" v-model="insuranceType">
          <option value="">Sigorta türü seçin</option>
          <option v-for="type in insuranceTypes" :key="type.name" :value="type.name">{{ type.name }}</option>
        </select>
      </div>
      <div class="stack">
        <label>Bitiş Zamanı</label>
        <input class="input" v-model="endsAt" type="datetime-local" />
      </div>
      <div class="stack toggle-field" style="grid-column: 1 / 3;">
        <label>Vitrine Ekle</label>
        <div class="toggle-container">
          <label class="toggle-switch">
            <input type="checkbox" v-model="isShowcase" />
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">{{ isShowcase ? 'Açık' : 'Kapalı' }}</span>
        </div>
        <small class="toggle-help">
          Vitrine alınan leadler ana sayfanın vitrin bölümünde öne çıkarılır.
        </small>
      </div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn" @click="submit">Oluştur</button>
    </div>
  </section>

  <!-- Form Önizleme Modalı -->
  <div v-if="showFormPreview" class="modal-overlay" @click="closeFormPreview">
    <div class="modal-content" @click.stop style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <div class="modal-header">
        <h3>📋 Formleadport Verileri Önizleme</h3>
        <button @click="closeFormPreview" class="modal-close">&times;</button>
      </div>
      
      <div class="modal-body" v-if="formleadportData">
        <div class="form-preview">
          <div class="preview-section">
            <h4>👤 Müşteri Bilgileri</h4>
            <div class="preview-grid">
              <div><strong>Ad Soyad:</strong> {{ formleadportData.musteri_isim }} {{ formleadportData.musteri_soyisim }}</div>
              <div><strong>Cinsiyet:</strong> {{ formleadportData.musteri_cinsiyet || 'Belirtilmemiş' }}</div>
              <div><strong>Doğum Tarihi:</strong> {{ formleadportData.musteri_dogum_tarihi || 'Belirtilmemiş' }}</div>
              <div><strong>Email:</strong> {{ formleadportData.email || 'Belirtilmemiş' }}</div>
              <div><strong>Telefon:</strong> {{ formleadportData.telefon || 'Belirtilmemiş' }}</div>
              <div><strong>Sabit Telefon:</strong> {{ formleadportData.sabit_telefon || 'Belirtilmemiş' }}</div>
            </div>
          </div>
          
          <div class="preview-section">
            <h4>🏢 Firma Bilgileri</h4>
            <div class="preview-grid">
              <div><strong>Firma Adı:</strong> {{ formleadportData.firma_adi }}</div>
              <div><strong>Adres:</strong> {{ formleadportData.adres || 'Belirtilmemiş' }}</div>
              <div><strong>Şehir:</strong> {{ formleadportData.sehir || 'Belirtilmemiş' }}</div>
              <div><strong>Posta Kodu:</strong> {{ formleadportData.posta_kodu || 'Belirtilmemiş' }}</div>
            </div>
          </div>
          
          <div class="preview-section">
            <h4>📅 Randevu Bilgileri</h4>
            <div class="preview-grid">
              <div><strong>Randevu Tarihi:</strong> {{ formleadportData.randevu_tarihi || 'Belirtilmemiş' }}</div>
              <div><strong>Randevu Tipi:</strong> {{ formleadportData.randevu_tipi || 'Belirtilmemiş' }}</div>
            </div>
          </div>
          
          <div class="preview-section">
            <h4>🏥 Sigorta Bilgileri</h4>
            <div class="preview-grid">
              <div><strong>Sigorta Türü:</strong> {{ formleadportData.sigorta || 'Belirtilmemiş' }}</div>
              <div><strong>Sigorta Şirketi:</strong> {{ formleadportData.sigorta_sirket || 'Belirtilmemiş' }}</div>
              <div><strong>Sigorta Başlangıç:</strong> {{ formleadportData.sigorta_baslangic_tarihi || 'Belirtilmemiş' }}</div>
              <div><strong>Katkı Payı:</strong> {{ formleadportData.sigorta_katki_payi || 'Belirtilmemiş' }}</div>
            </div>
          </div>
          
          <div class="preview-section">
            <h4>👨‍👩‍👧‍👦 Kişisel Bilgiler</h4>
            <div class="preview-grid">
              <div><strong>Medeni Durum:</strong> {{ formleadportData.medeni_durum || 'Belirtilmemiş' }}</div>
              <div><strong>Çalışma Durumu:</strong> {{ formleadportData.calisma_durumu || 'Belirtilmemiş' }}</div>
              <div><strong>Çocuk Sayısı:</strong> {{ formleadportData.aile_cocuk_sayisi || 'Belirtilmemiş' }}</div>
              <div><strong>Eş Yaşı:</strong> {{ formleadportData.es_yasi || 'Belirtilmemiş' }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="closeFormPreview" class="btn btn-secondary">İptal</button>
        <button @click="useFormleadportData" class="btn btn-primary">Bu Verileri Kullan</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 600px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #64748b;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
}

.form-preview {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-section {
  background: #f8fafc;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.preview-section h4 {
  margin: 0 0 12px 0;
  color: #1e293b;
  font-size: 1rem;
}

.preview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.preview-grid div {
  font-size: 0.875rem;
  color: #475569;
}

.btn-secondary {
  background: #64748b;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #475569;
}

.btn-primary:hover {
  background: #2563eb;
}
</style>
