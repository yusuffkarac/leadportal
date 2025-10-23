<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
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

// Görünüm tipi (grid veya table)
const viewMode = ref(localStorage.getItem('leadViewMode') || 'grid')

// Harita görünürlüğü
const showMap = ref(localStorage.getItem('showLeadMap') !== 'false') // Default true

// Görünüm tipini değiştir
function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'table' : 'grid'
  localStorage.setItem('leadViewMode', viewMode.value)
}

// Harita görünürlüğünü değiştir
function toggleMapVisibility() {
  const wasVisible = showMap.value
  showMap.value = !showMap.value
  localStorage.setItem('showLeadMap', showMap.value.toString())

  // Harita kapatılıyorsa temizle
  if (wasVisible && leafletMap) {
    leafletMap.remove()
    leafletMap = null
    markersLayer = null
  }

  // Harita açıldığında yeniden initialize et
  if (showMap.value) {
    // DOM'un güncellenmesini bekle
    setTimeout(() => {
      if (mapRoot.value) {
        initMap()
        updateMapMarkers()
      }
    }, 100)
  }
}

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

// Premium lead'ler (isShowcase değeri true olan ve aktif olan lead'ler)
const premiumLeads = computed(() => {
  return allLeads.value
    .filter(lead => lead.isShowcase === true && lead.isActive && !lead.isExpired)
    .slice(0, 6) // Maksimum 6 premium lead göster
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

// Harita ve Posta Kodu İşlemleri
const zipcodeIndex = ref(new Map())
const mapRoot = ref(null)
let leafletMap = null
let markersLayer = null

async function ensureZipcodesLoaded() {
  if (zipcodeIndex.value.size > 0) return
  try {
    const res = await fetch('/zipcodes.json')
    const arr = await res.json()
    const m = new Map()
    for (const z of arr) {
      if (z.postal) m.set(String(z.postal), { lat: Number(z.lat), lon: Number(z.lon), name: z.name })
    }
    zipcodeIndex.value = m
  } catch (e) {
    console.error('Zipcodes yüklenemedi', e)
  }
}

function initMap() {
  if (!window.L || !mapRoot.value || leafletMap) return
  leafletMap = window.L.map(mapRoot.value).setView([51.1657, 10.4515], 3)
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(leafletMap)
  markersLayer = window.L.layerGroup().addTo(leafletMap)
}

function updateMapMarkers() {
  if (!leafletMap || !markersLayer) return
  markersLayer.clearLayers()
  const bounds = []
  for (const lead of leads.value) {
    const pc = lead.postalCode || lead.postal || ''
    const info = zipcodeIndex.value.get(String(pc))
    if (!info || isNaN(info.lat) || isNaN(info.lon)) continue
    const marker = window.L.marker([info.lat, info.lon])
    const price = (lead.bids && lead.bids[0]?.amount) || lead.startPrice
    const currency = settings.value?.defaultCurrency || 'TRY'
    const insType = lead.insuranceType || ''
    const iconifyName = getInsuranceTypeIcon(insType)
    const insIcon = insType ? `<span class=\"iconify\" data-icon=\"${iconifyName}\" style=\"font-size:14px;color:#475569\"></span>` : ''
    const chip = insType ? `<span style=\"display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:999px;background:#f8fafc;color:#334155;font-size:12px\">${insIcon}<span>${insType}</span></span>` : ''
    const postalChip = pc ? `<span style=\"display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;color:#334155;font-size:12px\"><i class=\"fa fa-location-dot\" style=\"color:#64748b\"></i><span>${pc}</span></span>` : ''
    const tags = (chip || postalChip) ? `<div style=\"display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 8px\">${chip}${postalChip}</div>` : ''
    const popupHtml = `
      <div style=\"min-width:220px;max-width:280px\">
        <div style=\"font-weight:700;margin-bottom:2px;color:#0f172a;font-size:14px\">${lead.title}</div>
        ${tags}
        <div style=\"font-size:12px;margin-bottom:10px;color:#475569;line-height:1.4\">${(lead.description||'').slice(0,120)}</div>
        <div style=\"display:flex;align-items:baseline;gap:6px;margin-bottom:10px\">
          <span style=\"font-size:12px;color:#64748b\">Fiyat:</span>
          <span style=\"font-weight:700;color:#0f766e;font-size:16px\">${formatPrice(price, currency)}</span>
        </div>
        <a href=\"/lead/${lead.id}\" style=\"display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;color:#1d4ed8;text-decoration:none;background:#ffffff\">Detaya git <span aria-hidden>→</span></a>
      </div>
    `
    marker.bindPopup(popupHtml)
    marker.addTo(markersLayer)
    bounds.push([info.lat, info.lon])
  }
  if (bounds.length > 0) {
    leafletMap.fitBounds(bounds, { padding: [20, 20] })
  }
}

// Lead'ler değiştiğinde haritayı güncelle
watch(leads, () => updateMapMarkers())

onMounted(async () => {
  loadFilters() // Filtreleri yükle
  await loadSettings()
  await fetchLeads()
  await ensureZipcodesLoaded()
  initMap()
  updateMapMarkers()

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
      <!-- Premium Vitrin Alanı -->
      <div class="premium-showcase">
        <div class="premium-header">
          <div class="premium-title">
            <Icon icon="mdi:star" class="premium-star" width="24" height="24" />
            <h2>Premium Lead'ler</h2>
          </div>
          <span class="premium-badge">VIP</span>
        </div>

        <div class="premium-slider-container">
          <div class="premium-slider">
            <div v-if="premiumLeads.length === 0" style="padding: 20px; text-align: center; color: #92400e;">
              Şu anda premium lead bulunmuyor. İlk premium lead'i siz ekleyin!
            </div>
            <div class="premium-card" v-for="lead in premiumLeads" :key="lead.id" @click="navigateToLead(lead)">
              <div class="premium-card-header">
                <div class="premium-card-title">
                  <Icon v-if="lead.insuranceType" :icon="getInsuranceTypeIcon(lead.insuranceType)" class="insurance-iconify" width="20" height="20" />
                  <h3>{{ lead.title }}</h3>
                </div>
                <Icon icon="mdi:star" class="premium-icon" width="20" height="20" />
              </div>

              <div class="premium-card-description">
                {{ lead.description || 'Açıklama bulunmuyor' }}
              </div>

              <div class="premium-card-price">
                <div class="premium-price-info">
                  <span class="premium-price-label">Güncel Teklif</span>
                  <span class="premium-price-amount">
                    <span v-if="lead.bids && lead.bids.length">{{ formatPrice(lead.bids[0].amount, settings.defaultCurrency) }}</span>
                    <span v-else>{{ formatPrice(lead.startPrice, settings.defaultCurrency) }}</span>
                  </span>
                </div>
                <div v-if="lead.instantBuyPrice" class="premium-instant-price">
                  <span class="premium-instant-label">Anında Al</span>
                  <span class="premium-instant-amount">{{ formatPrice(lead.instantBuyPrice, settings.defaultCurrency) }}</span>
                </div>
              </div>

              <div class="premium-card-footer">
                <div class="premium-time">
                  <Icon icon="mdi:clock-outline" width="16" height="16" />
                  {{ formatTimeRemaining(lead.endsAt) }}
                </div>
                <div class="premium-bids">
                  <Icon icon="mdi:gavel" width="16" height="16" />
                  {{ lead.bids ? lead.bids.length : 0 }} teklif
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Harita -->
      <div v-if="showMap" class="map-container">
        <div ref="mapRoot" class="leads-map"></div>
      </div>

      <div class="page-header">
        <h1>Aktif Açık Artırmalar</h1>
        <div class="header-actions">
          <button class="view-toggle-btn" @click="toggleMapVisibility" :title="showMap ? 'Haritayı Gizle' : 'Haritayı Göster'">
            <Icon v-if="showMap" icon="mdi:map-marker-off" width="20" height="20" />
            <Icon v-else icon="mdi:map-outline" width="20" height="20" />
          </button>
          <button class="view-toggle-btn" @click="toggleViewMode" :title="viewMode === 'grid' ? 'Tablo Görünümü' : 'Kart Görünümü'">
            <Icon v-if="viewMode === 'grid'" icon="mdi:view-list" width="20" height="20" />
            <Icon v-else icon="mdi:view-grid" width="20" height="20" />
          </button>
          <button class="filter-toggle-btn" @click="showFilters = !showFilters">
            <Icon icon="mdi:filter" width="18" height="18" />
            Filtrele
            <span v-if="filters.insuranceType || filters.minPrice || filters.maxPrice" class="filter-badge">●</span>
          </button>
        </div>
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
              <Icon icon="mdi:close" width="16" height="16" />
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

      <!-- Tablo Görünümü -->
      <div v-else-if="viewMode === 'table'" class="table-view">
        <table class="leads-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Sigorta Tipi</th>
              <th>Güncel Teklif</th>
              <th>Anında Al</th>
              <th>Kalan Süre</th>
              <th>Teklif Sayısı</th>
              <th>Durum</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in leads" :key="lead.id" class="table-row" :class="{ 'expired-row': lead.isExpired }">
              <td class="lead-cell">
                <div class="lead-info">
                  <Icon v-if="lead.insuranceType" :icon="getInsuranceTypeIcon(lead.insuranceType)" class="table-icon" width="16" height="16" />
                  <div>
                    <div class="lead-title-text">{{ lead.title }}</div>
                    <div class="lead-description-text">{{ lead.description?.substring(0, 60) }}...</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="insurance-badge">{{ lead.insuranceType || '-' }}</span>
              </td>
              <td>
                <div class="price-cell">
                  <span class="current-price">
                    <span v-if="lead.bids && lead.bids.length">{{ formatPrice(lead.bids[0].amount, settings.defaultCurrency) }}</span>
                    <span v-else>{{ formatPrice(lead.startPrice, settings.defaultCurrency) }}</span>
                  </span>
                </div>
              </td>
              <td>
                <span v-if="lead.instantBuyPrice" class="instant-price-badge">
                  {{ formatPrice(lead.instantBuyPrice, settings.defaultCurrency) }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span class="time-remaining">{{ formatTimeRemaining(lead.endsAt) }}</span>
              </td>
              <td>
                <span class="bid-count">{{ lead.bids ? lead.bids.length : 0 }}</span>
              </td>
              <td>
                <span class="status-badge-table" :class="lead.isExpired ? 'expired' : 'active'">
                  {{ lead.isExpired ? 'Geçmiş' : 'Aktif' }}
                </span>
              </td>
              <td>
                <div class="table-actions">
                  <button class="table-btn primary" @click="navigateToLead(lead)" :disabled="lead.isExpired">
                    Detay
                  </button>
                  <button v-if="lead.instantBuyPrice && !lead.isExpired" class="table-btn success" @click="openInstantBuyModal(lead, $event)">
                    <Icon icon="mdi:lightning-bolt" width="14" height="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Grid Görünümü -->
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
            <Icon icon="mdi:clock-outline" class="detail-icon" width="16" height="16" />
            <span class="detail-text">{{ formatTimeRemaining(lead.endsAt) }}</span>
          </div>
          <div class="detail-item">
            <Icon icon="mdi:account-multiple" class="detail-icon" width="16" height="16" />
            <span class="detail-text">{{ lead.bids ? lead.bids.length : 0 }} teklif</span>
          </div>
          <div class="detail-item">
            <Icon icon="mdi:currency-usd" class="detail-icon" width="16" height="16" />
            <span class="detail-text">+{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement }}</span>
          </div>
          <button class="share-btn-small" @click="shareLead(lead, $event)" title="Paylaş">
            <Icon icon="mdi:share-variant" width="14" height="14" />
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
                @click.stop="setQuickBidAmount(lead, (lead.bids && lead.bids.length ? lead.bids[0].amount : lead.startPrice) + lead.minIncrement * 2)"
              >
                +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 2 }}
              </button>
              <button 
                class="quick-bid-suggestion"
                @click.stop="setQuickBidAmount(lead, (lead.bids && lead.bids.length ? lead.bids[0].amount : lead.startPrice) + lead.minIncrement * 3)"
              >
                +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 3 }}
              </button>
              <button 
                class="quick-bid-suggestion"
                @click.stop="setQuickBidAmount(lead, (lead.bids && lead.bids.length ? lead.bids[0].amount : lead.startPrice) + lead.minIncrement * 5)"
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
/* Map Container */
.map-container {
  margin-bottom: 24px;
  position: relative;
  z-index: 0;
}

