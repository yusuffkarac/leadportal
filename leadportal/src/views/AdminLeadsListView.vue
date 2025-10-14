<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import axios from 'axios'
import { getCurrencySymbol, formatPrice } from '@/utils/currency.js'

const leads = ref([])
const showNewLeadModal = ref(false)
const showEditLeadModal = ref(false)
const editingLead = ref(null)
const expandedBids = ref(new Set())
const settings = ref({ defaultCurrency: 'TRY' })

// New Lead Form
const newLead = ref({
  title: '',
  description: '',
  privateDetails: '',
  startPrice: '',
  minIncrement: '',
  buyNowPrice: '',
  insuranceType: '',
  endsAt: ''
})

// Edit Lead Form
const editLead = ref({
  title: '',
  description: '',
  privateDetails: '',
  startPrice: '',
  minIncrement: '',
  buyNowPrice: '',
  insuranceType: '',
  endsAt: '',
  isActive: true
})

const errorMessage = ref('')
const successMessage = ref('')
const insuranceTypes = ref([])

// Filtreleme
const filters = ref({
  status: 'all', // all, active, inactive, sold
  priceRange: {
    min: '',
    max: ''
  },
  dateRange: {
    start: '',
    end: ''
  },
  search: ''
})

// Mobil cihazlarda filtreler kapalı başlasın
const isMobile = ref(window.innerWidth <= 768)
const showFilters = ref(!isMobile.value)

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadSettings() {
  try {
    const response = await axios.get('/api/settings', { headers: authHeaders() })
    settings.value = response.data
    insuranceTypes.value = response.data.insuranceTypes || ['Hayvan', 'Araba', 'Sağlık']
  } catch (error) {
    console.error('Ayarlar yüklenemedi:', error)
    insuranceTypes.value = ['Hayvan', 'Araba', 'Sağlık'] // Fallback
  }
}

async function fetchMine() {
  const { data } = await axios.get('/api/leads/admin/list', { headers: authHeaders() })
  
  // Satış bilgilerini al
  const salesResponse = await axios.get('/api/lead-sales/admin/all', { headers: authHeaders() })
  const sales = salesResponse.data
  
  // Lead'lerin aktif durumunu endsAt tarihine göre güncelle ve satış bilgilerini ekle
  leads.value = data.map(lead => {
    const now = new Date()
    const endDate = new Date(lead.endsAt)
    const isExpired = endDate < now
    
    // Bu lead için satış bilgisini bul
    const sale = sales.find(s => s.leadId === lead.id)
    
    return {
      ...lead,
      isActive: lead.isActive && !isExpired,
      sale: sale || null
    }
  })
}

async function openNewLeadModal() {
  showNewLeadModal.value = true
  
  // Ayarlardan varsayılan değerleri yükle
  try {
    const settingsResponse = await axios.get('/api/settings', { headers: authHeaders() })
    const settings = settingsResponse.data
    
    // Varsayılan bitiş tarihini hesapla (şu an + varsayılan gün sayısı)
    const now = new Date()
    const defaultEndDate = new Date(now.getTime() + (settings.defaultAuctionDays || 7) * 24 * 60 * 60 * 1000)
    const formattedEndDate = defaultEndDate.toISOString().slice(0, 16)
    
    newLead.value = {
      title: '',
      description: '',
      privateDetails: '',
      startPrice: '',
      minIncrement: settings.defaultMinIncrement || 10,
      buyNowPrice: '',
      endsAt: formattedEndDate
    }
  } catch (error) {
    // Hata durumunda varsayılan değerleri kullan
    const now = new Date()
    const defaultEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 gün sonra
    const formattedEndDate = defaultEndDate.toISOString().slice(0, 16)
    
    newLead.value = {
      title: '',
      description: '',
      privateDetails: '',
      startPrice: '',
      minIncrement: 10,
      buyNowPrice: '',
      endsAt: formattedEndDate
    }
  }
  
  errorMessage.value = ''
  successMessage.value = ''
}

function closeNewLeadModal() {
  showNewLeadModal.value = false
  errorMessage.value = ''
  successMessage.value = ''
}

