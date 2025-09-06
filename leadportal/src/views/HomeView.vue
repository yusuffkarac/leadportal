<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import axios from 'axios'
import { io } from 'socket.io-client'

const leads = ref([])
const socket = io('/', { path: '/socket.io' })
const showInstantBuyModal = ref(false)
const selectedLead = ref(null)
const isProcessing = ref(false)

// Zaman hesaplama fonksiyonu
function formatTimeRemaining(endsAt) {
  const now = new Date()
  const endTime = new Date(endsAt)
  const diff = endTime - now
  
  if (diff <= 0) return 'Süresi doldu'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours}s ${minutes}d`
  } else {
    return `${minutes}d`
  }
}

async function fetchLeads() {
  const { data } = await axios.get('/api/leads', {
    headers: authHeaders()
  })
  // Lead'lerin aktif durumunu endsAt tarihine göre güncelle
  leads.value = data.map(lead => {
    const now = new Date()
    const endDate = new Date(lead.endsAt)
    const isExpired = endDate < now
    
    return {
      ...lead,
      isActive: lead.isActive && !isExpired,
      isExpired: isExpired // Geçmiş lead'leri işaretle
    }
  })
  // Tüm listelenen lead odalarına katıl, canlı güncellemeleri al
  for (const l of leads.value) {
    socket.emit('join-lead', l.id)
  }
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function shareLead(lead) {
  const url = `${window.location.origin}/lead/${lead.id}`
  const text = `${lead.title} - LeadPortal'da açık artırmaya çıkarıldı!`
  
  if (navigator.share) {
    // Native share API (mobil cihazlarda)
    navigator.share({
      title: lead.title,
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

function openInstantBuyModal(lead) {
  if (!lead.instantBuyPrice) {
    return
  }
  selectedLead.value = lead
  showInstantBuyModal.value = true
}

function closeInstantBuyModal() {
  showInstantBuyModal.value = false
  selectedLead.value = null
  isProcessing.value = false
}

async function confirmInstantBuy() {
  if (!selectedLead.value) return
  
  isProcessing.value = true
  
  try {
    const response = await axios.post(`/api/leads/${selectedLead.value.id}/instant-buy`, {}, { headers: authHeaders() })
    
    if (response.data.success) {
      closeInstantBuyModal()
      // Lead'leri yeniden yükle
      await fetchLeads()
    }
  } catch (error) {
    const errorData = error.response?.data
    console.error('Anında satın alma hatası:', errorData?.error || 'Anında satın alma işlemi başarısız')
  } finally {
    isProcessing.value = false
  }
}

onMounted(() => {
  fetchLeads()
  // Her yeni teklifte ilgili kartı anında güncelle
  socket.on('bid:new', ({ leadId, bid }) => {
    const idx = leads.value.findIndex(l => l.id === leadId)
    if (idx !== -1) {
      const current = leads.value[idx]
      const existing = current.bids || []
      leads.value[idx] = { ...current, bids: [bid, ...existing] }
    }
  })
  
  // Her dakika zamanı güncelle
  const timeInterval = setInterval(() => {
    // Vue reactivity için leads array'ini güncelle
    leads.value = [...leads.value]
  }, 60000)
  
  onUnmounted(() => {
    clearInterval(timeInterval)
    socket.close()
  })
})
</script>

<template>
  <section>
    <div class="page-content">
      <div class="page-header">
        <h1>Aktif Açık Artırmalar</h1>
        <!-- <p class="page-subtitle">Canlı teklifler ve açık artırmalar</p> -->
      </div>
      
      <div v-if="!leads.length" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>Şu anda görüntülenecek lead yok</h3>
        <p>Yeni açık artırmalar eklendiğinde burada görünecek</p>
      </div>
      
      <div v-else class="auctions-grid">
      <div class="auction-card" v-for="lead in leads" :key="lead.id">
        <div class="card-header">
          <div class="card-title">
            <h3>{{ lead.title }}</h3>
            <span class="status-badge" :class="lead.isExpired ? 'expired' : 'active'">
              {{ lead.isExpired ? 'Geçmiş' : 'Aktif' }}
            </span>
          </div>
          <div class="current-bid">
            <div class="bid-amount">
              <span v-if="lead.bids && lead.bids.length">₺{{ lead.bids[0].amount }}</span>
              <span v-else>₺{{ lead.startPrice }}</span>
            </div>
            <div class="bid-label">Güncel Teklif</div>
            <div v-if="lead.instantBuyPrice" class="instant-buy-price">
              <div class="instant-amount">₺{{ lead.instantBuyPrice.toLocaleString() }}</div>
              <div class="instant-label">Anında Satın Al</div>
            </div>
          </div>
        </div>
        
        <div class="card-description">
          {{ lead.description || 'Açıklama bulunmuyor' }}
        </div>
        
        <div class="card-details">
          <div class="detail-item">
            <svg class="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            <span class="detail-text">{{ formatTimeRemaining(lead.endsAt) }}</span>
          </div>
          <div class="detail-item">
            <svg class="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="detail-text">{{ lead.bids ? lead.bids.length : 0 }} teklif</span>
          </div>
          <div class="detail-item">
            <svg class="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span class="detail-text">+₺{{ lead.minIncrement }}</span>
          </div>
          <button class="share-btn-small" @click="shareLead(lead)" title="Paylaş">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
        
        <div class="card-footer">
          <div class="footer-buttons">
            <button 
              v-if="lead.instantBuyPrice && !lead.isExpired && lead.isActive"
              class="instant-buy-btn-small"
              @click="openInstantBuyModal(lead)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                <path d="M12 3v6"/>
                <path d="M12 15v6"/>
              </svg>
              Anında Al
            </button>

            <router-link 
              class="bid-btn" 
              :class="{ 'bid-btn-disabled': lead.isExpired }"
              :to="lead.isExpired ? '#' : `/lead/${lead.id}`"
              @click="lead.isExpired && $event.preventDefault()"
            >
              {{ lead.isExpired ? 'Süresi Doldu' : 'Teklif Ver' }}
            </router-link>
            
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          Almanya'nın önde gelen<br>
          lead pazar yeri
        </h1>
        <p class="hero-description">
          Sigorta brokerleri için profesyonel açık artırma platformu. Sağlık, evcil hayvan ve
          araç sigortaları için yüksek kaliteli potansiyel müşterileri alıp satın.
        </p>
        <div class="hero-buttons">
          <button class="btn btn-primary">Şimdi kaydolun</button>
          <button class="btn btn-secondary">Canlı müzayedeleri izleyin</button>
        </div>
      </div>
    </section>

    <!-- Instant Buy Modal -->
    <div v-if="showInstantBuyModal" class="modal-backdrop" @click="closeInstantBuyModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Anında Satın Al</h3>
          <button class="modal-close" @click="closeInstantBuyModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="instant-buy-info">
            <div class="lead-title">{{ selectedLead?.title }}</div>
            <div class="price-display">
              <div class="price-label">Anında Satın Alma Fiyatı</div>
              <div class="price-amount">₺{{ selectedLead?.instantBuyPrice?.toLocaleString() }}</div>
            </div>
            <div class="confirmation-text">
              Bu lead'i anında satın almak istediğinizden emin misiniz?
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeInstantBuyModal" :disabled="isProcessing">
            İptal
          </button>
          <button class="btn btn-primary" @click="confirmInstantBuy" :disabled="isProcessing">
            <span v-if="isProcessing">İşleniyor...</span>
            <span v-else>Satın Al</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Anında Satın Alma Stilleri */
.instant-buy-price {
  margin-top: 6px;
  padding: 4px 8px;
  background: #10b981;
  border-radius: 6px;
  text-align: center;
}

.instant-amount {
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  margin-bottom: 1px;
}

.instant-label {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.footer-buttons {
  display: flex;
  gap: 8px;
  flex-direction: column;
}

.instant-buy-btn-small {
  padding: 8px 12px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-decoration: none;
}

.instant-buy-btn-small:hover {
  background: #059669;
  transform: none;
}

.instant-buy-btn-small:active {
  transform: translateY(0);
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
  color: #6b7280;
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
  color: #6b7280;
  margin-bottom: 4px;
}

.price-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #10b981;
}

.confirmation-text {
  color: #6b7280;
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

@media (max-width: 768px) {
  section {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    overflow-x: hidden !important;
  }
  
  .page-content {
    padding: 24px 12px !important;
    margin: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  
  .auctions-grid {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
  }
  
  .auction-card {
    margin: 0 !important;
    padding: 16px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  
  .footer-buttons {
    gap: 6px;
  }
  
  .instant-buy-btn-small {
    padding: 6px 10px;
    font-size: 0.75rem;
  }
  
  .instant-buy-price {
    padding: 3px 6px;
  }
  
  .instant-amount {
    font-size: 0.8rem;
  }
  
  .instant-label {
    font-size: 0.6rem;
  }
}
</style>
