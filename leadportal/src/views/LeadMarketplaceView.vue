<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import api from '@/utils/axios.js'
import { io } from 'socket.io-client'
import { formatPrice, getCurrencySymbol } from '@/utils/currency.js'
import { useAlert } from '../composables/useAlert'
import InstantBuyModal from '@/components/InstantBuyModal.vue'
import LeadCard from '@/components/LeadCard.vue'

const { success, error } = useAlert()
const route = useRoute()

// Route'a göre lead tipini belirle
const leadType = computed(() => {
  return route.path === '/sofort-kauf' ? 'SOFORT_KAUF' : 'AUCTION'
})

// Sayfa başlığı ve açıklaması
const pageTitle = computed(() => {
  return leadType.value === 'SOFORT_KAUF' ? 'Sofort Kauf' : 'Açık Artırma'
})

const pageDescription = computed(() => {
  return leadType.value === 'SOFORT_KAUF'
    ? 'Anında satın alınabilir lead\'ler'
    : 'Teklif vererek kazanabileceğiniz lead\'ler'
})

const pageIcon = computed(() => {
  return leadType.value === 'SOFORT_KAUF' ? 'mdi:flash' : 'mdi:gavel'
})

const leads = ref([])
const allLeads = ref([]) // Tüm lead'ler
const socket = io('/', { path: '/socket.io' })
const showInstantBuyModal = ref(false)
const selectedLead = ref(null)
const isProcessing = ref(false)
const settings = ref({ defaultCurrency: 'EUR', insuranceTypes: [] })
const quickBidAmounts = ref({})
const isSubmittingBid = ref({})
const showDescriptionModal = ref(false)
const selectedDescription = ref(null)

// Premium slider kaydırma ipucu
const premiumSliderContainer = ref(null)
const showRightScrollHint = ref(false)
const hasMoreThanThreePremium = computed(() => premiumLeads.value.length > 3)

function updatePremiumScrollHint() {
  const el = premiumSliderContainer.value
  if (!el) {
    showRightScrollHint.value = false
    return
  }
  const remaining = el.scrollWidth - el.clientWidth - el.scrollLeft
  showRightScrollHint.value = remaining > 8 // sağda kaydırılacak alan varsa göster
}

function scrollPremiumRight() {
  const el = premiumSliderContainer.value
  if (!el) return
  el.scrollBy({ left: 320, behavior: 'smooth' })
}

function handlePremiumScroll(event) {
  const container = event?.target || premiumSliderContainer.value
  if (!container) return
  // HomeView davranışı: ilk birkaç px içinde göster, sonra gizle
  const remaining = container.scrollWidth - container.clientWidth - container.scrollLeft
  showRightScrollHint.value = container.scrollLeft <= 10 && remaining > 8
}

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
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

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
  } else if (minutes > 0) {
    // 1 saatten az kaldığında dakika ve saniye göster
    return `${minutes}d ${seconds}s`
  } else {
    // 1 dakikadan az kaldığında sadece saniye göster
    return `${seconds}s`
  }
}

// Kalan zaman belirli bir süreden az mı kontrol et (saniye cinsinden)
function isTimeRemaining(endsAt, seconds) {
  const now = new Date()
  const endTime = new Date(endsAt)
  const diff = (endTime - now) / 1000
  return diff > 0 && diff < seconds
}

// Sigorta tipi için CSS sınıfı döndür
function getInsuranceTypeClass(typeName) {
  if (!typeName) return 'insurance-default'
  // Önceden tanımlı renk haritası
  const typeColorMap = {
    'KV-Voll': 'insurance-kv-voll',
    'KV': 'insurance-kv',
    'Hayvan': 'insurance-animal',
    'Araba': 'insurance-car',
    'Sağlık': 'insurance-health'
  }
  return typeColorMap[typeName] || 'insurance-default'
}

// Minimum teklif tutarı hesapla
function getMinBidAmount(lead) {
  if (!lead) return '0'
  if (lead.bids && lead.bids.length) {
    return (lead.bids[0].amount + lead.minIncrement).toString()
  }
  return (lead.startPrice + lead.minIncrement).toString()
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
  // Route'a göre lead tipini filtrele
  const { data } = await api.get(`/leads?leadType=${leadType.value}`)
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
      success('Lead linki panoya kopyalandı!')
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
}