function openEditLeadModal(lead) {
  showEditLeadModal.value = true
  editingLead.value = lead
  editLead.value = {
    title: lead.title,
    description: lead.description || '',
    privateDetails: lead.privateDetails || '',
    startPrice: lead.startPrice.toString(),
    minIncrement: lead.minIncrement.toString(),
    buyNowPrice: lead.instantBuyPrice ? lead.instantBuyPrice.toString() : '',
    endsAt: lead.endsAt ? new Date(lead.endsAt).toISOString().slice(0, 16) : '',
    isActive: lead.isActive
  }
  errorMessage.value = ''
  successMessage.value = ''
}

function closeEditLeadModal() {
  showEditLeadModal.value = false
  editingLead.value = null
  errorMessage.value = ''
  successMessage.value = ''
}

async function createLead() {
  try {
    errorMessage.value = ''
    
    // Validation
    if (!newLead.value.title.trim()) {
      errorMessage.value = 'Başlık gerekli'
      return
    }
    if (!newLead.value.startPrice || parseFloat(newLead.value.startPrice) <= 0) {
      errorMessage.value = 'Geçerli başlangıç fiyatı girin'
      return
    }
    if (!newLead.value.minIncrement || parseFloat(newLead.value.minIncrement) <= 0) {
      errorMessage.value = 'Geçerli minimum artış girin'
      return
    }
    if (!newLead.value.endsAt) {
      errorMessage.value = 'Bitiş tarihi gerekli'
      return
    }

    const leadData = {
      ...newLead.value,
      privateDetails: newLead.value.privateDetails || undefined,
      startPrice: parseFloat(newLead.value.startPrice),
      minIncrement: parseFloat(newLead.value.minIncrement),
      instantBuyPrice: newLead.value.buyNowPrice ? parseFloat(newLead.value.buyNowPrice) : null,
      insuranceType: newLead.value.insuranceType || undefined,
      endsAt: new Date(newLead.value.endsAt).toISOString()
    }

    await axios.post('/api/leads', leadData, { headers: authHeaders() })
    
    successMessage.value = 'Lead başarıyla oluşturuldu!'
    await fetchMine()
    
    setTimeout(() => {
      closeNewLeadModal()
    }, 1500)
    
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Lead oluşturulamadı'
  }
}

async function updateLead() {
  try {
    errorMessage.value = ''
    
    // Validation
    if (!editLead.value.title.trim()) {
      errorMessage.value = 'Başlık gerekli'
      return
    }
    if (!editLead.value.startPrice || parseFloat(editLead.value.startPrice) <= 0) {
      errorMessage.value = 'Geçerli başlangıç fiyatı girin'
      return
    }
    if (!editLead.value.minIncrement || parseFloat(editLead.value.minIncrement) <= 0) {
      errorMessage.value = 'Geçerli minimum artış girin'
      return
    }
    if (!editLead.value.endsAt) {
      errorMessage.value = 'Bitiş tarihi gerekli'
      return
    }

    const leadData = {
      ...editLead.value,
      privateDetails: editLead.value.privateDetails || undefined,
      startPrice: parseFloat(editLead.value.startPrice),
      minIncrement: parseFloat(editLead.value.minIncrement),
      instantBuyPrice: editLead.value.buyNowPrice ? parseFloat(editLead.value.buyNowPrice) : null,
      insuranceType: editLead.value.insuranceType || undefined,
      endsAt: new Date(editLead.value.endsAt).toISOString()
    }

    await axios.put(`/api/leads/${editingLead.value.id}`, leadData, { headers: authHeaders() })
    
    successMessage.value = 'Lead başarıyla güncellendi!'
    await fetchMine()
    
    setTimeout(() => {
      closeEditLeadModal()
    }, 1500)
    
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Lead güncellenemedi'
  }
}

function toggleBidsExpansion(leadId) {
  if (expandedBids.value.has(leadId)) {
    expandedBids.value.delete(leadId)
  } else {
    expandedBids.value.add(leadId)
  }
}

function viewLeadDetails(leadId) {
  window.open(`/lead/${leadId}`, '_blank')
}

