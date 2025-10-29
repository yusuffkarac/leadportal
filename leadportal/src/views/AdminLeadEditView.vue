<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const leadId = route.params.id
const lead = ref(null)
const ok = ref('')
const err = ref('')
const insuranceTypes = ref([])
const serverTime = ref('')
const serverTimestamp = ref(0)
const serverTimezoneAbbr = ref('UTC')
let timeInterval = null

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load() {
  const { data } = await axios.get(`/api/leads/${leadId}`, { headers: authHeaders() })
  // datetime-local input için endsAt'i lokal timezone'a çevir
  // ISO string'den timezone bilgisini kaldır
  let endsAtLocal = data.endsAt
  if (data.endsAt) {
    const date = new Date(data.endsAt)
    // datetime-local format: "YYYY-MM-DDTHH:mm"
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    endsAtLocal = `${year}-${month}-${day}T${hours}:${minutes}`
  }
  lead.value = {
    ...data,
    endsAt: endsAtLocal,
    isShowcase: !!data.isShowcase
  }
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

async function save() {
  ok.value = ''
  err.value = ''
  try {
    // endsAt datetime-local formatında ("2025-10-29T14:00")
    // Backend'e gönderirken bu formatı koruyalım
    const payload = {
      title: lead.value.title,
      description: lead.value.description,
      privateDetails: lead.value.privateDetails || undefined,
      startPrice: lead.value.startPrice,
      minIncrement: lead.value.minIncrement,
      instantBuyPrice: lead.value.instantBuyPrice,
      insuranceType: lead.value.insuranceType || undefined,
      endsAt: lead.value.endsAt, // datetime-local formatında gönder
      isActive: lead.value.isActive,
      isShowcase: !!lead.value.isShowcase
    }
    await axios.put(`/api/leads/${leadId}`, payload, { headers: authHeaders() })
    ok.value = 'Kaydedildi'
  } catch (e) {
    err.value = 'Kaydedilemedi'
  }
}

async function fetchServerTime() {
  try {
    const { data } = await axios.get('/api/settings/server-time')
    serverTimestamp.value = data.timestamp
    serverTimezoneAbbr.value = data.timezoneAbbr || 'UTC'
    updateServerTimeDisplay()
  } catch (error) {
    console.error('Server time fetch error:', error)
    // Fallback to local time
    serverTimestamp.value = Date.now()
    updateServerTimeDisplay()
  }
}

function updateServerTimeDisplay() {
  // Her saniye sunucu timestamp'ini artır
  serverTimestamp.value += 1000

  const now = new Date(serverTimestamp.value)
  // Sunucunun lokal saatini göster
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()

  serverTime.value = `${day}.${month}.${year} ${hours}:${minutes}:${seconds} ${serverTimezoneAbbr.value}`
}

onMounted(async () => {
  load()
  loadInsuranceTypes()
  await fetchServerTime()
  timeInterval = setInterval(updateServerTimeDisplay, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<template>
  <section v-if="lead" class="grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
    <div class="section">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="margin: 0;">Lead Düzenle</h2>
        <div class="server-time">
          <span style="font-size: 11px; color: #6b7280; font-weight: 500;">Sunucu Saati:</span>
          <span style="font-size: 12px; color: #374151; font-weight: 600; margin-left: 4px;">{{ serverTime }}</span>
        </div>
      </div>
      <div class="stack">
        <label>Başlık</label>
        <input class="input" v-model="lead.title" />
        <label>Açıklama</label>
        <textarea class="input" v-model="lead.description" rows="4" />
        <label>Lead Detayları (Sadece Satın Alan Görür)</label>
        <textarea class="input" v-model="lead.privateDetails" rows="6" placeholder="Satın alan kişinin göreceği detay bilgileri girin" />
        <div class="row">
          <div class="stack" style="flex:1">
            <label>Başlangıç</label>
            <input class="input" type="number" v-model.number="lead.startPrice" />
          </div>
          <div class="stack" style="flex:1">
            <label>Min Artış</label>
            <input class="input" type="number" v-model.number="lead.minIncrement" />
          </div>
        </div>
        <div class="stack">
          <label>Anında Satın Alma Fiyatı (Opsiyonel)</label>
          <input class="input" type="number" v-model.number="lead.instantBuyPrice" placeholder="Boş bırakılabilir" />
          <small style="color: var(--primary); font-size: 0.875rem;">Bu fiyatı ödeyen kişi açık artırmayı beklemeden hemen satın alabilir</small>
        </div>
        <div class="stack">
          <label>Sigorta Türü (Opsiyonel)</label>
          <select class="input" v-model="lead.insuranceType">
            <option value="">Sigorta türü seçin</option>
            <option v-for="type in insuranceTypes" :key="type.name" :value="type.name">{{ type.name }}</option>
          </select>
        </div>
        <label>Bitiş</label>
        <input class="input" type="datetime-local" v-model="lead.endsAt" />
        <div class="row">
          <label>Aktif mi?</label>
          <input type="checkbox" v-model="lead.isActive" />
        </div>
        <div class="stack toggle-field">
          <label>Vitrine Ekle</label>
          <div class="toggle-container">
            <label class="toggle-switch">
              <input type="checkbox" v-model="lead.isShowcase" />
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">{{ lead.isShowcase ? 'Açık' : 'Kapalı' }}</span>
          </div>
          <small class="toggle-help">
            Vitrine alınan leadler ana sayfadaki vitrin bölümünde öne çıkarılır.
          </small>
        </div>
        <div class="row">
          <button class="btn" @click="save">Kaydet</button>
          <span v-if="ok" style="color:#16a34a">{{ ok }}</span>
          <span v-if="err" style="color:#ef4444">{{ err }}</span>
        </div>
      </div>
    </div>
    <div class="section">
      <h3>Teklifler</h3>
      <div v-if="!lead.bids?.length" class="muted">Teklif yok.</div>
      <div v-else class="stack">
        <div class="card" v-for="b in lead.bids" :key="b.id">
          <div class="row" style="justify-content:space-between">
            <strong>{{ b.amount }}</strong>
            <span class="muted">{{ new Date(b.createdAt).toLocaleString() }}</span>
          </div>
          <div class="muted">{{ b.user?.email || 'Anonim' }}</div>
        </div>
      </div>
    </div>
  </section>
  <section v-else class="muted">Yükleniyor...</section>
</template>
