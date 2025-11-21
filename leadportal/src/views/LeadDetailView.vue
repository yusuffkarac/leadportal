<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { io } from 'socket.io-client'
import { formatPrice, getCurrencySymbol } from '@/utils/currency.js'
import { useAlert } from '../composables/useAlert'
import { now, createDate } from '@/utils/serverTime.js'
import InstantBuyModal from '@/components/InstantBuyModal.vue'
import { Icon } from '@iconify/vue'

const { success, error } = useAlert()

const route = useRoute()
const leadId = route.params.id
const lead = ref(null)
const currentUser = ref(null)
const maxBid = ref('') // Changed: Now users enter their MAXIMUM bid
const errorMessage = ref('')
const successMessage = ref('')
const isSubmitting = ref(false)
const showInstantBuyModal = ref(false)
const isProcessingInstantBuy = ref(false)
const settings = ref({
  defaultCurrency: 'EUR',
  enableBiddingHours: false,
  biddingStartHour: '08:00',
  biddingEndHour: '20:00'
})
const biddingHoursWarning = ref('')
let pollingInterval = null
const socket = io('/', {
  path: '/socket.io',
  transports: ['websocket'],
  auth: { token: localStorage.getItem('token') }
})

// Debug logging
socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id)
})

socket.on('connect_error', (error) => {
  console.error('[Socket] Connection error:', error.message)
})

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected:', reason)
})

// Watch (çan) durumu
const watching = ref(false)

async function loadWatching() {
  try {
    const res = await axios.get(`/api/leads/${leadId}/watch`, { headers: authHeaders() })
    watching.value = !!res.data?.watching
  } catch {}
}

async function toggleWatch() {
  try {
    const res = await axios.post(`/api/leads/${leadId}/watch`, {}, { headers: authHeaders() })
    watching.value = !!res.data?.watching
  } catch {}
}

// Ayarları yükle
async function loadSettings() {
  try {
    const response = await axios.get('/api/settings', { headers: authHeaders() })
    settings.value = response.data
  } catch (error) {
    console.error('Einstellungen konnten nicht geladen werden:', error)
  }
}

async function loadLead() {
  const { data } = await axios.get(`/api/leads/${leadId}`, { headers: authHeaders() })
  // Lead'in aktif durumunu endsAt tarihine göre güncelle
  const currentTime = now()
  const endDate = createDate(data.endsAt)
  const isExpired = endDate < currentTime

  lead.value = {
    ...data,
    isActive: data.isActive && !isExpired
  }
}

// Mevcut kullanıcıyı yükle
async function loadCurrentUser() {
  try {
    const res = await axios.get('/api/auth/profile', { headers: authHeaders() })
    currentUser.value = res.data?.user || null
  } catch (e) {
    currentUser.value = null
  }
}

// Kullanıcının bu lead için verdiği maksimum teklif (varsa)
const myMaxBid = computed(() => {
  if (!lead.value?.bids || !currentUser.value?.id) return null
  const myBids = lead.value.bids.filter(b => b?.user?.id === currentUser.value.id && typeof b?.maxBid === 'number')
  if (!myBids.length) return null
  return Math.max(...myBids.map(b => b.maxBid))
})

// Şu an lider miyim? (görünür en üst teklif bana mı ait)
const amILeader = computed(() => {
  if (!lead.value?.bids?.length || !currentUser.value?.id) return false
  return lead.value.bids[0]?.user?.id === currentUser.value.id
})

// Teklif verme saatleri kontrolü
const canBidNow = computed(() => {
  if (!settings.value.enableBiddingHours) return true

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTimeInMinutes = currentHour * 60 + currentMinute

  const [startHour, startMinute] = settings.value.biddingStartHour.split(':').map(Number)
  const [endHour, endMinute] = settings.value.biddingEndHour.split(':').map(Number)
  const startTimeInMinutes = startHour * 60 + startMinute
  const endTimeInMinutes = endHour * 60 + endMinute

  return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes
})

