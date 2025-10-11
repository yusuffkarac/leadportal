<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { io } from 'socket.io-client'
import { formatPrice, getCurrencySymbol } from '@/utils/currency.js'

const route = useRoute()
const leadId = route.params.id
const lead = ref(null)
const amount = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const showInstantBuyModal = ref(false)
const isProcessingInstantBuy = ref(false)
const settings = ref({ defaultCurrency: 'TRY' })
const socket = io('/', {
  path: '/socket.io',
  transports: ['websocket'],
  auth: { token: localStorage.getItem('token') }
})

// Ayarları yükle
async function loadSettings() {
  try {
    const response = await axios.get('/api/settings', { headers: authHeaders() })
    settings.value = response.data
  } catch (error) {
    console.error('Ayarlar yüklenemedi:', error)
  }
}

async function loadLead() {
  const { data } = await axios.get(`/api/leads/${leadId}`, { headers: authHeaders() })
  // Lead'in aktif durumunu endsAt tarihine göre güncelle
  const now = new Date()
  const endDate = new Date(data.endsAt)
  const isExpired = endDate < now
  
  lead.value = {
    ...data,
    isActive: data.isActive && !isExpired
  }
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function shareLead() {
  const url = window.location.href
  const text = `${lead.value.title} - LeadPortal'da açık artırmaya çıkarıldı!`
  
  if (navigator.share) {
    // Native share API (mobil cihazlarda)
    navigator.share({
      title: lead.value.title,
      text: text,
      url: url
    }).catch(err => console.log('Paylaşım iptal edildi:', err))
  } else {
    // Fallback: URL'yi panoya kopyala
    navigator.clipboard.writeText(url).then(() => {
      alert('Lead linki panoya kopyalandı!')
    }).catch(() => {
      // Fallback: prompt ile göster
      prompt('Lead linkini kopyalayın:', url)
    })
  }
}

function openInstantBuyModal() {
  if (!lead.value.instantBuyPrice) {
    errorMessage.value = 'Bu lead için anında satın alma fiyatı belirlenmemiş'
    return
  }
  showInstantBuyModal.value = true
}

function closeInstantBuyModal() {
  showInstantBuyModal.value = false
  isProcessingInstantBuy.value = false
}

async function confirmInstantBuy() {
  isProcessingInstantBuy.value = true
  errorMessage.value = ''

  try {
    const response = await axios.post(`/api/leads/${leadId}/instant-buy`, {}, { headers: authHeaders() })
    
    if (response.data.success) {
      closeInstantBuyModal()
      // Lead'i yeniden yükle
      await loadLead()
    }
  } catch (error) {
    const errorData = error.response?.data
    errorMessage.value = errorData?.error || 'Anında satın alma işlemi başarısız'
  } finally {
    isProcessingInstantBuy.value = false
  }
}

function setQuickBid(multiplier) {
  const current = lead.value?.bids?.[0]?.amount ?? lead.value?.startPrice ?? 0
  const increment = lead.value?.minIncrement ?? 1
  const quickAmount = current + (increment * multiplier)
  amount.value = quickAmount.toString()
}

async function placeBid() {
  errorMessage.value = ''
  const numeric = Number(amount.value)
  if (!numeric || Number.isNaN(numeric)) {
    errorMessage.value = 'Lütfen geçerli bir sayı girin.'
    return
  }
  const current = lead.value?.bids?.[0]?.amount ?? lead.value?.startPrice ?? 0
  const minNext = current + (lead.value?.minIncrement ?? 1)
  if (numeric < minNext) {
    errorMessage.value = `Minimum teklif ${minNext} olmalı.`
    return
  }
  try {
    isSubmitting.value = true
    await axios.post('/api/bids', { leadId, amount: numeric }, { headers: authHeaders() })
    // Socket yayınını bekle; optimistik ekleme yok → çift kayıt önlenir
    amount.value = ''
  } catch (e) {
    const msg = e?.response?.data?.error || 'Teklif verilemedi'
    errorMessage.value = msg
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  await loadLead()
  socket.emit('join-lead', leadId)
  socket.on('bid:new', (payload) => {
    if (payload.leadId !== leadId) return
    const exists = lead.value?.bids?.some(b => b.id === payload.bid.id)
    if (!exists) {
      lead.value?.bids?.unshift(payload.bid)
    }
  })
  socket.on('lead:update', (payload) => {
    if (payload.leadId !== leadId) return
    // Lead temel bilgilerini güncelle (bids server tarafında dahil değilse koru)
    const currentBids = lead.value?.bids || []
    lead.value = { ...lead.value, ...payload.lead, bids: currentBids }
  })
  loadLead()
})

onUnmounted(() => {
  socket.close()
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
              <span class="status-text">{{ lead.isActive ? 'Aktif Artırma' : 'Tamamlandı' }}</span>
            </div>
            <h1 class="lead-title">{{ lead.title }}</h1>
            <p class="lead-description">{{ lead.description || 'Açıklama bulunmuyor' }}</p>
          </div>
          
          <div class="lead-stats-section">
            <div class="current-bid-card">
              <div class="bid-amount">{{ formatPrice(lead.bids?.[0]?.amount || lead.startPrice, settings.defaultCurrency) }}</div>
              <div class="bid-label">Güncel Teklif</div>
            </div>
            
           
            <div class="stats-row">
              <div class="stat-card">
                <div class="stat-value">{{ lead.bids?.length || 0 }}</div>
                <div class="stat-label">Teklif</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement }}</div>
                <div class="stat-label">Min Artış</div>
              </div>
            </div>
            <button class="share-btn-large" @click="shareLead" title="Paylaş">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <span>Paylaş</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Bid Form Section -->
      <div class="bid-form-section">
        <div class="bid-form-panel">
          <div class="form-header">
            <h2>Teklif Ver</h2>
            <p>En yüksek teklifi sen ver ve kazan!</p>
          </div>
          
          <div class="form-content">
            <div class="input-group">
              <label class="input-label">Teklif Miktarı</label>
              <div class="amount-input">
                <span class="currency">{{ getCurrencySymbol(settings.defaultCurrency) }}</span>
                <input 
                  type="number" 
                  v-model="amount" 
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
              <label class="quick-bid-label">Hızlı Teklif</label>
              <div class="quick-bid-buttons">
                <button 
                  class="quick-bid-btn" 
                  @click="setQuickBid(1)"
                  :disabled="!lead.isActive"
                >
                  +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement }}
                </button>
                <button 
                  class="quick-bid-btn" 
                  @click="setQuickBid(2)"
                  :disabled="!lead.isActive"
                >
                  +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 2 }}
                </button>
                <button 
                  class="quick-bid-btn" 
                  @click="setQuickBid(5)"
                  :disabled="!lead.isActive"
                >
                  +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 5 }}
                </button>
                <button 
                  class="quick-bid-btn" 
                  @click="setQuickBid(10)"
                  :disabled="!lead.isActive"
                >
                  +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 10 }}
                </button>
              </div>
            </div>
            
            <div class="bid-buttons">
              <button 
                class="submit-bid-btn" 
                :disabled="isSubmitting || !lead.isActive" 
                @click="placeBid"
              >
                <svg v-if="!isSubmitting" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span v-if="!lead.isActive">Artırma Bitti</span>
                <span v-else-if="isSubmitting">Gönderiliyor...</span>
                <span v-else>Teklif Ver</span>
              </button>
              
              <button 
                v-if="lead.instantBuyPrice && lead.isActive && !lead.isSold"
                class="instant-buy-btn" 
                @click="openInstantBuyModal" 
                :disabled="isSubmitting"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                  <path d="M12 3v6"/>
                  <path d="M12 15v6"/>
                </svg>
                <span>Anında Satın Al</span>
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

      <!-- Bids Section -->
      <div class="bids-section">
        <div class="bids-panel">
          <div class="panel-header">
            <h2>Teklif Geçmişi</h2>
            <span class="bid-count">{{ lead.bids?.length || 0 }} teklif</span>
          </div>
          
          <div v-if="!lead.bids?.length" class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m0-7v7m0-7l3-3m-3 3l-3-3m8 3h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2m0-7v7m0-7l3-3m-3 3l-3-3"/>
              </svg>
            </div>
            <h3>Henüz teklif yok</h3>
            <p>İlk teklifi siz verin ve bu artırmayı başlatın!</p>
          </div>
          
          <div v-else class="bids-timeline">
            <div class="bid-card" v-for="(bid, index) in lead.bids" :key="bid.id" :class="{ 'top-bid': index === 0 }">
              <div class="bid-rank">
                <span class="rank-number">{{ index + 1 }}</span>
                <span class="rank-label">.</span>
              </div>
              <div class="bid-info">
                <div class="bid-amount">{{ formatPrice(bid.amount, settings.defaultCurrency) }}</div>
                <div class="bid-user">{{ bid.user?.email || 'Anonim' }}</div>
              </div>
              <div class="bid-time">
                <div class="time-text">{{ new Date(bid.createdAt).toLocaleDateString('tr-TR') }}</div>
                <div class="time-detail">{{ new Date(bid.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="loading-container">
    <div class="loading-spinner"></div>
    <p>Lead bilgileri yükleniyor...</p>
  </div>

  <!-- Instant Buy Modal -->
  <div v-if="showInstantBuyModal" class="modal-backdrop" @click="closeInstantBuyModal">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h3>Anında Satın Al</h3>
        <button class="modal-close" @click="closeInstantBuyModal">×</button>
      </div>
      
      <div class="modal-body">
        <div class="instant-buy-info">
          <div class="lead-title">{{ lead?.title }}</div>
          <div class="price-display">
            <div class="price-label">Anında Satın Alma Fiyatı</div>
            <div class="price-amount">{{ formatPrice(lead?.instantBuyPrice, settings.defaultCurrency) }}</div>
          </div>
          <div class="confirmation-text">
            Bu lead'i anında satın almak istediğinizden emin misiniz?
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeInstantBuyModal" :disabled="isProcessingInstantBuy">
          İptal
        </button>
        <button class="btn btn-primary" @click="confirmInstantBuy" :disabled="isProcessingInstantBuy">
          <span v-if="isProcessingInstantBuy">İşleniyor...</span>
          <span v-else>Satın Al</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Page Layout */
.page-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 32px;
  align-items: start;
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

.lead-info-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}


.bid-form-panel {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

.bid-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submit-bid-btn {
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(135deg, var(--#3b82f6) 0%, #1d4ed8 100%);
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
  margin-top: 2px;
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
</style>