.leads-map {
  width: 100%;
  height: 380px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  position: relative;
  z-index: 0;
}

/* Premium Vitrin Alanı */
.premium-showcase {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
  border: 2px solid #fbbf24;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.15);
}

.premium-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.premium-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.premium-title h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #92400e;
}

.premium-star {
  color: #f59e0b;
}

.premium-badge {
  background: #92400e;
  color: #fef3c7;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.premium-slider-container {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: #fbbf24 #fef3c7;
}

.premium-slider-container::-webkit-scrollbar {
  height: 8px;
}

.premium-slider-container::-webkit-scrollbar-track {
  background: #fef3c7;
  border-radius: 4px;
}

.premium-slider-container::-webkit-scrollbar-thumb {
  background: #fbbf24;
  border-radius: 4px;
}

.premium-slider-container::-webkit-scrollbar-thumb:hover {
  background: #f59e0b;
}

.premium-slider {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(320px, 1fr);
  gap: 16px;
  padding-bottom: 8px;
}

.premium-card {
  background: white;
  border: 2px solid #fbbf24;
  border-radius: 12px;
  padding: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.premium-card:hover {
  box-shadow: 0 8px 20px rgba(251, 191, 36, 0.3);
  border-color: #f59e0b;
}

.premium-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.premium-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.premium-card-title h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.3;
}