const biddingHoursMessage = computed(() => {
  if (!settings.value.enableBiddingHours) return ''
  if (canBidNow.value) return ''
  return `Gebotszeiten sind zwischen ${settings.value.biddingStartHour} - ${settings.value.biddingEndHour}. Bitte versuchen Sie es zu diesen Zeiten erneut.`
})

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function shareLead() {
  const url = window.location.href
  const text = `${lead.value.title} - bei LeadPortal versteigert!`
  
  if (navigator.share) {
    // Native share API (mobil cihazlarda)
    navigator.share({
      title: lead.value.title,
      text: text,
      url: url
    }).catch(err => console.log('Teilen abgebrochen:', err))
  } else {
    // Fallback: URL'yi panoya kopyala
    navigator.clipboard.writeText(url).then(() => {
      alert('Lead-Link in die Zwischenablage kopiert!')
    }).catch(() => {
      // Fallback: prompt ile göster
      prompt('Lead-Link kopieren:', url)
    })
  }
}

function openInstantBuyModal() {
  // For SOFORT_KAUF, use startPrice; for AUCTION, use instantBuyPrice
  if (lead.value.leadType === 'SOFORT_KAUF') {
    showInstantBuyModal.value = true
  } else if (!lead.value.instantBuyPrice) {
    errorMessage.value = 'Für diesen Lead wurde kein Sofortkaufpreis festgelegt'
    return
  } else {
    showInstantBuyModal.value = true
  }
}

function closeInstantBuyModal() {
  showInstantBuyModal.value = false
}

async function handleInstantBuySuccess() {
  // Lead'i yeniden yükle
  await loadLead()
}

function setQuickBid(multiplier) {
  const current = lead.value?.bids?.[0]?.amount ?? lead.value?.startPrice ?? 0
  const increment = lead.value?.minIncrement ?? 1
  const quickAmount = current + (increment * multiplier)
  maxBid.value = quickAmount.toString()
}

async function placeBid() {
  errorMessage.value = ''
  successMessage.value = ''
  const numeric = Number(maxBid.value)
  if (!numeric || Number.isNaN(numeric)) {
    errorMessage.value = 'Bitte geben Sie eine gültige Zahl ein.'
    return
  }
  const current = lead.value?.bids?.[0]?.amount ?? lead.value?.startPrice ?? 0
  const minNext = current + (lead.value?.minIncrement ?? 1)
  if (numeric < minNext) {
    errorMessage.value = `Minimum maksimum teklif ${minNext} olmalı.`
    return
  }
  try {
    isSubmitting.value = true
    const response = await axios.post('/api/bids', { leadId, maxBid: numeric }, { headers: authHeaders() })

    // Show success message based on result
    if (response.data.isLeader) {
      successMessage.value = `Tebrikler! Şu anda lidersiniz. Görünür fiyat: ${formatPrice(response.data.visiblePrice, settings.value.defaultCurrency)}`
      success(successMessage.value)
    } else {
      successMessage.value = `Teklifiniz alındı, ancak başka bir kullanıcının maksimumu daha yüksek. Lider olmak için daha yüksek bir maksimum teklif verin.`
      error(successMessage.value)
    }

    // Clear input after successful bid
    maxBid.value = ''

    // Reload lead to get updated bids
    await loadLead()
  } catch (e) {
    const msg = e?.response?.data?.error || 'Gebot konnte nicht abgegeben werden'
    errorMessage.value = msg
    error(msg)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  await Promise.all([loadLead(), loadCurrentUser()])
  await loadWatching()

  console.log('[Socket] Emitting join-lead for:', leadId)
  socket.emit('join-lead', leadId)

  socket.on('bid:new', (payload) => {
    console.log('[Socket] Received bid:new event:', payload)
    if (payload.leadId !== leadId) return

    // Update lead bids array
    if (lead.value) {
      // Check if bid already exists
      const exists = lead.value.bids?.some(b => b.id === payload.bid.id)
      if (!exists) {
        console.log('[Socket] Adding new bid to UI:', payload.bid)
        // Add new bid to the beginning of the array
        lead.value.bids = [payload.bid, ...(lead.value.bids || [])]
      } else {
        console.log('[Socket] Bid already exists, skipping')
      }
    }

    // Show reserve price notification if needed
    if (payload.reserveMet === false) {
      error('Hinweis: Der Mindestpreis wurde noch nicht erreicht.')
    }
  })

  socket.on('lead:update', (payload) => {
    console.log('[Socket] Received lead:update event:', payload)
    if (payload.leadId !== leadId) return
    // Lead temel bilgilerini güncelle (bids server tarafında dahil değilse koru)
    const currentBids = lead.value?.bids || []
    lead.value = { ...lead.value, ...payload.lead, bids: currentBids }
  })

  socket.on('lead:extended', (payload) => {
    console.log('[Socket] Received lead:extended event:', payload)
    if (payload.leadId !== leadId) return
    // Anti-sniping: Auction time extended
    lead.value.endsAt = payload.newEndsAt
    success(`Açık artırma süresi ${payload.extensionSeconds} saniye uzatıldı!`)
  })

  // Polling mechanism as fallback - reload lead every 10 seconds
  pollingInterval = setInterval(async () => {
    console.log('[Polling] Refreshing lead data...')
    await loadLead()
  }, 3000) // 10 seconds
})