// Filtreleme fonksiyonları
function toggleFilters() {
  showFilters.value = !showFilters.value
}

function clearFilters() {
  filters.value = {
    status: 'all',
    priceRange: { min: '', max: '' },
    dateRange: { start: '', end: '' },
    search: ''
  }
}

function applyFilters() {
  // Filtreler otomatik olarak computed property ile uygulanacak
}

// Filtrelenmiş lead'leri hesapla
const filteredLeads = computed(() => {
  let result = leads.value

  // Durum filtresi
  if (filters.value.status !== 'all') {
    result = result.filter(lead => {
      if (filters.value.status === 'sold') return lead.sale
      if (filters.value.status === 'active') return lead.isActive && !lead.sale
      if (filters.value.status === 'inactive') return !lead.isActive && !lead.sale
      return true
    })
  }

  // Arama filtresi
  if (filters.value.search) {
    const searchTerm = filters.value.search.toLowerCase()
    result = result.filter(lead => 
      lead.title.toLowerCase().includes(searchTerm) ||
      lead.description?.toLowerCase().includes(searchTerm) ||
      lead.owner?.email?.toLowerCase().includes(searchTerm)
    )
  }

  // Fiyat aralığı filtresi
  if (filters.value.priceRange.min || filters.value.priceRange.max) {
    result = result.filter(lead => {
      const currentPrice = lead.bids?.[0]?.amount || lead.startPrice
      const minPrice = parseFloat(filters.value.priceRange.min) || 0
      const maxPrice = parseFloat(filters.value.priceRange.max) || Infinity
      return currentPrice >= minPrice && currentPrice <= maxPrice
    })
  }

  // Tarih aralığı filtresi
  if (filters.value.dateRange.start || filters.value.dateRange.end) {
    result = result.filter(lead => {
      const leadDate = new Date(lead.createdAt)
      const startDate = filters.value.dateRange.start ? new Date(filters.value.dateRange.start) : new Date(0)
      const endDate = filters.value.dateRange.end ? new Date(filters.value.dateRange.end) : new Date()
      return leadDate >= startDate && leadDate <= endDate
    })
  }

  return result
})

let resizeHandler = null

onMounted(async () => {
  await loadSettings()
  await fetchMine()
  
  // Ekran boyutu değişikliklerini dinle
  resizeHandler = () => {
    const wasMobile = isMobile.value
    isMobile.value = window.innerWidth <= 768
    
    // Mobil'den desktop'a geçişte filtreleri aç
    if (wasMobile && !isMobile.value) {
      showFilters.value = true
    }
    // Desktop'tan mobile'a geçişte filtreleri kapat
    else if (!wasMobile && isMobile.value) {
      showFilters.value = false
    }
  }
  
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
})
</script>