async function handleInstantBuySuccess() {
  // Lead'leri yeniden yükle
  await fetchLeads()
}

async function submitQuickBid(lead, amount) {
  if (!amount || amount <= 0) {
    error('Lütfen geçerli bir teklif miktarı girin')
    return
  }

  try {
    const response = await api.post(`/bids`, {
      leadId: lead.id,
      maxBid: Math.round(Number(amount))
    }, { headers: authHeaders() })

    // 201 dönerse başarı say ve liderlik durumuna göre mesaj göster
    if (response.status === 201) {
      const data = response.data || {}
      await fetchLeads()
      if (data.isLeader) {
        const currency = settings.value?.defaultCurrency || 'EUR'
        success(`Tebrikler! Şu anda lidersiniz. Görünür fiyat: ${formatPrice(data.visiblePrice, currency)}`)
      } else {
        error('Teklifiniz alındı, ancak başka bir kullanıcının maksimumu daha yüksek. Lider olmak için daha yüksek bir maksimum teklif verin.')
      }
    }
  } catch (err) {
    const errorData = err.response?.data
    error(errorData?.error || 'Teklif verme işlemi başarısız')
  }
}

function setQuickBidAmount(lead, amount) {
  quickBidAmounts.value[lead.id] = amount
}

function showDescription(lead, event) {
  event.stopPropagation()
  selectedDescription.value = lead
  showDescriptionModal.value = true
}

function closeDescriptionModal() {
  showDescriptionModal.value = false
  selectedDescription.value = null
}

// Posta kodundan şehir adını getir
function getCityFromPostalCode(postalCode) {
  if (!postalCode) return ''
  const info = zipcodeIndex.value.get(String(postalCode))
  return info?.name || ''
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
    const currency = settings.value?.defaultCurrency || 'EUR'
    const insType = lead.insuranceType || ''
    const iconifyName = getInsuranceTypeIcon(insType)
    const insIcon = insType ? `<span class=\"iconify\" data-icon=\"${iconifyName}\" style=\"font-size:14px;color:#475569\"></span>` : ''
    const chip = insType ? `<span style=\"display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:999px;background:#f8fafc;color:#334155;font-size:12px\">${insIcon}<span>${insType}</span></span>` : ''
    const postalChip = pc ? `<span style=\"display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;color:#334155;font-size:12px\"><span class=\"iconify\" data-icon=\"mdi:map-marker-outline\" style=\"font-size:14px;color:#64748b\"></span><span>${pc}</span></span>` : ''
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

// Route değiştiğinde leadleri yeniden yükle
watch(() => route.path, async () => {
  await fetchLeads()
  applyFilters()
})

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

  // Her saniye zamanı güncelle (geri sayım için)
  const timeInterval = setInterval(() => {
    // Vue reactivity için leads array'ini güncelle
    leads.value = [...leads.value]
    allLeads.value = [...allLeads.value]
    // Premium slider sağ ok görünürlüğünü canlı tut
    updatePremiumScrollHint()
  }, 1000) // 1 saniyede bir güncelle

  onUnmounted(() => {
    clearInterval(timeInterval)
    socket.close()
  })

  // Premium slider scroll/resize dinleyicileri
  setTimeout(() => updatePremiumScrollHint(), 0)
  window.addEventListener('resize', updatePremiumScrollHint)
  if (premiumSliderContainer.value) {
    premiumSliderContainer.value.addEventListener('scroll', updatePremiumScrollHint, { passive: true })
  }
})

// Temizleme: dış dinleyicileri kaldır
onUnmounted(() => {
  window.removeEventListener('resize', updatePremiumScrollHint)
  if (premiumSliderContainer.value) {
    premiumSliderContainer.value.removeEventListener('scroll', updatePremiumScrollHint)
  }
})
</script>