.premium-icon {
  color: #f59e0b;
  flex-shrink: 0;
}

.premium-card-description {
  color: #4b5563;
  font-size: 0.875rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.premium-card-price {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fef3c7;
  border-radius: 8px;
}

.premium-price-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.premium-price-label {
  font-size: 0.7rem;
  color: #92400e;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.premium-price-amount {
  font-size: 1.25rem;
  font-weight: 800;
  color: #111827;
}

.premium-instant-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  padding: 8px 12px;
  background: #10b981;
  border-radius: 6px;
}

.premium-instant-label {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  text-transform: uppercase;
}

.premium-instant-amount {
  font-size: 1rem;
  font-weight: 700;
  color: white;
}

.premium-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #fde68a;
}

.premium-time,
.premium-bids {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #92400e;
}

/* Responsive Premium Slider */
@media (max-width: 768px) {
  .premium-showcase {
    padding: 16px;
    margin-bottom: 24px;
  }

  .premium-title h2 {
    font-size: 1.25rem;
  }

  .premium-slider {
    grid-auto-columns: minmax(280px, 1fr);
    gap: 12px;
  }

  .premium-card {
    padding: 14px;
  }
}

/* Header Actions */
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.view-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #374151;
}

.view-toggle-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #111827;
}

/* Sayfa Header - Filtre Buton */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-header h1 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
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
  color: #111827;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.filter-toggle-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
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
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

