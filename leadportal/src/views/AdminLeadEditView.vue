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
  lead.value = {
    ...data,
    isShowcase: !!data.isShowcase,
    isPremium: !!data.isPremium
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
    console.error('Versicherungsarten konnten nicht geladen werden:', e)
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

  // Başlangıç tarihi kontrolü: eğer verilmişse bitiş tarihinden önce olmalı
  if (lead.value.startsAt && lead.value.endsAt) {
    const start = new Date(lead.value.startsAt)
    const end = new Date(lead.value.endsAt)
    if (start >= end) {
      err.value = 'Das Startdatum muss vor dem Enddatum liegen.'
      return
    }
  }

  try {
    const payload = {
      title: lead.value.title,
      description: lead.value.description,
      privateDetails: lead.value.privateDetails || undefined,
      startPrice: lead.value.startPrice,
      minIncrement: lead.value.minIncrement,
      instantBuyPrice: lead.value.instantBuyPrice,
      insuranceType: lead.value.insuranceType || undefined,
      startsAt: lead.value.startsAt || undefined,
      endsAt: lead.value.endsAt,
      isActive: lead.value.isActive,
      isShowcase: !!lead.value.isShowcase,
      isPremium: !!lead.value.isPremium
    }
    await axios.put(`/api/leads/${leadId}`, payload, { headers: authHeaders() })
    ok.value = 'Gespeichert'
  } catch (e) {
    err.value = 'Konnte nicht gespeichert werden'
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
      <h2>Lead bearbeiten</h2>
      <div class="stack">
        <label>Titel</label>
        <input class="input" v-model="lead.title" />
        <label>Beschreibung</label>
        <textarea class="input" v-model="lead.description" rows="4" />
        <label>Lead-Details (Nur für Käufer sichtbar)</label>
        <textarea class="input" v-model="lead.privateDetails" rows="6" placeholder="Geben Sie Detailinformationen ein, die der Käufer sehen wird" />
        <div class="row">
          <div class="stack" style="flex:1">
            <label>Startpreis</label>
            <input class="input" type="number" v-model.number="lead.startPrice" />
          </div>
          <div class="stack" style="flex:1">
            <label>Mindesterhöhung</label>
            <input class="input" type="number" v-model.number="lead.minIncrement" />
          </div>
        </div>
        <div class="stack">
          <label>Sofortkaufpreis (Optional)</label>
          <input class="input" type="number" v-model.number="lead.instantBuyPrice" placeholder="Kann leer gelassen werden" />
          <small style="color: var(--primary); font-size: 0.875rem;">Wer diesen Preis zahlt, kann sofort kaufen, ohne auf die Auktion zu warten</small>
        </div>
        <div class="stack">
          <label>Versicherungstyp (Optional)</label>
          <select class="input" v-model="lead.insuranceType">
            <option value="">Versicherungstyp auswählen</option>
            <option v-for="type in insuranceTypes" :key="type.name" :value="type.name">{{ type.name }}</option>
          </select>
        </div>
        <label>Startdatum (Optional)</label>
        <input class="input" type="datetime-local" v-model="lead.startsAt" />
        <small style="color: var(--primary); font-size: 0.875rem;">Wenn leer gelassen, wird der Lead sofort aktiv. Wenn Sie ein zukünftiges Datum wählen, wird er zu diesem Zeitpunkt aktiv.</small>
        <label>Enddatum</label>
        <input class="input" type="datetime-local" v-model="lead.endsAt" />
        <div class="row">
          <label>Aktiv?</label>
          <input type="checkbox" v-model="lead.isActive" />
        </div>
        <div class="stack toggle-field">
          <label>Zu Showcase hinzufügen</label>
          <div class="toggle-container">
            <label class="toggle-switch">
              <input type="checkbox" v-model="lead.isShowcase" />
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">{{ lead.isShowcase ? 'Aktiv' : 'Inaktiv' }}</span>
          </div>
          <small class="toggle-help">
            Leads im Showcase werden im Showcase-Bereich der Startseite hervorgehoben.
          </small>
        </div>
        <div class="stack toggle-field">
          <label>Zu Premium hinzufügen</label>
          <div class="toggle-container">
            <label class="toggle-switch">
              <input type="checkbox" v-model="lead.isPremium" />
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">{{ lead.isPremium ? 'Aktiv' : 'Inaktiv' }}</span>
          </div>
          <small class="toggle-help">
            Premium-Leads werden im Premium-Bereich der Marktplatzseite angezeigt.
          </small>
        </div>
        <div class="row">
          <button class="btn" @click="save">Speichern</button>
          <span v-if="ok" style="color:#16a34a">{{ ok }}</span>
          <span v-if="err" style="color:#ef4444">{{ err }}</span>
        </div>
      </div>
    </div>
    <div class="section">
      <h3>Gebote</h3>
      <div v-if="!lead.bids?.length" class="muted">Keine Gebote.</div>
      <div v-else class="stack">
        <div class="card" v-for="b in lead.bids" :key="b.id">
          <div class="row" style="justify-content:space-between">
            <strong>{{ b.amount }}</strong>
            <span class="muted">{{ new Date(b.createdAt).toLocaleString('de-DE') }}</span>
          </div>
          <div class="muted">{{ b.user?.email || 'Anonym' }}</div>
        </div>
      </div>
    </div>
  </section>
  <section v-else class="muted">Wird geladen...</section>
</template>
