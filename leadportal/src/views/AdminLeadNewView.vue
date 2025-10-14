<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const title = ref('')
const description = ref('')
const startPrice = ref('0')
const minIncrement = ref('1')
const instantBuyPrice = ref('')
const endsAt = ref('')
const privateDetails = ref('')
const insuranceType = ref('')
const error = ref('')
const ok = ref('')
const insuranceTypes = ref([])

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadInsuranceTypes() {
  try {
    const { data } = await axios.get('/api/settings', { headers: authHeaders() })
    insuranceTypes.value = data.insuranceTypes || ['Hayvan', 'Araba', 'Sağlık']
  } catch (e) {
    console.error('Sigorta türleri yüklenemedi:', e)
    insuranceTypes.value = ['Hayvan', 'Araba', 'Sağlık'] // Fallback
  }
}

onMounted(loadInsuranceTypes)

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
      startPrice: Number(startPrice.value),
      minIncrement: Number(minIncrement.value),
      instantBuyPrice: instantBuyPrice.value ? Number(instantBuyPrice.value) : undefined,
      insuranceType: insuranceType.value || undefined,
      endsAt: endsAt.value
    }, { headers: authHeaders() })
    ok.value = 'Lead oluşturuldu'
    title.value = ''
    description.value = ''
    privateDetails.value = ''
    startPrice.value = '0'
    minIncrement.value = '1'
    instantBuyPrice.value = ''
    insuranceType.value = ''
    endsAt.value = ''
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
        <label>Başlık</label>
        <input class="input" v-model="title" placeholder="Örn. Avrupa e-ticaret lead’i" />
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
          <option v-for="type in insuranceTypes" :key="type" :value="type">{{ type }}</option>
        </select>
      </div>
      <div class="stack">
        <label>Bitiş Zamanı</label>
        <input class="input" v-model="endsAt" type="datetime-local" />
      </div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn" @click="submit">Oluştur</button>
    </div>
  </section>
</template>