<template>
  <section :data-lead-type="leadType">
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

    <!-- Premium Vitrin Alanı -->
    <div v-if="premiumLeads.length > 0" class="premium-section">
      <div class="premium-showcase">
        <div class="premium-header">
          <div class="premium-title">
            <div class="premium-title-icon">
              <Icon icon="mdi:star" class="premium-star" width="28" height="28" />
              <div class="premium-title-glow"></div>
            </div>
            <div class="premium-title-text">
              <h2>Premium Lead'ler</h2>
              <p class="premium-subtitle">Özel seçilmiş yüksek kaliteli lead'ler</p>
            </div>
          </div>
          <div class="premium-badge-container">
            <span class="premium-badge">VIP</span>
            <div class="premium-badge-glow"></div>
          </div>
        </div>

        <div class="premium-slider-wrapper">
          <div class="premium-slider-container" ref="premiumSliderContainer" @scroll="handlePremiumScroll">
            <div class="premium-slider">
            <div class="premium-card" v-for="lead in premiumLeads" :key="lead.id" @click="navigateToLead(lead)">
              <div class="premium-card-glow"></div>
              <div class="premium-card-header">
                <div class="premium-card-title">
                  <div class="premium-card-icon">
                    <Icon v-if="lead.insuranceType" :icon="getInsuranceTypeIcon(lead.insuranceType)" class="insurance-iconify" width="22" height="22" />
                  </div>
                  <h3>{{ lead.title }}</h3>
                </div>
                <div class="premium-card-star">
                  <Icon icon="mdi:star" class="premium-icon" width="20" height="20" />
                  <div class="premium-star-glow"></div>
                </div>
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
          <div v-if="hasMoreThanThreePremium && showRightScrollHint" class="premium-scroll-indicator">
            <Icon icon="mdi:chevron-right" width="32" height="32" />
          </div>
        </div>
      </div>
    </div>

    <!-- Harita -->
    <div v-if="showMap" class="map-section">
      <div class="map-container">
        <div ref="mapRoot" class="leads-map"></div>
      </div>
    </div>

    <!-- Aktif Açık Artırmalar / Sofort Kauf -->
    <div class="auctions-section">
      <div class="page-header">
        <div class="page-header-content">
         <!--   <Icon :icon="pageIcon" width="32" class="page-icon" /> -->
         
          <div>
            <h1>{{ pageTitle }}</h1>
            <p class="page-subtitle">{{ pageDescription }}</p>
          </div>
        </div>
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
              <th>Lead ID & Başlık</th>
              <th>Teklifler</th>
              <th>Güncel Fiyat</th>
              <th>Hızlı Teklif</th>
              <th>Kalan Süre</th>
              <th>Durum</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in leads" :key="lead.id" class="table-row" :class="{ 'expired-row': lead.isExpired, 'critical-time': isTimeRemaining(lead.endsAt, 60) }">
              <td class="lead-cell">
                <div class="lead-info">
                  <Icon v-if="lead.insuranceType" :icon="getInsuranceTypeIcon(lead.insuranceType)" class="table-icon" width="16" height="16" />
                  <div>
                    <div class="lead-id-badge">LP-{{ lead.id }}</div>
                    <div class="lead-title-text">
                      <span v-if="lead.insuranceType" class="insurance-type-inline" :class="getInsuranceTypeClass(lead.insuranceType)">{{ lead.insuranceType }}</span>
                      {{ lead.title }}
                    </div>
                    <div class="lead-description-text">{{ lead.description?.substring(0, 60) }}...</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="bid-count-highlight">{{ lead.bids ? lead.bids.length : 0 }} teklif</span>
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
                <div v-if="lead.leadType !== 'SOFORT_KAUF' && !lead.isExpired && lead.isActive" class="quick-bid-cell" @click.stop>
                  <div class="quick-bid-inline">
                    <input
                      type="number"
                      class="quick-bid-input-inline"
                      :placeholder="getMinBidAmount(lead)"
                      v-model="quickBidAmounts[lead.id]"
                      @click="$event.stopPropagation()"
                      :min="getMinBidAmount(lead)"
                    />
                    <button
                      class="quick-bid-submit-inline"
                      @click="submitQuickBid(lead, quickBidAmounts[lead.id])"
                      :disabled="!quickBidAmounts[lead.id] || quickBidAmounts[lead.id] <= 0"
                    >
                      Teklif
                    </button>
                  </div>
                </div>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="time-cell">
                <div class="countdown-timer" :class="{ 'blinking': isTimeRemaining(lead.endsAt, 60) }">
                  <Icon icon="mdi:clock" width="16" height="16" />
                  <span class="time-text">{{ formatTimeRemaining(lead.endsAt) }}</span>
                </div>
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
        <LeadCard
          v-for="lead in leads"
          :key="lead.id"
          :lead="lead"
          :settings="settings"
          :show-quick-bid="!lead.isExpired && lead.isActive"
          :zipcode-index="zipcodeIndex"
          @click="navigateToLead"
          @show-description="showDescription"
          @instant-buy="openInstantBuyModal"
          @submit-bid="submitQuickBid"
        />
      </div>
  </div>

    <!-- 
    Hero Section - Lead varsa altta
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
    -->

    <!-- Description Modal -->
    <div v-if="showDescriptionModal" class="modal-backdrop" @click="closeDescriptionModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Lead Beschreibung</h3>
          <button class="modal-close" @click="closeDescriptionModal">×</button>
        </div>

        <div class="modal-body">
          <div class="description-info">
            <div class="lead-title-modal">{{ selectedDescription?.title }}</div>
            <div class="lead-id-modal">LP-{{ selectedDescription?.id }}</div>
            <div class="description-text">
              {{ selectedDescription?.description || 'Keine Beschreibung verfügbar' }}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeDescriptionModal">
            Schließen
          </button>
        </div>
      </div>
    </div>

    <!-- Instant Buy Modal -->
    <InstantBuyModal
      :show="showInstantBuyModal"
      :lead="selectedLead"
      :currency="settings.defaultCurrency"
      @close="closeInstantBuyModal"
      @success="handleInstantBuySuccess"
    />
  </section>
