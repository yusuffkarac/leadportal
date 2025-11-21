<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const title = ref('')
const description = ref('')
const postalCode = ref('')
const leadType = ref('AUCTION') // Default to auction
const startPrice = ref('0')
const minIncrement = ref('1')
const instantBuyPrice = ref('')
const startsAt = ref('')
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
    console.error('Versicherungsarten konnten nicht geladen werden:', e)
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
    formleadportError.value = 'Bitte geben Sie eine Formularnummer ein'
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
      formleadportError.value = data.error || 'Formulardaten konnten nicht abgerufen werden'
    }
  } catch (e) {
    const status = e?.response?.status
    const data = e?.response?.data
    
    if (status === 404) {
      formleadportError.value = 'Diese Formularnummer wurde nicht gefunden'
    } else if (status === 401) {
      formleadportError.value = 'Autorisierungsfehler'
    } else if (status === 429) {
      formleadportError.value = 'Zu viele Anfragen, bitte warten Sie'
    } else {
      formleadportError.value = data?.error || 'Formulardaten konnten nicht abgerufen werden'
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
  description.value = `Kunde: ${formData.musteri_isim} ${formData.musteri_soyisim}\nFirma: ${formData.firma_adi}\nTelefon: ${formData.telefon || 'Nicht angegeben'}\nE-Mail: ${formData.email || 'Nicht angegeben'}`
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
  privateDetails.value = `FORMLEADPORT-DATEN:
Formular-ID: ${formData.form_id}
Kunde: ${formData.musteri_isim} ${formData.musteri_soyisim}
Geschlecht: ${formData.musteri_cinsiyet || 'Nicht angegeben'}
Geburtsdatum: ${formData.musteri_dogum_tarihi || 'Nicht angegeben'}
E-Mail: ${formData.email || 'Nicht angegeben'}
Telefon: ${formData.telefon || 'Nicht angegeben'}
Festnetz: ${formData.sabit_telefon || 'Nicht angegeben'}
Firma: ${formData.firma_adi}
Adresse: ${formData.adres || 'Nicht angegeben'}
Stadt: ${formData.sehir || 'Nicht angegeben'}
Familienstand: ${formData.medeni_durum || 'Nicht angegeben'}
Beschäftigungsstatus: ${formData.calisma_durumu || 'Nicht angegeben'}
Versicherung: ${formData.sigorta || 'Nicht angegeben'}
Versicherungsgesellschaft: ${formData.sigorta_sirket || 'Nicht angegeben'}
Termindatum: ${formData.randevu_tarihi || 'Nicht angegeben'}
Termintyp: ${formData.randevu_tipi || 'Nicht angegeben'}

ORIGINALE FORMLEADPORT-DATEN:
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
    error.value = 'Endzeit ist erforderlich.'
    return
  }

  // Başlangıç tarihi kontrolü: eğer verilmişse bitiş tarihinden önce olmalı
  if (startsAt.value && endsAt.value) {
    const start = new Date(startsAt.value)
    const end = new Date(endsAt.value)
    if (start >= end) {
      error.value = 'Das Startdatum muss vor dem Enddatum liegen.'
      return
    }
  }

  try {
    await axios.post('/api/leads', {
      title: title.value,
      description: description.value,
      privateDetails: privateDetails.value || undefined,
      postalCode: postalCode.value || undefined,
      leadType: leadType.value,
      startPrice: Number(startPrice.value),
      minIncrement: Number(minIncrement.value),
      instantBuyPrice: instantBuyPrice.value ? Number(instantBuyPrice.value) : undefined,
      insuranceType: insuranceType.value || undefined,
      startsAt: startsAt.value || undefined,
      endsAt: endsAt.value,
      isShowcase: isShowcase.value
    }, { headers: authHeaders() })
    ok.value = 'Lead erfolgreich erstellt'
    title.value = ''
    description.value = ''
    postalCode.value = ''
    leadType.value = 'AUCTION'
    privateDetails.value = ''
    startPrice.value = '0'
    minIncrement.value = '1'
    instantBuyPrice.value = ''
    insuranceType.value = ''
    startsAt.value = ''
    endsAt.value = ''
    isShowcase.value = false
  } catch (e) {
    const status = e?.response?.status
    const data = e?.response?.data
    if (status === 403) error.value = 'Konnte nicht erstellt werden (ADMIN erforderlich)'
    else if (data?.issues?.length) error.value = data.issues.map(i => i.message).join(' • ')
    else error.value = data?.error || 'Ungültige Daten: Bitte überprüfen Sie die Felder.'
  }
}
</script>

<template>
  <section class="section" style="max-width:720px">
    <h2>Neuen Lead erstellen</h2>
    <div v-if="error" style="color:#ef4444">{{ error }}</div>
    <div v-if="ok" style="color:#16a34a">{{ ok }}</div>
    
    <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 16px; margin-top:10px">
      <div class="stack">
        <label>Formleadport Formularnummer (Optional)</label>
        <div style="display: flex; gap: 8px;">
          <input 
            class="input" 
            v-model="formleadportFormId" 
            placeholder="z.B.: 123456" 
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
            {{ isLoadingFormData ? 'Wird geladen...' : 'Abrufen' }}
          </button>
        </div>
        <div v-if="formleadportError" style="color: #ef4444; font-size: 0.875rem; margin-top: 4px;">
          {{ formleadportError }}
        </div>
      </div>
      <div class="stack">
        <label>Titel</label>
        <input class="input" v-model="title" placeholder="z.B. Europa E-Commerce-Lead" />
      </div>
      <div class="stack">
        <label>Postleitzahl</label>
        <input class="input" v-model="postalCode" placeholder="z.B. 85309" />
      </div>
      <div class="stack">
        <label>Lead-Typ</label>
        <select class="input" v-model="leadType">
          <option value="AUCTION">Auktion</option>
          <option value="SOFORT_KAUF">Sofortkauf (Sofortiger Kauf)</option>
        </select>
        <small style="color: var(--primary); font-size: 0.875rem;">
          {{ leadType === 'AUCTION' ? 'Wird per Auktion verkauft' : 'Kann sofort zu einem festen Preis gekauft werden' }}
        </small>
      </div>
      <div class="stack">
        <label>{{ leadType === 'SOFORT_KAUF' ? 'Verkaufspreis' : 'Startpreis' }} *</label>
        <input class="input" v-model="startPrice" type="number" />
      </div>
      <div class="stack" style="grid-column: 1 / 3;">
        <label>Beschreibung</label>
        <textarea class="input" v-model="description" rows="4" placeholder="Kurze Beschreibung" />
      </div>
      <div class="stack">
        <label>Versicherungstyp (Optional)</label>
        <select class="input" v-model="insuranceType">
          <option value="">Versicherungstyp auswählen</option>
          <option v-for="type in insuranceTypes" :key="type.name" :value="type.name">{{ type.name }}</option>
        </select>
      </div>
      <div class="stack" style="grid-column: 1 / 3;">
        <label>Lead-Details (Nur für Käufer sichtbar)</label>
        <textarea class="input" v-model="privateDetails" rows="6" placeholder="Geben Sie Detailinformationen ein, die der Käufer sehen wird" />
        <small style="color: var(--primary); font-size: 0.875rem;">Dieses Feld ist nur für den Käufer des Leads, den Lead-Besitzer und Administratoren sichtbar.</small>
      </div>
      <div class="stack" v-if="leadType === 'AUCTION'">
        <label>Mindesterhöhung</label>
        <input class="input" v-model="minIncrement" type="number" />
      </div>
      <div class="stack" v-if="leadType === 'AUCTION'">
        <label>Sofortkaufpreis (Optional)</label>
        <input class="input" v-model="instantBuyPrice" type="number" placeholder="Kann leer gelassen werden" />
        <small style="color: var(--primary); font-size: 0.875rem;">Wer diesen Preis zahlt, kann sofort kaufen, ohne auf die Auktion zu warten</small>
      </div>
      <div class="stack">
        <label>Startzeit (Optional)</label>
        <input class="input" v-model="startsAt" type="datetime-local" />
        <small style="color: var(--primary); font-size: 0.875rem;">Wenn leer gelassen, wird der Lead sofort aktiv. Wenn Sie ein zukünftiges Datum wählen, wird er zu diesem Zeitpunkt aktiv.</small>
      </div>
      <div class="stack">
        <label>Endzeit</label>
        <input class="input" v-model="endsAt" type="datetime-local" />
      </div>
      <div class="stack toggle-field" style="grid-column: 1 / 3;">
        <label>Zu Showcase hinzufügen</label>
        <div class="toggle-container">
          <label class="toggle-switch">
            <input type="checkbox" v-model="isShowcase" />
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">{{ isShowcase ? 'Aktiv' : 'Inaktiv' }}</span>
        </div>
        <small class="toggle-help">
          Leads im Showcase werden im Showcase-Bereich der Startseite hervorgehoben.
        </small>
      </div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn" @click="submit">Erstellen</button>
    </div>
  </section>

  <!-- Form Önizleme Modalı -->
  <div v-if="showFormPreview" class="modal-overlay" @click="closeFormPreview">
    <div class="modal-content" @click.stop style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <div class="modal-header">
        <h3>📋 Formleadport-Datenvorschau</h3>
        <button @click="closeFormPreview" class="modal-close">&times;</button>
      </div>
      
      <div class="modal-body" v-if="formleadportData">
        <div class="form-preview">
          <div class="preview-section">
            <h4>👤 Kundeninformationen</h4>
            <div class="preview-grid">
              <div><strong>Vor- und Nachname:</strong> {{ formleadportData.musteri_isim }} {{ formleadportData.musteri_soyisim }}</div>
              <div><strong>Geschlecht:</strong> {{ formleadportData.musteri_cinsiyet || 'Nicht angegeben' }}</div>
              <div><strong>Geburtsdatum:</strong> {{ formleadportData.musteri_dogum_tarihi || 'Nicht angegeben' }}</div>
              <div><strong>E-Mail:</strong> {{ formleadportData.email || 'Nicht angegeben' }}</div>
              <div><strong>Telefon:</strong> {{ formleadportData.telefon || 'Nicht angegeben' }}</div>
              <div><strong>Festnetz:</strong> {{ formleadportData.sabit_telefon || 'Nicht angegeben' }}</div>
            </div>
          </div>
          
          <div class="preview-section">
            <h4>🏢 Firmeninformationen</h4>
            <div class="preview-grid">
              <div><strong>Firmenname:</strong> {{ formleadportData.firma_adi }}</div>
              <div><strong>Adresse:</strong> {{ formleadportData.adres || 'Nicht angegeben' }}</div>
              <div><strong>Stadt:</strong> {{ formleadportData.sehir || 'Nicht angegeben' }}</div>
              <div><strong>Postleitzahl:</strong> {{ formleadportData.posta_kodu || 'Nicht angegeben' }}</div>
            </div>
          </div>
          
          <div class="preview-section">
            <h4>📅 Termininformationen</h4>
            <div class="preview-grid">
              <div><strong>Termindatum:</strong> {{ formleadportData.randevu_tarihi || 'Nicht angegeben' }}</div>
              <div><strong>Termintyp:</strong> {{ formleadportData.randevu_tipi || 'Nicht angegeben' }}</div>
            </div>
          </div>
          
          <div class="preview-section">
            <h4>🏥 Versicherungsinformationen</h4>
            <div class="preview-grid">
              <div><strong>Versicherungstyp:</strong> {{ formleadportData.sigorta || 'Nicht angegeben' }}</div>
              <div><strong>Versicherungsgesellschaft:</strong> {{ formleadportData.sigorta_sirket || 'Nicht angegeben' }}</div>
              <div><strong>Versicherungsbeginn:</strong> {{ formleadportData.sigorta_baslangic_tarihi || 'Nicht angegeben' }}</div>
              <div><strong>Selbstbeteiligung:</strong> {{ formleadportData.sigorta_katki_payi || 'Nicht angegeben' }}</div>
            </div>
          </div>
          
          <div class="preview-section">
            <h4>👨‍👩‍👧‍👦 Persönliche Informationen</h4>
            <div class="preview-grid">
              <div><strong>Familienstand:</strong> {{ formleadportData.medeni_durum || 'Nicht angegeben' }}</div>
              <div><strong>Beschäftigungsstatus:</strong> {{ formleadportData.calisma_durumu || 'Nicht angegeben' }}</div>
              <div><strong>Anzahl der Kinder:</strong> {{ formleadportData.aile_cocuk_sayisi || 'Nicht angegeben' }}</div>
              <div><strong>Alter des Partners:</strong> {{ formleadportData.es_yasi || 'Nicht angegeben' }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="closeFormPreview" class="btn btn-secondary">Abbrechen</button>
        <button @click="useFormleadportData" class="btn btn-primary">Diese Daten verwenden</button>
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