/* Güncel Teklif Container */
.bid-info-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.bid-amount {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  line-height: 1;
}

.bid-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

/* Anında Satın Alma Stilleri */
.instant-buy-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 6px 12px;
  background: #10b981;
  border-radius: 6px;
}

.instant-amount {
  font-size: 1rem;
  font-weight: 700;
  color: white;
  line-height: 1;
}

.instant-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.footer-buttons {
  display: flex;
  gap: 10px;
  flex-direction: row;
}

.bid-btn {
  flex: 1;
  background: #1f2937;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.875rem;
  text-align: center;
  text-decoration: none;
  transition: all 0.2s ease;
}

.bid-btn:hover {
  background: #111827;
}

.bid-btn-disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.bid-btn-disabled:hover {
  background: #9ca3af;
}

.share-btn-small {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 5px 6px;
  cursor: pointer;
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.share-btn-small:hover {
  background: #f9fafb;
  border-color: var(--primary);
  color: #1d4ed8;
}

/* Hero Section Styles */
.hero-section {
  margin-top: 48px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(236, 72, 153, 0.1));
  border-radius: 16px;
  padding: 36px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  text-align: center;
  display: flex;
  justify-content: center;
}

.hero-content {
  max-width: 700px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.hero-title {
  font-size: clamp(2rem, 4vw, 2.8rem);
  color: #111827;
  margin: 0;
  line-height: 1.2;
}

.hero-description {
  font-size: 1rem;
  color: #4b5563;
  margin: 0;
  line-height: 1.6;
}

.hero-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-primary.hero {
  background: #2563eb;
}

.auctions-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.auction-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.auction-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.auction-card h3 {
  margin: 0;
  font-size: 1.1rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  width: 10%
}

.status-badge.active {
  background: #dcfce7;
  color: #047857;
}

.status-badge.expired {
  background: #fee2e2;
  color: #b91c1c;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.card-title {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.insurance-iconify {
  color: var(--primary);
}

.card-description {
  color: #4b5563;
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0;
}

.card-details {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-items: center;
  color: #4b5563;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #0f172a;
}

.detail-icon {
  color: #6366f1;
}

.detail-text {
  font-weight: 600;
}

.quick-bid-section {
  margin-bottom: 14px;
  padding: 0;
  background: transparent;
  border-radius: 0;
  border: none;
}

.quick-bid-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.currency-symbol {
  font-weight: 600;
  color: #111827;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
}

.quick-bid-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  background: white;
  transition: border-color 0.2s ease;
}

.quick-bid-input:focus {
  outline: none;
  border-color: #111827;
  box-shadow: 0 0 0 2px rgba(31, 41, 55, 0.1);
}

