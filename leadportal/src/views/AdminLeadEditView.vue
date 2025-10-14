<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const leadId = route.params.id
const lead = ref(null)
const ok = ref('')
const err = ref('')
const insuranceTypes = ref([])

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load() {
  const { data } = await axios.get(`/api/leads/${leadId}`, { headers: authHeaders() })
  lead.value = data
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

async function save() {
  ok.value = ''
  err.value = ''
  try {
    const payload = {
      title: lead.value.title,
      description: lead.value.description,
      privateDetails: lead.value.privateDetails || undefined,
      startPrice: lead.value.startPrice,
      minIncrement: lead.value.minIncrement,
      instantBuyPrice: lead.value.instantBuyPrice,
      insuranceType: lead.value.insuranceType || undefined,
      endsAt: lead.value.endsAt,
      isActive: lead.value.isActive
    }
    await axios.put(`/api/leads/${leadId}`, payload, { headers: authHeaders() })
    ok.value = 'Kaydedildi'
  } catch (e) {
    err.value = 'Kaydedilemedi'
  }
}

onMounted(() => {
  load()
  loadInsuranceTypes()
})
</script>

<template>
  <section v-if="lead" class="grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
    <div class="section">
      <h2>Lead Düzenle</h2>
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
            <option v-for="type in insuranceTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>
        <label>Bitiş</label>
        <input class="input" type="datetime-local" v-model="lead.endsAt" />
        <div class="row">
          <label>Aktif mi?</label>
          <input type="checkbox" v-model="lead.isActive" />
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