</template>

<style scoped>
/* Section Containers */
.premium-section {
  background: #f5f7fb;
  border-radius: 24px;
  padding: 32px 28px;
  margin: 0 auto 24px auto;
  border: 1px solid rgba(15, 23, 42, 0.06);
  max-width: 1400px;
  width: 100%;
}

.map-section {
  background: #f5f7fb;
  border-radius: 24px;
  padding: 32px 28px;
  margin: 0 auto 24px auto;
  border: 1px solid rgba(15, 23, 42, 0.06);
  max-width: 1400px;
  width: 100%;
}

.auctions-section {
  background: #f5f7fb;
  border-radius: 24px;
  padding: 32px 28px;
  margin: 0 auto;
  border: 1px solid rgba(15, 23, 42, 0.06);
  max-width: 1400px;
  width: 100%;
}

/* Map Container */
.map-container {
  margin-bottom: 0;
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
  padding: 28px;
  margin-bottom: 32px;
  border: 2px solid #fbbf24;
  box-shadow: 0 4px 20px rgba(251, 191, 36, 0.15);
  position: relative;
}

.premium-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.premium-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.premium-title-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.premium-star {
  color: #f59e0b;
}

.premium-title-glow {
  display: none;
}

.premium-title-text h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #92400e;
  letter-spacing: -0.01em;
}

.premium-subtitle {
  margin: 4px 0 0 0;
  font-size: 0.875rem;
  color: #a16207;
  font-weight: 500;
  opacity: 0.8;
}

.premium-badge-container {
  display: flex;
  align-items: center;
  justify-content: center;
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
  box-shadow: 0 2px 8px rgba(146, 64, 14, 0.2);
}

.premium-badge-glow {
  display: none;
}

.premium-slider-container {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  /* Scrollbar gizle (Firefox) */
  scrollbar-width: none;
  /* Scrollbar gizle (IE/Edge eski) */
  -ms-overflow-style: none;
}

.premium-slider-container::-webkit-scrollbar {
  /* Scrollbar gizle (WebKit) */
  display: none;
}

.premium-slider {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(320px, 1fr);
  gap: 16px;
  padding-bottom: 8px;
}

.premium-slider-wrapper {
  position: relative;
}

.premium-scroll-indicator {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 64px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.95) 30%);
  pointer-events: none;
  z-index: 10;
  color: #1d4ed8;
  opacity: 0.85;
  animation: premium-pulse-scroll 2s ease-in-out infinite;
}

@keyframes premium-pulse-scroll {
  0%, 100% {
    opacity: 0.6;
    transform: translateY(-50%) translateX(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-50%) translateX(4px);
  }
}

.premium-card {
  background: white;
  border: 2px solid #fbbf24;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 200px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  position: relative;
}