onUnmounted(() => {
  socket.close()
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }
})
</script>

<template>
  <div v-if="lead" class="modern-lead-detail">
    <div class="page-content">
      <!-- Hero Section -->
      <div class="lead-hero">
        <div class="lead-info-section">
          <div class="lead-title-section">
            <div class="lead-status">
              <span class="status-indicator" :class="lead.isActive ? 'active' : 'inactive'"></span>
              <span class="status-text">{{ lead.isActive ? 'Aktive Auktion' : 'Abgeschlossen' }}</span>
            </div>
            <h1 class="lead-title">{{ lead.title }}</h1>
            <p class="lead-description">{{ lead.description || 'Keine Beschreibung verfügbar' }}</p>
            <div v-if="lead.insuranceType" class="insurance-type-badge">
              <span class="insurance-label">Versicherungstyp:</span>
              <span class="insurance-value">{{ lead.insuranceType }}</span>
            </div>
            <button class="watch-btn" :class="{ active: watching }" @click="toggleWatch" title="Gebotsbenachrichtigungen {{ watching ? 'deaktivieren' : 'aktivieren' }}">
              <svg v-if="!watching" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 17h5l-1.405-1.405C18.21 14.79 18 13.918 18 13V8a6 6 0 10-12 0v5c0 .918-.21 1.79-.595 2.595L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                <path d="M2 2l20 20"/>
              </svg>
              <span>{{ watching ? 'Benachrichtigung aktiv' : 'Benachrichtigung deaktiviert' }}</span>
            </button>
          </div>
          
          <div class="lead-stats-section">
            <!-- SOFORT_KAUF: Show fixed price and buy button -->
            <template v-if="lead.leadType === 'SOFORT_KAUF'">
              <div class="current-bid-card">
                <div class="bid-amount">{{ formatPrice(lead.startPrice, settings.defaultCurrency) }}</div>
                <div class="bid-label">Fester Preis</div>
              </div>

              <button
                v-if="lead.isActive && !lead.isSold"
                class="sofort-kauf-buy-btn-large"
                @click="openInstantBuyModal"
              >
                <Icon icon="mdi:flash" width="24" height="24" />
                <span>Kaufen</span>
                <span class="price">{{ formatPrice(lead.startPrice, settings.defaultCurrency) }}</span>
              </button>
            </template>

            <!-- AUCTION: Show current bid and stats -->
            <template v-else>
              <div class="current-bid-card">
                <div class="bid-amount">{{ formatPrice(lead.bids?.[0]?.amount || lead.startPrice, settings.defaultCurrency) }}</div>
                <div class="bid-label">Aktuelles Gebot</div>
              </div>

              <div class="stats-row">
                <div class="stat-card">
                  <div class="stat-value">{{ lead.bids?.length || 0 }}</div>
                  <div class="stat-label">Gebot{{ (lead.bids?.length || 0) !== 1 ? 'e' : '' }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement }}</div>
                  <div class="stat-label">Mindesterhöhung</div>
                </div>
              </div>
            </template>
            <!-- Özel Detaylar: sadece satın alan/sahip/admin görür; backend null döndürürse gizli kalır -->
            <div v-if="lead.privateDetails" class="private-details">
              <div class="private-title">Private Details für Käufer</div>
              <pre class="private-content">{{ lead.privateDetails }}</pre>
            </div>
            <button class="share-btn-large" @click="shareLead" title="Paylaş">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <span>Teilen</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Bid Form Section - Only for AUCTION type -->
      <div v-if="lead.leadType !== 'SOFORT_KAUF'" class="bid-form-section">
        <div class="bid-form-panel">
          <div class="form-header">
            <h2>Gebot abgeben</h2>
            <p>Geben Sie Ihren Maximalbetrag ein - das System erhöht automatisch für Sie!</p>

            <!-- Teklif verme saatleri uyarısı -->
            <div v-if="biddingHoursMessage" class="bidding-hours-warning">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span>{{ biddingHoursMessage }}</span>
            </div>

            <div v-if="myMaxBid" class="my-bid-info" role="status" aria-live="polite">
              <div class="my-bid-left">
                <span class="my-max-label">Ihr Maximalgebot</span>
                <span class="my-max-value">{{ formatPrice(myMaxBid, settings.defaultCurrency) }}</span>
              </div>
              <div v-if="amILeader" class="leader-badge" title="Şu an en yüksek teklif sizde">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span>Sie sind derzeit führend</span>
              </div>
            </div>
          </div>

          <div class="form-content">
            <div class="proxy-info-box d-none">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              <span>Geben Sie Ihren Maximalbetrag ein. Das System bietet automatisch den Mindestbetrag, um führend zu sein. Wenn andere versuchen, Sie zu überbieten, wird automatisch bis zu Ihrem Maximum erhöht.</span>
            </div>

            <div class="input-group">
              <label class="input-label">Ihr Maximalgebot</label>
              <div class="amount-input">
                <span class="currency">{{ getCurrencySymbol(settings.defaultCurrency) }}</span>
                <input
                  type="number"
                  v-model="maxBid"
                  :placeholder="`${(lead.bids?.[0]?.amount ?? lead.startPrice) + lead.minIncrement}`"
                  class="amount-field"
                  @keyup.enter="placeBid"
                />
              </div>
              <div class="input-info">
                <span class="min-bid">Minimum: {{ getCurrencySymbol(settings.defaultCurrency) }}{{ (lead.bids?.[0]?.amount ?? lead.startPrice) + lead.minIncrement }}</span>
              </div>
            </div>
            
            <!-- Hızlı Teklif Butonları -->
            <div class="quick-bid-section">
              <label class="quick-bid-label">Schnellgebot</label>
              <div class="quick-bid-buttons">
                <button
                  class="quick-bid-btn"
                  @click="setQuickBid(1)"
                  :disabled="!lead.isActive || !canBidNow"
                >
                  +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement }}
                </button>
                <button
                  class="quick-bid-btn"
                  @click="setQuickBid(2)"
                  :disabled="!lead.isActive || !canBidNow"
                >
                  +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 2 }}
                </button>
                <button
                  class="quick-bid-btn"
                  @click="setQuickBid(5)"
                  :disabled="!lead.isActive || !canBidNow"
                >
                  +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 5 }}
                </button>
                <button
                  class="quick-bid-btn"
                  @click="setQuickBid(10)"
                  :disabled="!lead.isActive || !canBidNow"
                >
                  +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 10 }}
                </button>
              </div>
            </div>
            
            <div class="bid-buttons">
              <button
                class="submit-bid-btn"
                :disabled="isSubmitting || !lead.isActive || !canBidNow"
                @click="placeBid"
              >

                <span v-if="!lead.isActive">Auktion beendet</span>
                <span v-else-if="!canBidNow">Außerhalb der Gebotszeiten</span>
                <span v-else-if="isSubmitting">Wird gesendet...</span>
                <span v-else>Gebot abgeben</span>
                 <Icon icon="mdi:gavel" width="20" height="20" />
              </button>
              
              <button 
                v-if="lead.instantBuyPrice && lead.isActive && !lead.isSold"
                class="instant-buy-btn" 
                @click="openInstantBuyModal" 
                :disabled="isSubmitting"
              >
              <svg class="icon-fastbuy" width="16" height="16" viewBox="0 0 24 24"></svg>
                <span>Sofort kaufen</span>
                <span class="instant-price">{{ formatPrice(lead.instantBuyPrice, settings.defaultCurrency) }}</span>
              </button>
            </div>
            
            <div v-if="errorMessage" class="error-alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ errorMessage }}
            </div>
          </div>
        </div>
      </div>

      <!-- Bids Section - Only for AUCTION type -->
      <div v-if="lead.leadType !== 'SOFORT_KAUF'" class="bids-section">
        <div class="bids-panel">
          <div class="panel-header">
            <h2>Gebotsverlauf</h2>
            <span class="bid-count">{{ lead.bids?.length || 0 }} Gebot{{ (lead.bids?.length || 0) !== 1 ? 'e' : '' }}</span>
          </div>
          
          <div v-if="!lead.bids?.length" class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m0-7v7m0-7l3-3m-3 3l-3-3m8 3h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2m0-7v7m0-7l3-3m-3 3l-3-3"/>
              </svg>
            </div>
            <h3>Noch keine Gebote</h3>
            <p>Geben Sie das erste Gebot ab und starten Sie diese Auktion!</p>
          </div>
          
          <div v-else class="bids-timeline">
            <div class="bid-card" v-for="(bid, index) in lead.bids" :key="bid.id" :class="{ 'top-bid': index === 0 }">
              <div class="bid-rank">
                <span class="rank-number">{{ index + 1 }}</span>
                <span class="rank-label">.</span>
              </div>
              <div class="bid-info">
                <div class="bid-amount">{{ formatPrice(bid.amount, settings.defaultCurrency) }}</div>
                <div class="bid-user">{{ bid.user?.email || 'Anonym' }}</div>
               <!-- <div v-if="index === 0" class="winning-indicator">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                   <span>Şu an kazanan</span>
                </div> -->
              </div>
              <div class="bid-time">
                <div class="time-text">{{ new Date(bid.createdAt).toLocaleDateString('de-DE') }}</div>
                <div class="time-detail">{{ new Date(bid.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="loading-container">
    <div class="loading-spinner"></div>
    <p>Lead-Informationen werden geladen...</p>
  </div>

  <!-- Instant Buy Modal -->
  <InstantBuyModal
    :show="showInstantBuyModal"
    :lead="lead"
    :currency="settings.defaultCurrency"
    @close="closeInstantBuyModal"
    @success="handleInstantBuySuccess"
  />
</template>

<style scoped>
/* Proxy Bidding Info Box */
.proxy-info-box {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #dbeafe;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  margin-bottom: 20px;
  align-items: flex-start;
}

.proxy-info-box svg {
  flex-shrink: 0;
  color: #1e40af;
  margin-top: 2px;
}

.proxy-info-box span {
  color: #1e3a8a;
  font-size: 0.875rem;
  line-height: 1.5;
}

.input-info .info-text {
  color: #6b7280;
  font-size: 0.875rem;
}

/* Page Layout */
.page-content {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: var(--page-padding);
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 32px;
  align-items: start;
}

/* Single column layout for SOFORT_KAUF */
.page-content:has(.lead-hero) {
  grid-template-columns: 1fr 400px;
}

.modern-lead-detail:has(.lead-hero):not(:has(.bid-form-section)) .page-content {
  grid-template-columns: 1fr;
  max-width: 900px;
}

.modern-lead-detail:has(.lead-hero):not(:has(.bid-form-section)) .lead-hero {
  max-width: 100%;
}

@media (max-width: 1024px) {
  .page-content {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: var(--page-padding-mobile);
  }
}

@media (max-width: 768px) {
  .page-content {
    padding: var(--page-padding-mobile);
    padding-bottom: calc(var(--page-padding-mobile) + 2rem);
    gap: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}

/* Bids Section */
.bids-section {
  grid-column: 1 / -1;
  margin-top: 32px;
}

.bids-panel {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

@media (max-width: 768px) {
  .bids-section {
    margin-top: 16px;
  }
  
  .bids-panel {
    padding: 16px;
    border-radius: 12px;
  }
}

/* Hero Section */
.lead-hero {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  height: -webkit-fill-available;
  margin-bottom: 0px;
}

.private-details {
  margin-top: 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 12px;
}
.private-title {
  font-weight: 600;
  color: #9a3412;
  margin-bottom: 8px;
}
.private-content {
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.875rem;
  color: #7c2d12;
}

.lead-info-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (max-width: 768px) {
  .lead-hero {
    padding: 16px;
    border-radius: 12px;
  }
  
  .lead-info-section {
    gap: 16px;
  }
}


.bid-form-panel {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  height: 100%;
}

.my-bid-info {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
}

.my-bid-left { display: flex; align-items: baseline; gap: 8px; align-items:center; flex-direction: column; }
.my-max-label { color: #6b7280; font-size: 0.875rem; }
.my-max-value { color: #111827; font-size: 1.125rem; font-weight: 700; }

.leader-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.85rem;
}

.bidding-hours-warning {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 10px;
  margin-top: 12px;
  align-items: flex-start;
}

.bidding-hours-warning svg {
  flex-shrink: 0;
  color: #d97706;
  margin-top: 2px;
}

.bidding-hours-warning span {
  color: #92400e;
  font-size: 0.875rem;
  line-height: 1.5;
  font-weight: 500;
}

.bid-form-section{
  height: 100%;
}

@media (max-width: 768px) {
  .bid-form-panel {
    padding: 16px;
    border-radius: 12px;
  }
}

/* Watch button */
.watch-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
}

.watch-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1e40af;
}

.bid-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submit-bid-btn {
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-bid-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}

.submit-bid-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.instant-buy-btn {
  width: 100%;
  padding: 12px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-direction: row;
}

.instant-buy-btn:hover:not(:disabled) {
  background: #059669;
  transform: none;
}

.instant-buy-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.instant-price {
  font-size: 1.1rem;
  font-weight: 600;
}
.icon-fastbuy{
  margin-bottom: 0.2rem;
}

/* Responsive */
@media (max-width: 768px) {
  .bid-buttons {
    gap: 8px;
  }
  
  .instant-buy-btn {
    padding: 10px 16px;
    font-size: 0.9rem;
  }
  
  .instant-price {
    font-size: 1rem;
  }
  
  /* Typography adjustments for mobile */
  .lead-title {
    font-size: 1.5rem !important;
    line-height: 1.3 !important;
  }
  
  .lead-description {
    font-size: 0.9rem !important;
    line-height: 1.4 !important;
  }
  
  .insurance-type-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--primary-light);
    color: var(--primary);
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 20px;
  }
  
  .insurance-label {
    font-weight: 600;
  }
  
  .insurance-value {
    background: var(--primary);
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
  }
  
  .current-bid-card .bid-amount {
    font-size: 1.75rem !important;
  }
  
  .stats-row {
    flex-wrap: wrap !important;
    gap: 8px !important;
  }
  
  .stat-card {
    flex: 1 !important;
    min-width: calc(50% - 4px) !important;
  }
  
  .quick-bid-buttons {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 8px !important;
  }
  
  .quick-bid-btn {
    padding: 8px 12px !important;
    font-size: 0.85rem !important;
  }
  
  .submit-bid-btn {
    padding: 14px 20px !important;
    font-size: 1rem !important;
  }
  
  .amount-input input {
    font-size: 1.1rem !important;
    padding: 12px !important;
  }
  
  .watch-btn {
    padding: 6px 10px !important;
    font-size: 0.85rem !important;
  }
  
  .watch-btn span {
    display: none !important;
  }
  
  .share-btn-large {
    padding: 8px 12px !important;
    font-size: 0.85rem !important;
  }
  
  .share-btn-large span {
    display: none !important;
  }
  
  .bid-card {
    padding: 12px !important;
  }
  
  .bid-card .bid-amount {
    font-size: 1.1rem !important;
  }
  
  .bid-card .bid-user {
    font-size: 0.8rem !important;
  }
  
  .form-header h2 {
    font-size: 1.25rem !important;
  }
  
  .form-header p {
    font-size: 0.85rem !important;
  }
  
  .panel-header h2 {
    font-size: 1.25rem !important;
  }
}

.winning-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #065f46;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 0.75rem;
  margin-top: 4px;
}

/* Modal Stilleri */
.modal-backdrop {
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
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--primary);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.modal-close:hover {
  color: #374151;
}

.modal-body {
  padding: 24px;
}

.instant-buy-info {
  text-align: center;
}

.lead-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
}