.quick-bid-submit-btn {
  padding: 8px 16px;
  background: #1f2937;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.quick-bid-submit-btn:hover:not(:disabled) {
  background: #111827;
}

.quick-bid-submit-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.quick-bid-suggestions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.quick-bid-suggestion {
  padding: 6px 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #111827;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  min-width: 0;
  text-align: center;
}

.quick-bid-suggestion:hover {
  background: #111827;
  color: white;
  border-color: #111827;
}

@media (max-width: 1024px) {
  .auctions-grid {
    grid-template-columns: 1fr;
  }

  .card-details {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-header h1 {
    font-size: 1.5rem;
  }

  .card-details {
    grid-template-columns: 1fr;
  }

  .quick-bid-suggestions {
    grid-template-columns: repeat(2, 1fr);
  }

  .hero-section {
    padding: 28px;
  }

  .auction-card {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .card-details {
    grid-template-columns: 1fr;
  }

  .quick-bid-suggestions {
    grid-template-columns: repeat(2, 1fr);
  }

  .footer-buttons {
    flex-direction: column;
    gap: 8px;
  }

  .price-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .bid-info-container,
  .instant-buy-price {
    align-items: flex-start;
  }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.empty-state h3 {
  font-size: 1.3rem;
  margin-bottom: 8px;
  color: #111827;
}

.empty-state p {
  color: #4b5563;
  font-size: 0.95rem;
  margin: 0;
}

.page-content {
  background: #f5f7fb;
  border-radius: 24px;
  padding: 32px 28px;
  border: 1px solid rgba(15, 23, 42, 0.06);
}

@media (max-width: 768px) {
  .page-content {
    padding: 20px 16px;
  }
}

@media (max-width: 430px) {
  .hero-title {
    font-size: 1.5rem;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}

.instant-buy-btn-small {
  padding: 12px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-decoration: none;
  white-space: nowrap;
}

.instant-buy-btn-small:hover {
  background: #059669;
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

/* Tablo Görünümü */
.table-view {
  overflow-x: auto;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.leads-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.leads-table thead {
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.leads-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.leads-table tbody tr {
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
}

.leads-table tbody tr:hover {
  background: #f9fafb;
}

.leads-table tbody tr.expired-row {
  opacity: 0.6;
  background: #fafafa;
}

.leads-table td {
  padding: 14px 16px;
  color: #1f2937;
  vertical-align: middle;
}

.lead-cell {
  min-width: 250px;
  max-width: 350px;
}

.lead-info {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.table-icon {
  color: var(--primary);
  margin-top: 2px;
  flex-shrink: 0;
}

.lead-title-text {
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
  line-height: 1.3;
}

.lead-description-text {
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

.insurance-badge {
  display: inline-block;
  padding: 4px 10px;
  background: #eff6ff;
  color: #1e40af;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.price-cell {
  text-align: left;
}

.current-price {
  font-weight: 700;
  color: #059669;
  font-size: 0.9375rem;
}

.instant-price-badge {
  display: inline-block;
  padding: 4px 10px;
  background: #dcfce7;
  color: #047857;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.text-muted {
  color: #9ca3af;
}

.time-remaining {
  font-weight: 500;
  color: #374151;
}

.bid-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  background: #f3f4f6;
  border-radius: 6px;
  font-weight: 600;
  color: #374151;
}

.status-badge-table {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-badge-table.active {
  background: #dcfce7;
  color: #047857;
}

.status-badge-table.expired {
  background: #fee2e2;
  color: #b91c1c;
}

.table-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.table-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.table-btn.primary {
  background: #1f2937;
  color: white;
}

.table-btn.primary:hover:not(:disabled) {
  background: #111827;
}

.table-btn.primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.5;
}

.table-btn.success {
  background: #10b981;
  color: white;
  padding: 6px 8px;
}

.table-btn.success:hover {
  background: #059669;
}

/* Tablo Responsive */
@media (max-width: 1200px) {
  .leads-table {
    font-size: 0.8125rem;
  }

  .leads-table th,
  .leads-table td {
    padding: 10px 12px;
  }

  .lead-cell {
    min-width: 200px;
    max-width: 280px;
  }
}

@media (max-width: 768px) {
  .table-view {
    border-radius: 8px;
  }

  .leads-table {
    font-size: 0.75rem;
  }

  .leads-table th,
  .leads-table td {
    padding: 8px 10px;
  }

  .lead-description-text {
    display: none;
  }

  .insurance-badge,
  .instant-price-badge {
    font-size: 0.6875rem;
    padding: 3px 8px;
  }
}

</style>
