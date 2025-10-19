<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Icon } from '@iconify/vue'
import api from '@/utils/axios.js'
import { io } from 'socket.io-client'
import { formatPrice, getCurrencySymbol } from '@/utils/currency.js'

const leads = ref([])
const allLeads = ref([]) // Tüm lead'ler
const socket = io('/', { path: '/socket.io' })
const showInstantBuyModal = ref(false)
const selectedLead = ref(null)
const isProcessing = ref(false)
const settings = ref({ defaultCurrency: 'TRY', insuranceTypes: [] })
const quickBidAmounts = ref({})
const isSubmittingBid = ref({})

// Filtre state'leri
const filters = ref({
  insuranceType: '',
  minPrice: null,
  maxPrice: null
})
const showFilters = ref(false)

// Zaman hesaplama fonksiyonu
function formatTimeRemaining(endsAt) {
  const now = new Date()
  const endTime = new Date(endsAt)
  const diff = endTime - now
  
  if (diff <= 0) return 'Süresi doldu'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) {
    if (hours > 0) {
      return `${days} gün ${hours} saat`
    } else {
      return `${days} gün`
    }
  } else if (hours > 0) {
    if (minutes > 0) {
      return `${hours} saat ${minutes} dakika`
    } else {
      return `${hours} saat`
    }
  } else {
    return `${minutes} dakika`
  }
}

// Ayarları yükle
async function loadSettings() {
  try {
    const response = await api.get('/settings')
    settings.value = response.data
    if (!settings.value.insuranceTypes) {
      settings.value.insuranceTypes = [
        { name: 'Hayvan', icon: 'mdi:paw' },
        { name: 'Araba', icon: 'mdi:car' },
        { name: 'Sağlık', icon: 'mdi:heart' }
      ]
    } else if (Array.isArray(settings.value.insuranceTypes) && settings.value.insuranceTypes.length > 0) {
      // Eski format compatibility kontrolü
      const firstItem = settings.value.insuranceTypes[0]
      if (typeof firstItem === 'string') {
        // String array formatında, yeni formata çevir
        const defaultIcons = {
          'Hayvan': 'mdi:paw',
          'Araba': 'mdi:car',
          'Sağlık': 'mdi:heart'
        }
        settings.value.insuranceTypes = settings.value.insuranceTypes.map(name => ({
          name: name,
          icon: defaultIcons[name] || 'mdi:file'
        }))
      }
    }
  } catch (error) {
    console.error('Ayarlar yüklenemedi:', error)
    settings.value.insuranceTypes = [
      { name: 'Hayvan', icon: 'mdi:paw' },
      { name: 'Araba', icon: 'mdi:car' },
      { name: 'Sağlık', icon: 'mdi:heart' }
    ]
  }
}

// Lead tipi için icon getir (Iconify id)
function getInsuranceTypeIcon(typeName) {
  if (!typeName) return 'mdi:file'
  const typeObj = settings.value.insuranceTypes.find(t => (typeof t === 'object' ? t.name : t) === typeName)
  const icon = typeof typeObj === 'object' ? typeObj?.icon : null
  if (icon && icon.includes(':')) return icon
  if (icon && !icon.includes(':')) return `mdi:${icon}`
  return 'mdi:file'
}

// Filtreleri localStorage'a kaydet
function saveFilters() {
  localStorage.setItem('leadFilters', JSON.stringify(filters.value))
}

// Filtreleri localStorage'dan yükle
function loadFilters() {
  const saved = localStorage.getItem('leadFilters')
  if (saved) {
    try {
      filters.value = JSON.parse(saved)
    } catch (e) {
      console.error('Filtre yükleme hatası:', e)
    }
  }
}

// Filtreleri uygula
function applyFilters() {
  let filtered = [...allLeads.value]
  
  // Insurance type filtresi
  if (filters.value.insuranceType) {
    filtered = filtered.filter(lead => lead.insuranceType === filters.value.insuranceType)
  }
  
  // Fiyat aralığı filtresi
  if (filters.value.minPrice !== null && filters.value.minPrice !== '') {
    filtered = filtered.filter(lead => {
      const currentPrice = lead.bids && lead.bids.length ? lead.bids[0].amount : lead.startPrice
      return currentPrice >= Number(filters.value.minPrice)
    })
  }
  
  if (filters.value.maxPrice !== null && filters.value.maxPrice !== '') {
    filtered = filtered.filter(lead => {
      const currentPrice = lead.bids && lead.bids.length ? lead.bids[0].amount : lead.startPrice
      return currentPrice <= Number(filters.value.maxPrice)
    })
  }
  
  leads.value = filtered
  saveFilters()
}

// Insurance type listesi (name'leri döndür)
const insuranceTypeNames = computed(() => {
  return settings.value.insuranceTypes.map(t => typeof t === 'string' ? t : t.name)
})