.premium-card::before {
  display: none;
}

.premium-card:hover {

  box-shadow: 0 8px 25px rgba(251, 191, 36, 0.2);
  border: 2px solid #f59e0b;
}

.premium-card-glow {
  display: none;
}

.premium-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.premium-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.premium-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #fef3c7;
  border-radius: 8px;
  border: 1px solid #fbbf24;
}

.insurance-iconify {
  color: #92400e;
}

.premium-card-title h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.3;
}

.premium-card-star {
  display: flex;
  align-items: center;
  justify-content: center;
}

.premium-icon {
  color: #f59e0b;
  flex-shrink: 0;
}

.premium-star-glow {
  display: none;
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
  display: none!important;
}

.premium-card-price {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #fef3c7;
  border-radius: 8px;
  border: 1px solid #fbbf24;
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

.premium-instant-price::before {
  display: none;
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

.premium-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  text-align: center;
  color: #92400e;
  grid-column: 1 / -1;
}

.premium-empty-icon {
  margin-bottom: 12px;
  opacity: 0.6;
}

.premium-empty-state h3 {
  margin: 0 0 6px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #92400e;
}

.premium-empty-state p {
  margin: 0;
  font-size: 0.875rem;
  color: #a16207;
  opacity: 0.8;
}

/* Responsive Premium Slider */
@media (max-width: 768px) {
  .premium-showcase {
    padding: 20px;
    margin-bottom: 24px;
  }

  .premium-title-text h2 {
    font-size: 1.3rem;
  }

  .premium-subtitle {
    font-size: 0.8rem;
  }

  .premium-slider {
    grid-auto-columns: minmax(280px, 1fr);
    gap: 12px;
  }

  .premium-card {
    padding: 16px;
    min-height: 180px;
  }

  .premium-card-icon {
    width: 32px;
    height: 32px;
  }

  .premium-card-title h3 {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .premium-showcase {
    padding: 16px;
    margin-bottom: 20px;
  }

  .premium-title-text h2 {
    font-size: 1.2rem;
  }

  .premium-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .premium-badge-container {
    align-self: flex-end;
  }

  .premium-slider {
    grid-auto-columns: minmax(260px, 1fr);
    gap: 10px;
  }

  .premium-card {
    padding: 14px;
    min-height: 160px;
  }

  .premium-card-price {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .premium-instant-price {
    align-self: flex-end;
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

.page-header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-icon {
  flex-shrink: 0;
}

.page-header-content .page-icon {
  color: var(--primary, #3b82f6);
}

/* Sofort Kauf için turuncu renk */
[data-lead-type="SOFORT_KAUF"] .page-icon {
  color: #f59e0b;
}

.page-subtitle {
  color: #6b7280;
  font-size: 0.95rem;
  margin: 0.25rem 0 0 0;
}

.page-header h1 {
  font-size: 1.875rem;
  margin: 0;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  width:100%;
}

@media (max-width: 1024px) {
  .auctions-grid {
    grid-template-columns: 1fr;
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

  .hero-section {
    padding: 28px;
  }
}

.insurance-iconify {
  color: var(--primary);
}

  .bid-action-btn,
  .instant-buy-action-btn {
    padding: 10px 14px;
    font-size: 0.8125rem;
  }

  .instant-buy-badge {
    padding: 4px 8px;
    font-size: 0.75rem;
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

/* Responsive Section Containers */
@media (max-width: 1200px) {
  .premium-section,
  .map-section,
  .auctions-section {
    max-width: 100%;
    margin-left: 16px;
    margin-right: 16px;
  }
}

@media (max-width: 768px) {
  .premium-section,
  .map-section,
  .auctions-section {
    padding: 20px 16px;
    margin-left: 12px;
    margin-right: 12px;
  }
}

@media (max-width: 480px) {
  .premium-section,
  .map-section,
  .auctions-section {
    margin-left: 8px;
    margin-right: 8px;
    padding: 16px 12px;
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

.description-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lead-title-modal {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
}

.lead-id-modal {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.05em;
}

.description-text {
  font-size: 0.9375rem;
  color: #475569;
  line-height: 1.6;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
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

/* Lead ID Badge */
.lead-id-badge {
  font-size: 0.65rem;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
  text-transform: uppercase;
}

/* Insurance Type Inline Badge */
.insurance-type-inline {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  margin-right: 4px;
  color: white;
}

.insurance-kv-voll {
  background: #dc2626;
}

.insurance-kv {
  background: #f97316;
}

.insurance-animal {
  background: #8b5cf6;
}

.insurance-car {
  background: #0ea5e9;
}

.insurance-health {
  background: #10b981;
}

.insurance-default {
  background: #6b7280;
}

/* Bid Count Highlight */
.bid-count-highlight {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  color: #15803d;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
}

/* Quick Bid Inline */
.quick-bid-cell {
  padding: 10px 16px !important;
}

.quick-bid-inline {
  display: flex;
  gap: 4px;
  align-items: center;
  width: 100%;
}

.quick-bid-input-inline {
  flex: 1;
  min-width: 60px;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: white;
  color: #0f172a;
  transition: all 0.2s ease;
}

.quick-bid-input-inline:focus {
  outline: none;
  border-color: #0f172a;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1);
}

.quick-bid-submit-inline {
  flex: 0 0 auto;
  padding: 6px 10px;
  background: #0f172a;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.quick-bid-submit-inline:hover:not(:disabled) {
  background: #1e293b;
}

.quick-bid-submit-inline:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  opacity: 0.5;
}

/* Countdown Timer */
.time-cell {
  position: relative;
}

.countdown-timer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #374151;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  transition: all 0.2s ease;
}

.countdown-timer svg {
  flex-shrink: 0;
}

.time-text {
  font-size: 0.875rem;
  letter-spacing: 0.5px;
}

/* Blinking Effect for Last Minute */
.blinking {
  animation: blink 1s infinite;
  background: #fee2e2;
  color: #991b1b;
  font-weight: 700;
}

@keyframes blink {
  0%, 49% {
    background: #fee2e2;
    color: #991b1b;
  }
  50%, 100% {
    background: #fecaca;
    color: #7f1d1d;
  }
}

/* Critical Time Row */
.table-row.critical-time {
  background: #fffbeb;
}

.table-row.critical-time:hover {
  background: #fef3c7;
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

@media (max-width: 1024px) {
  .lead-cell {
    min-width: 150px;
    max-width: 220px;
  }

  .quick-bid-input-inline {
    min-width: 50px;
  }

  .insurance-type-inline {
    padding: 2px 4px;
    font-size: 0.6rem;
  }
}

@media (max-width: 768px) {
  .table-view {
    border-radius: 8px;
  }

  .leads-table {
    font-size: 0.7rem;
  }

  .leads-table th,
  .leads-table td {
    padding: 6px 8px;
  }

  .lead-description-text {
    display: none;
  }

  .lead-id-badge {
    display: none;
  }

  .insurance-type-inline {
    padding: 1px 3px;
    font-size: 0.55rem;
    margin-right: 2px;
  }

  .quick-bid-inline {
    gap: 2px;
  }

  .quick-bid-input-inline {
    min-width: 40px;
    padding: 4px 6px;
    font-size: 0.65rem;
  }

  .quick-bid-submit-inline {
    padding: 4px 6px;
    font-size: 0.6rem;
  }

  .countdown-timer {
    padding: 4px 6px;
    gap: 3px;
  }

  .countdown-timer svg {
    width: 12px !important;
    height: 12px !important;
  }

  .time-text {
    font-size: 0.7rem;
  }

  .bid-count-highlight {
    padding: 4px 8px;
    font-size: 0.7rem;
  }

  .table-btn {
    padding: 4px 8px;
    font-size: 0.65rem;
  }

  .lead-cell {
    min-width: 120px;
    max-width: 180px;
  }
}

@media (max-width: 480px) {
  .leads-table {
    font-size: 0.6rem;
  }

  .leads-table th,
  .leads-table td {
    padding: 4px 6px;
  }

  .quick-bid-inline {
    display: none;
  }

  .countdown-timer {
    padding: 3px 4px;
  }

  .table-btn {
    padding: 3px 6px;
    font-size: 0.55rem;
  }

  .lead-cell {
    min-width: 100px;
    max-width: 140px;
  }

  .quick-bid-cell {
    display: none;
  }

  .lead-title-text {
    font-size: 0.7rem;
  }
}

</style>