.price-display {
  background: #f3f4f6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.price-label {
  font-size: 0.875rem;
  color: var(--primary);
  margin-bottom: 4px;
}

.price-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #10b981;
}

.confirmation-text {
  color: var(--primary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.modal-footer {
  padding: 16px 24px 20px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-size: 0.875rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-primary {
  background: #10b981;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #059669;
}

/* Mobile Modal Optimizations */
@media (max-width: 768px) {
  .modal-backdrop {
    padding: 12px;
  }
  
  .modal {
    border-radius: 8px;
    max-width: 100%;
  }
  
  .modal-header {
    padding: 16px 20px 12px;
  }
  
  .modal-header h3 {
    font-size: 1.125rem;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .lead-title {
    font-size: 1rem;
    margin-bottom: 12px;
  }
  
  .price-display {
    padding: 12px;
    margin-bottom: 12px;
  }
  
  .price-amount {
    font-size: 1.25rem;
  }
  
  .confirmation-text {
    font-size: 0.8rem;
  }
  
  .modal-footer {
    padding: 12px 20px 16px;
    flex-direction: column;
    gap: 8px;
  }
  
  .btn {
    width: 100%;
    padding: 12px 20px;
    font-size: 0.9rem;
  }
}

/* Small mobile devices */
@media (max-width: 480px) {
  .page-content {
    padding: 8px;
    gap: 12px;
  }
  
  .lead-hero,
  .bid-form-panel,
  .bids-panel {
    padding: 12px;
    border-radius: 8px;
  }
  
  .quick-bid-buttons {
    grid-template-columns: 1fr !important;
  }
  
  .stats-row {
    flex-direction: column !important;
  }
  
  .stat-card {
    min-width: 100% !important;
  }
  
  .modal {
    margin: 8px;
    max-width: calc(100vw - 16px);
  }
}
.d-none{
  display: none;
}

/* SOFORT_KAUF Buy Button */
.sofort-kauf-buy-btn-large {
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.sofort-kauf-buy-btn-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
}

.sofort-kauf-buy-btn-large .price {
  font-size: 1.25rem;
  font-weight: 700;
}

@media (max-width: 768px) {
  .sofort-kauf-buy-btn-large {
    padding: 14px 20px;
    font-size: 1rem;
  }

  .sofort-kauf-buy-btn-large .price {
    font-size: 1.1rem;
  }
}
</style>