// Filtreleri temizle
function clearFilters() {
  filters.value = {
    insuranceType: '',
    minPrice: null,
    maxPrice: null
  }
  leads.value = [...allLeads.value]
  saveFilters()
}

async function fetchLeads() {
  const { data } = await api.get('/leads')
  // Lead'lerin aktif durumunu endsAt tarihine göre güncelle
  allLeads.value = data.map(lead => {
    const now = new Date()
    const endDate = new Date(lead.endsAt)
    const isExpired = endDate < now
    
    return {
      ...lead,
      isActive: lead.isActive && !isExpired,
      isExpired: isExpired // Geçmiş lead'leri işaretle
    }
  })
  // Filtreleri uygula
  applyFilters()
  // Tüm listelenen lead odalarına katıl, canlı güncellemeleri al
  for (const l of allLeads.value) {
    socket.emit('join-lead', l.id)
  }
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function navigateToLead(lead) {
  if (!lead.isExpired) {
    window.location.href = `/lead/${lead.id}`
  }
}

function shareLead(lead, event) {
  event.stopPropagation() // Kart tıklamasını engelle
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

function openInstantBuyModal(lead, event) {
  event.stopPropagation() // Kart tıklamasını engelle
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
    const response = await api.post(`/leads/${selectedLead.value.id}/instant-buy`, {}, { headers: authHeaders() })
    
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

async function submitQuickBid(lead, event) {
  event.stopPropagation()
  
  if (!quickBidAmounts.value[lead.id] || quickBidAmounts.value[lead.id] <= 0) {
    alert('Lütfen geçerli bir teklif miktarı girin')
    return
  }
  
  isSubmittingBid.value[lead.id] = true
  
  try {
    const response = await api.post(`/bids`, {
      leadId: lead.id,
      amount: Math.round(Number(quickBidAmounts.value[lead.id]))
    }, { headers: authHeaders() })
    
    if (response.data.success) {
      // Teklif miktarını sıfırla
      quickBidAmounts.value[lead.id] = ''
      // Lead'leri yeniden yükle
      await fetchLeads()
    }
  } catch (error) {
    const errorData = error.response?.data
    alert(errorData?.error || 'Teklif verme işlemi başarısız')
  } finally {
    isSubmittingBid.value[lead.id] = false
  }
}

function setQuickBidAmount(lead, amount) {
  quickBidAmounts.value[lead.id] = amount
}

onMounted(async () => {
  loadFilters() // Filtreleri yükle
  await loadSettings()
  await fetchLeads()
  // Her yeni teklifte ilgili kartı anında güncelle
  socket.on('bid:new', ({ leadId, bid }) => {
    const idx = allLeads.value.findIndex(l => l.id === leadId)
    if (idx !== -1) {
      const current = allLeads.value[idx]
      const existing = current.bids || []
      allLeads.value[idx] = { ...current, bids: [bid, ...existing] }
      applyFilters() // Filtreleri tekrar uygula
    }
  })
  
  // Her dakika zamanı güncelle
  const timeInterval = setInterval(() => {
    // Vue reactivity için leads array'ini güncelle
    leads.value = [...leads.value]
    allLeads.value = [...allLeads.value]
  }, 60000)
  
  onUnmounted(() => {
    clearInterval(timeInterval)
    socket.close()
  })
})
</script>

<template>
  <section>
    <!-- Hero Section - Lead yoksa üstte -->
    <section v-if="!leads.length" class="hero-section">
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

    <div class="page-content">
      <div class="page-header">
        <h1>Aktif Açık Artırmalar</h1>
        <button class="filter-toggle-btn" @click="showFilters = !showFilters">
          <i class="fas fa-filter"></i>
          Filtrele
          <span v-if="filters.insuranceType || filters.minPrice || filters.maxPrice" class="filter-badge">●</span>
        </button>
      </div>
      
      <!-- Filtre Paneli -->
      <div v-if="showFilters" class="filters-panel">
        <div class="filters-grid">
          <div class="filter-group">
            <label class="filter-label">Lead Tipi</label>
            <select v-model="filters.insuranceType" @change="applyFilters" class="filter-select">
              <option value="">Tümü</option>
              <option v-for="typeName in insuranceTypeNames" :key="typeName" :value="typeName">
                {{ typeName }}
              </option>
            </select>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Min Fiyat ({{ getCurrencySymbol(settings.defaultCurrency) }})</label>
            <input 
              type="number" 
              v-model.number="filters.minPrice" 
              @input="applyFilters"
              placeholder="Minimum"
              class="filter-input"
            />
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Max Fiyat ({{ getCurrencySymbol(settings.defaultCurrency) }})</label>
            <input 
              type="number" 
              v-model.number="filters.maxPrice" 
              @input="applyFilters"
              placeholder="Maximum"
              class="filter-input"
            />
          </div>
          
          <div class="filter-group">
            <button class="clear-filters-btn" @click="clearFilters">
              <i class="fas fa-times"></i>
              Filtreleri Temizle
            </button>
          </div>
        </div>
        
        <div class="filter-info">
          {{ leads.length }} lead gösteriliyor {{ allLeads.length !== leads.length ? `(${allLeads.length} toplam)` : '' }}
        </div>
      </div>
      
      <div v-if="!leads.length" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>Şu anda görüntülenecek lead yok</h3>
        <p>Yeni açık artırmalar eklendiğinde burada görünecek</p>
      </div>
      
      <div v-else class="auctions-grid">
      <div class="auction-card" v-for="lead in leads" :key="lead.id" @click="navigateToLead(lead)">
        <div class="card-header">
          <div class="card-title">
            <div class="title-with-icon">
              <Icon v-if="lead.insuranceType" :icon="getInsuranceTypeIcon(lead.insuranceType)" class="insurance-iconify" width="18" height="18" />
              <h3>{{ lead.title }}</h3>
            </div>
            <span class="status-badge" :class="lead.isExpired ? 'expired' : 'active'">
              {{ lead.isExpired ? 'Geçmiş' : 'Aktif' }}
            </span>
          </div>
          <div class="current-bid">
            <div class="price-container">
              <div class="bid-info-container">
                <div class="bid-amount">
                  <span v-if="lead.bids && lead.bids.length">{{ formatPrice(lead.bids[0].amount, settings.defaultCurrency) }}</span>
                  <span v-else>{{ formatPrice(lead.startPrice, settings.defaultCurrency) }}</span>
                </div>
                <div class="bid-label">Güncel Teklif</div>
              </div>
              <div v-if="lead.instantBuyPrice" class="instant-buy-price">
                <div class="instant-amount">{{ formatPrice(lead.instantBuyPrice, settings.defaultCurrency) }}</div>
                <div class="instant-label">Anında Satın Al</div>
              </div>
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
            <span class="detail-text">+{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement }}</span>
          </div>
          <button class="share-btn-small" @click="shareLead(lead, $event)" title="Paylaş">
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
          <!-- Hızlı Teklif Alanı -->
          <div v-if="!lead.isExpired && lead.isActive" class="quick-bid-section" @click.stop>
            <div class="quick-bid-input-group">
              <div class="currency-symbol">{{ getCurrencySymbol(settings.defaultCurrency) }}</div>
              <input 
                type="number" 
                class="quick-bid-input"
                :placeholder="lead.bids && lead.bids.length ? (lead.bids[0].amount + lead.minIncrement).toString() : (lead.startPrice + lead.minIncrement).toString()"
                v-model="quickBidAmounts[lead.id]"
                @click="$event.stopPropagation()"
                :min="lead.bids && lead.bids.length ? lead.bids[0].amount + lead.minIncrement : lead.startPrice + lead.minIncrement"
                step="0.01"
              />
              <button 
                class="quick-bid-submit-btn"
                @click="submitQuickBid(lead, $event)"
                :disabled="isSubmittingBid[lead.id]"
              >
                <span v-if="isSubmittingBid[lead.id]">Gönderiliyor...</span>
                <span v-else>Teklif Ver</span>
              </button>
            </div>
            <div class="quick-bid-suggestions">
              <button 
                class="quick-bid-suggestion"
                @click.stop="setQuickBidAmount(lead, lead.bids && lead.bids.length ? lead.bids[0].amount + lead.minIncrement : lead.startPrice + lead.minIncrement)"
              >
                +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement }}
              </button>
              <button 
                class="quick-bid-suggestion"
                @click.stop="setQuickBidAmount(lead, lead.bids && lead.bids.length ? lead.bids[0].amount + (lead.minIncrement * 2) : lead.startPrice + (lead.minIncrement * 2))"
              >
                +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 2 }}
              </button>
              <button 
                class="quick-bid-suggestion"
                @click.stop="setQuickBidAmount(lead, lead.bids && lead.bids.length ? lead.bids[0].amount + (lead.minIncrement * 3) : lead.startPrice + (lead.minIncrement * 3))"
              >
                +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 3 }}
              </button>
              <button 
                class="quick-bid-suggestion"
                @click.stop="setQuickBidAmount(lead, lead.bids && lead.bids.length ? lead.bids[0].amount + (lead.minIncrement * 5) : lead.startPrice + (lead.minIncrement * 5))"
              >
                +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 5 }}
              </button>

            </div>
          </div>
          
          <div class="footer-buttons">
            <router-link 
              class="bid-btn" 
              :class="{ 'bid-btn-disabled': lead.isExpired }"
              :to="lead.isExpired ? '#' : `/lead/${lead.id}`"
              @click="lead.isExpired ? $event.preventDefault() : $event.stopPropagation()"
            >
              {{ lead.isExpired ? 'Süresi Doldu' : 'Detaylı Görünüm' }}
            </router-link>
            
            <button 
              v-if="lead.instantBuyPrice && !lead.isExpired && lead.isActive"
              class="instant-buy-btn-small"
              @click="openInstantBuyModal(lead, $event)"
            >
              <i class="fas fa-dollar"></i>
              Anında Al
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Hero Section - Lead varsa altta -->
    <section v-if="leads.length" class="hero-section">
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
              <div class="price-amount">{{ formatPrice(selectedLead?.instantBuyPrice, settings.defaultCurrency) }}</div>
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
/* Sayfa Header - Filtre Buton */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.filter-toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.filter-toggle-btn:hover {
  background: #f9fafb;
  border-color: var(--primary);
}