<template>
  <section>
    <div class="page-content">
      <div class="page-header">
        <div class="header-content">
          <h1>Tüm Leadler</h1>
          <p class="page-subtitle">Lead yönetimi ve düzenleme</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" @click="toggleFilters">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3"/>
            </svg>
            Filtreler
          </button>
          <button class="btn btn-primary btn-large" @click="openNewLeadModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Yeni Lead
          </button>
        </div>
      </div>
    
    <!-- Filtreler -->
    <transition name="filters-slide">
      <div v-if="showFilters" class="filters-panel">
        <div class="filters-content">
          <div class="filter-group">
          <label>Arama</label>
          <input 
            v-model="filters.search" 
            type="text" 
            placeholder="Başlık, açıklama veya sahip ara..."
            class="filter-input"
          />
        </div>
        
        <div class="filter-group">
          <label>Durum</label>
          <select v-model="filters.status" class="filter-select">
            <option value="all">Tümü</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
            <option value="sold">Satılmış</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Fiyat Aralığı ({{ getCurrencySymbol(settings.defaultCurrency) }})</label>
          <div class="price-range">
            <input 
              v-model="filters.priceRange.min" 
              type="number" 
              placeholder="Min"
              class="filter-input"
            />
            <span>-</span>
            <input 
              v-model="filters.priceRange.max" 
              type="number" 
              placeholder="Max"
              class="filter-input"
            />
          </div>
        </div>
        
        <div class="filter-group">
          <label>Tarih Aralığı</label>
          <div class="date-range">
            <input 
              v-model="filters.dateRange.start" 
              type="date" 
              class="filter-input"
            />
            <span>-</span>
            <input 
              v-model="filters.dateRange.end" 
              type="date" 
              class="filter-input"
            />
          </div>
        </div>
        
        <div class="filter-actions">
          <button class="btn btn-outline" @click="clearFilters">Temizle</button>
          <button class="btn btn-primary" @click="applyFilters">Uygula</button>
        </div>
        </div>
      </div>
    </transition>

    <!-- Sonuç sayısı -->
    <div v-if="leads.length" class="results-info">
      <span>{{ filteredLeads.length }} / {{ leads.length }} lead gösteriliyor</span>
    </div>

    <div v-if="!leads.length" class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>Henüz lead yok</h3>
      <p>İlk lead'inizi oluşturmak için "Yeni Lead" butonuna tıklayın</p>
    </div>
    
    <div v-else-if="!filteredLeads.length" class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>Filtreye uygun lead bulunamadı</h3>
      <p>Filtreleri değiştirerek tekrar deneyin</p>
    </div>
    
    <div v-else class="leads-grid-compact">
      <div class="lead-card-compact" v-for="lead in filteredLeads" :key="lead.id" :class="{ 'sold-lead': lead.sale }">
        <div class="lead-header">
          <div class="lead-title">
            <h3>{{ lead.title }}</h3>
            <span class="status-badge" :class="lead.sale ? 'sold' : (lead.isActive ? 'active' : 'inactive')">
              {{ lead.sale ? 'Satıldı' : (lead.isActive ? 'Aktif' : 'Pasif') }}
            </span>
          </div>
          <div class="lead-actions">
            <button class="btn btn-primary" @click="viewLeadDetails(lead.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Detay
            </button>
            <button v-if="!lead.sale" class="btn btn-secondary" @click="openEditLeadModal(lead)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Düzenle
            </button>
          </div>
        </div>
        
        <div class="lead-meta-compact">
          <div class="meta-row">
            <div class="meta-item">
              <span class="meta-label">Başlangıç:</span>
              <span class="meta-value">{{ formatPrice(lead.startPrice, settings.defaultCurrency) }}</span>
            </div>
            <div v-if="lead.insuranceType" class="meta-item">
              <span class="meta-label">Sigorta:</span>
              <span class="meta-value">{{ lead.insuranceType }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Teklif:</span>
              <span class="meta-value">{{ lead.bids?.length || 0 }}</span>
            </div>
          </div>
          <div class="meta-row">
            <div class="meta-item full-width">
              <span class="meta-label">Sahip:</span>
              <span class="meta-value">{{ lead.owner?.email || 'Sahip yok' }}</span>
            </div>
          </div>
        </div>
        
        <!-- Teklifler (hem satılmış hem satılmamış lead'ler için) -->
        <div v-if="lead.bids?.length > 0" class="bids-preview">
          <div class="bids-header">
            <span class="bids-title">Teklifler:</span>
          </div>
          <div class="bids-list">
            <div v-for="(bid, index) in (expandedBids.has(lead.id) ? lead.bids : lead.bids.slice(0, 3))" :key="bid.id" class="bid-item">
              <span class="bid-rank">{{ index + 1 }}.</span>
              <span class="bid-amount">{{ formatPrice(bid.amount, settings.defaultCurrency) }}</span>
              <span class="bid-user">{{ bid.user?.email || 'Anonim' }}</span>
            </div>
            <div v-if="lead.bids.length > 3" class="bid-more" @click="toggleBidsExpansion(lead.id)">
              <span v-if="!expandedBids.has(lead.id)">
                +{{ lead.bids.length - 3 }} teklif daha
              </span>
              <span v-else>
                Daha az göster
              </span>
            </div>
          </div>
        </div>
        
        <!-- Satılmış lead için minimal satış bilgileri -->
        <div v-if="lead.sale" class="sale-info-minimal">
          <div class="sale-summary">
            <span class="sale-price">{{ formatPrice(lead.sale.amount, settings.defaultCurrency) }}</span>
            <span class="sale-buyer">{{ lead.sale.buyer?.email || 'Bilinmiyor' }}</span>
            <span class="sale-date">{{ new Date(lead.sale.soldAt).toLocaleDateString('tr-TR') }}</span>
          </div>
        </div>
        
        <!-- Satılmamış lead için normal stats -->
        <div v-else class="lead-stats">
          <div class="stat-item">
            <div class="stat-value">{{ formatPrice(lead.bids?.[0]?.amount || lead.startPrice, settings.defaultCurrency) }}</div>
            <div class="stat-label">Güncel Teklif</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">+{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement }}</div>
            <div class="stat-label">Min Artış</div>
          </div>
          <div v-if="lead.instantBuyPrice" class="stat-item buy-now">
            <div class="stat-value">{{ formatPrice(lead.instantBuyPrice, settings.defaultCurrency) }}</div>
            <div class="stat-label">Anında Satın Al</div>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- New Lead Modal -->
    <div v-if="showNewLeadModal" class="modal-backdrop" @click="closeNewLeadModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Yeni Lead Oluştur</h3>
          <button class="modal-close" @click="closeNewLeadModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>Başlık *</label>
            <input 
              v-model="newLead.title" 
              type="text" 
              class="form-input" 
              placeholder="Lead başlığı"
              required
            />
          </div>
          
          <div class="form-group">
            <label>Açıklama</label>
            <textarea 
              v-model="newLead.description" 
              class="form-textarea" 
              placeholder="Lead açıklaması"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Lead Detayları (Sadece Satın Alan Görür)</label>
            <textarea 
              v-model="newLead.privateDetails" 
              class="form-textarea" 
              placeholder="Satın alan kişinin göreceği detay bilgileri girin"
              rows="6"
            ></textarea>
            <small class="form-help">Bu alan sadece leadi satın alan kişi, lead sahibi ve adminler tarafından görülebilir.</small>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Başlangıç Fiyatı ({{ getCurrencySymbol(settings.defaultCurrency) }}) *</label>
              <input 
                v-model="newLead.startPrice" 
                type="number" 
                class="form-input" 
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div class="form-group">
              <label>Minimum Artış ({{ getCurrencySymbol(settings.defaultCurrency) }}) *</label>
              <input 
                v-model="newLead.minIncrement" 
                type="number" 
                class="form-input" 
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>Anında Satın Alma Fiyatı ({{ getCurrencySymbol(settings.defaultCurrency) }})</label>
            <input 
              v-model="newLead.buyNowPrice" 
              type="number" 
              class="form-input" 
              placeholder="Opsiyonel - boş bırakabilirsiniz"
              min="0"
              step="0.01"
            />
            <small class="form-help">Bu fiyat belirlenirse, kullanıcılar bu fiyattan anında satın alabilir</small>
          </div>
          
          <div class="form-group">
            <label>Sigorta Türü</label>
            <select v-model="newLead.insuranceType" class="form-input">
              <option value="">Sigorta türü seçin</option>
              <option v-for="type in insuranceTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Bitiş Tarihi *</label>
            <input 
              v-model="newLead.endsAt" 
              type="datetime-local" 
              class="form-input"
              required
            />
          </div>
          
          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
          <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeNewLeadModal">İptal</button>
          <button class="btn btn-primary" @click="createLead">Oluştur</button>
        </div>
      </div>
    </div>

    <!-- Edit Lead Modal -->
    <div v-if="showEditLeadModal" class="modal-backdrop" @click="closeEditLeadModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Lead Düzenle</h3>
          <button class="modal-close" @click="closeEditLeadModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>Başlık *</label>
            <input 
              v-model="editLead.title" 
              type="text" 
              class="form-input" 
              placeholder="Lead başlığı"
              required
            />
          </div>
          
          <div class="form-group">
            <label>Açıklama</label>
            <textarea 
              v-model="editLead.description" 
              class="form-textarea" 
              placeholder="Lead açıklaması"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Lead Detayları (Sadece Satın Alan Görür)</label>
            <textarea 
              v-model="editLead.privateDetails" 
              class="form-textarea" 
              placeholder="Satın alan kişinin göreceği detay bilgileri girin"
              rows="6"
            ></textarea>
            <small class="form-help">Bu alan sadece leadi satın alan kişi, lead sahibi ve adminler tarafından görülebilir.</small>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Başlangıç Fiyatı ({{ getCurrencySymbol(settings.defaultCurrency) }}) *</label>
              <input 
                v-model="editLead.startPrice" 
                type="number" 
                class="form-input" 
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div class="form-group">
              <label>Minimum Artış ({{ getCurrencySymbol(settings.defaultCurrency) }}) *</label>
              <input 
                v-model="editLead.minIncrement" 
                type="number" 
                class="form-input" 
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>Anında Satın Alma Fiyatı ({{ getCurrencySymbol(settings.defaultCurrency) }})</label>
            <input 
              v-model="editLead.buyNowPrice" 
              type="number" 
              class="form-input" 
              placeholder="Opsiyonel - boş bırakabilirsiniz"
              min="0"
              step="0.01"
            />
            <small class="form-help">Bu fiyat belirlenirse, kullanıcılar bu fiyattan anında satın alabilir</small>
          </div>
          
          <div class="form-group">
            <label>Sigorta Türü</label>
            <select v-model="editLead.insuranceType" class="form-input">
              <option value="">Sigorta türü seçin</option>
              <option v-for="type in insuranceTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Bitiş Tarihi *</label>
            <input 
              v-model="editLead.endsAt" 
              type="datetime-local" 
              class="form-input"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                v-model="editLead.isActive" 
                type="checkbox" 
                class="form-checkbox"
              />
              <span>Lead aktif</span>
            </label>
          </div>
          
          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
          <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeEditLeadModal">İptal</button>
          <button class="btn btn-primary" @click="updateLead">Güncelle</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Kompakt grid düzeni - 2'li düzen */
.leads-grid-compact {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: 20px;
}

.lead-card-compact {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.lead-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.lead-title h3 {
  font-size: 18px;
  margin: 0 0 8px 0;
  color: #1f2937;
  font-weight: 600;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.inactive {
  background: #f3f4f6;
  color: var(--primary);
}

.lead-actions {
  display: flex;
  gap: 6px;
  flex-direction: column;
  align-items: flex-end;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  width: 80px;
  justify-content: center;
}

.btn-large {
  padding: 12px 20px;
  font-size: 16px;
  font-weight: 600;
  width: auto;
  min-width: 140px;
}

.btn-primary {
  background: var(--text);
  color: white;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-outline {
  background: white;
  color: var(--primary);
  border: 1px solid #d1d5db;
}

.btn-outline:hover {
  background: #f9fafb;
  color: #374151;
}

.lead-meta-compact {
  margin-bottom: 8px;
}

.meta-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.meta-item {
  display: flex;
  align-items: center;
  flex: 1;
  font-size: 14px;
}

.meta-item.full-width {
  flex: 1;
}

.meta-label {
  color: var(--primary);
  font-weight: 500;
}

.meta-value {
  color: #374151;
  font-weight: 600;
}

.sold-lead {
  border-left: 4px solid #10b981;
  background: #f0fdf4;
}

.status-badge.sold {
  background: #10b981;
  color: white;
}

.sale-info-minimal {
  background: #f0fdf4;
  border: 1px solid #10b981;
  border-radius: 4px;
  padding: 4px 8px;
  margin-top: 4px;
}

.sale-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  gap: 6px;
}

.sale-price {
  color: #065f46;
  font-weight: 600;
  font-size: 13px;
}

.sale-buyer {
  color: #374151;
  font-weight: 500;
  flex: 1;
  text-align: center;
  font-size: 11px;
}

.sale-date {
  color: var(--primary);
  font-size: 11px;
}

.bids-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 4px 6px;
  margin-top: 4px;
}

.bids-header {
  margin-bottom: 3px;
}

.bids-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.bids-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bid-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.bid-rank {
  color: var(--primary);
  font-weight: 500;
  min-width: 15px;
}

.bid-amount {
  color: #059669;
  font-weight: 600;
  min-width: 80px;
  font-size: 12px;
}

.bid-user {
  color: #374151;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

.bid-more {
  color: var(--text);
  font-size: 11px;
  font-style: italic;
  text-align: center;
  margin-top: 2px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  background: rgba(59, 130, 246, 0.1);
}

.bid-more:hover {
  background: rgba(59, 130, 246, 0.2);
  color: #2563eb;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.header-content h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: #64748b;
  font-size: 1rem;
  margin: 0;
}

/* Header Actions */
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

/* Filtreler */
.filters-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.filters-content {
  display: flex;
  gap: 16px;
  align-items: end;
  flex-wrap: wrap;
  max-width: 100%;
  overflow: hidden;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 160px;
  max-width: 200px;
}

.filter-group label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.filter-input,
.filter-select {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: var(--text);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.price-range,
.date-range {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.price-range input,
.date-range input {
  flex: 1;
  min-width: 0;
  max-width: 80px;
}

.price-range span,
.date-range span {
  color: var(--primary);
  font-weight: 500;
}

.filter-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 16px;
  flex-basis: 100%;
  min-width: 0;
}

/* Sonuç bilgisi */
.results-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 16px 0;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 20px;
  color: #374151;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.empty-state p {
  color: var(--primary);
  font-size: 14px;
  margin: 0;
}

/* Filtre animasyonları */
.filters-slide-enter-active,
.filters-slide-leave-active {
  transition: all 0.3s ease;
  transform-origin: top;
}

.filters-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px) scaleY(0.8);
}

.filters-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scaleY(0.9);
}

/* Responsive */
@media (max-width: 768px) {
  .page-content {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .btn-large {
    padding: 12px 16px;
    font-size: 14px;
    min-width: auto;
    width: 100%;
  }
  
  .leads-grid-compact {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-top: 16px;
  }
  
  .lead-card-compact {
    padding: 16px;
  }
  
  .lead-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .lead-title h3 {
    font-size: 16px;
    margin-bottom: 8px;
  }
  
  .lead-actions {
    flex-direction: row;
    gap: 8px;
    align-items: center;
    justify-content: stretch;
  }
  
  .lead-actions .btn {
    flex: 1;
    width: auto;
    min-width: 0;
  }
  
  .meta-item {
    font-size: 12px;
    justify-content: flex-start!important;
  }
  
  .meta-row {
    flex-direction: column;
    gap: 4px;
  }
  
  .sale-summary {
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }
  
  .sale-buyer {
    text-align: center;
  }
  
  .bid-item {
    font-size: 11px;
  }
  
  .bids-preview {
    padding: 8px 12px;
  }
  
  .filters-panel {
    padding: 16px;
    margin: 16px 0;
  }
  
  .filters-content {
    flex-direction: column;
    gap: 16px;
    max-width: 100%;
    align-items: stretch;
  }
  
  .filter-group {
    min-width: 150px;
    max-width: 100%;
    width: 100%;
    flex: 1 0 100%;
  }

  .price-range span,
  .date-range span {
    display: none;
  }

  .filter-group + .filter-group {
    margin-top: 16px;
  }
  
  .filter-actions {
    flex-basis: auto;
    justify-content: center;
    margin-top: 12px;
    width: 100%;
  }
  
  .filter-actions .btn {
    min-width: 100px;
    flex: 1;
    width: 100%;
  }
  
  .price-range,
  .date-range {
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  
  .price-range input,
  .date-range input {
    max-width: none;
    width: 100%;
  }
  
  .price-range span,
  .date-range span {
    display: none;
  }

  .filter-input,
  .filter-select {
    width: 100%;
    box-sizing: border-box;
  }
  
  .results-info {
    padding: 10px 12px;
    font-size: 13px;
  }
  
  .empty-state {
    padding: 40px 16px;
  }
  
  .empty-icon {
    font-size: 36px;
  }
  
  .empty-state h3 {
    font-size: 18px;
  }
}
</style>