.filter-badge {
  color: #ef4444;
  font-size: 1.2rem;
  line-height: 1;
  margin-left: -4px;
}

/* Filtre Paneli */
.filters-panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.filter-select,
.filter-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #1f2937;
  background: white;
  transition: all 0.2s ease;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.clear-filters-btn {
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  margin-top: auto;
}

.clear-filters-btn:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.filter-info {
  font-size: 0.875rem;
  color: var(--primary);
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
}

/* Lead Tipi Icon */
.title-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title-with-icon h3{
  margin: 0;
}

.insurance-icon {
  font-size: 1.1rem;
  color: var(--primary);
  opacity: 0.8;
}

/* Fiyat Container - Yan Yana Düzen */
.price-container {
  display: flex;
  gap: 6px;
  align-items: stretch;
}

/* Güncel Teklif Container */
.bid-info-container {
  flex: 1;
  padding: 3px 6px;
  background: #f3f4f6;
  border-radius: 4px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 40px;
}

.bid-amount {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0px;
  line-height: 1;
}

.bid-label {
  font-size: 0.6rem;
  color: var(--primary);
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

/* Anında Satın Alma Stilleri */
.instant-buy-price {
  flex: 1;
  padding: 3px 6px;
  background: #10b981;
  border-radius: 4px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 50px;
}

.instant-amount {
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  margin-bottom: 0px;
  line-height: 1;
}

.instant-label {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.footer-buttons {
  display: flex;
  gap: 8px;
  flex-direction: row;
}

.instant-buy-btn-small {
  padding: 8px 16px;
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
  min-width: 10rem;
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

/* Kart tıklanabilir stil */
.auction-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.auction-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.auction-card .bid-btn,
.auction-card .instant-buy-btn-small,
.auction-card .share-btn-small {
  cursor: pointer;
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
  
  .page-header {
    margin-bottom: 16px;
  }
  
  .filter-toggle-btn {
    padding: 8px 16px;
    font-size: 0.8rem;
  }
  
  .filters-panel {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
    gap: 12px;
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
  
  .insurance-icon {
    font-size: 1rem;
  }
  
  .footer-buttons {
    gap: 6px;
  }
  
  .instant-buy-btn-small {
    padding: 6px 12px;
    font-size: 0.75rem;
    min-width: 90px;
  }
  
  .price-container {
    gap: 4px;
  }
  
  .bid-info-container {
    padding: 2px 4px;
    min-height: 35px;
  }
  
  .instant-buy-price {
    padding: 2px 4px;
    min-height: 35px;
  }
  
  .bid-amount {
    font-size: 0.75rem;
  }
  
  .bid-label {
    font-size: 0.55rem;
  }
  
  .instant-amount {
    font-size: 0.75rem;
  }
  
  .instant-label {
    font-size: 0.55rem;
  }
}

/* Hızlı Teklif Stilleri */
.quick-bid-section {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.quick-bid-input-group {
  display: grid;
  grid-template-columns: 28px 1fr 160px;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.currency-symbol {
  font-weight: 700;
  color: var(--primary);
  font-size: 0.9rem;
  min-width: 28px;
  display: grid;
  place-items: center;
}

.quick-bid-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  background: white;
  transition: border-color 0.2s ease;
}

.quick-bid-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.quick-bid-submit-btn {
  padding: 8px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  white-space: nowrap;
}

.quick-bid-submit-btn:hover:not(:disabled) {
  background: var(--primary-600);
}

.quick-bid-submit-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.quick-bid-suggestions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.quick-bid-suggestion {
  padding: 10px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  min-width: 0;
  text-align: center;
}

.quick-bid-suggestion:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

@media (max-width: 768px) {
  .quick-bid-section {
    padding: 8px;
  }
  
  .quick-bid-input-group {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .quick-bid-input {
    width: 100%;
  }
  
  .quick-bid-submit-btn {
    width: 100%;
  }
  
  .quick-bid-suggestions {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
