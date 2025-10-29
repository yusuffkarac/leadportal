<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import axios from 'axios'
import { getCurrencySymbol, formatPrice } from '@/utils/currency.js'
import { useMap } from '@/composables/useMap.js'
import { Icon } from '@iconify/vue'
function getInsuranceTypeIconifyName(typeName) {
  if (!typeName) return 'mdi:file'
  const list = insuranceTypes.value || []
  const found = list.find(t => (typeof t === 'object' ? t.name : t) === typeName)
  const raw = typeof found === 'object' ? found?.icon : null
  if (!raw) return 'mdi:file'
  if (raw.includes(':')) return raw
  return `mdi:${raw}`
}

const leads = ref([])
const showLeadModal = ref(false)
const modalMode = ref('new') // 'new' veya 'edit'
const editingLead = ref(null)
const expandedBids = ref(new Set())
const settings = ref({ defaultCurrency: 'EUR' })

// Unified Lead Form
const leadForm = ref({
  title: '',
  description: '',
  privateDetails: '',
  postalCode: '',
  startPrice: '',
  minIncrement: '',
  buyNowPrice: '',
  insuranceType: '',
  endsAt: '',
  isActive: true,
  isShowcase: false
})

const errorMessage = ref('')
const successMessage = ref('')
const insuranceTypes = ref([])

// Formleadport entegrasyonu için yeni değişkenler
const formleadportFormId = ref('')
const formleadportData = ref(null)
const showFormPreview = ref(false)
const isLoadingFormData = ref(false)
const formleadportError = ref('')

// Posta kodu autocomplete
const showPostalCodeDropdown = ref(false)
const postalCodeSearch = ref('')
const postalCodeResults = ref([])
const postalCodeInputFocused = ref(false)
const selectedPostalCodeIndex = ref(-1)
const postalCodeDropdownRef = ref(null)

// Posta kodu arama fonksiyonu
async function searchPostalCodes(query) {
  if (!query || query.length < 2) {
    postalCodeResults.value = []
    return
  }
  
  try {
    const res = await fetch('/zipcodes.json')
    const zipcodes = await res.json()
    
    const filtered = zipcodes
      .filter(z => 
        z.postal && z.postal.toString().includes(query) ||
        z.name && z.name.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 40) // İlk 40 sonucu göster
      .map(z => ({
        postal: z.postal,
        name: z.name,
        display: `${z.postal} - ${z.name}`
      }))
    
    postalCodeResults.value = filtered
  } catch (error) {
    console.error('Posta kodu arama hatası:', error)
    postalCodeResults.value = []
  }
}

// Posta kodu seçme fonksiyonu
function selectPostalCode(zipcode) {
  leadForm.value.postalCode = zipcode.postal
  postalCodeSearch.value = zipcode.postal // Sadece posta kodu numarası
  showPostalCodeDropdown.value = false
}

// Posta kodu input focus/blur
function onPostalCodeFocus() {
  postalCodeInputFocused.value = true
  if (postalCodeSearch.value) {
    showPostalCodeDropdown.value = true
  }
}

function onPostalCodeBlur() {
  // Kısa bir gecikme ile dropdown'ı kapat (click event'i için)
  setTimeout(() => {
    postalCodeInputFocused.value = false
    showPostalCodeDropdown.value = false
  }, 200)
}

// Posta kodu input değişikliği
function onPostalCodeInput() {
  leadForm.value.postalCode = postalCodeSearch.value
  selectedPostalCodeIndex.value = -1 // Reset selection
  if (postalCodeSearch.value.length >= 2) {
    searchPostalCodes(postalCodeSearch.value)
    showPostalCodeDropdown.value = true
  } else {
    postalCodeResults.value = []
    showPostalCodeDropdown.value = false
  }
}

// Seçili item'ı görünür alanda tutmak için scroll
function scrollToSelectedItem() {
  if (!postalCodeDropdownRef.value || selectedPostalCodeIndex.value < 0) {
    return
  }

  const dropdown = postalCodeDropdownRef.value
  const selectedItem = dropdown.children[selectedPostalCodeIndex.value]
  
  if (!selectedItem) return

  const dropdownRect = dropdown.getBoundingClientRect()
  const itemRect = selectedItem.getBoundingClientRect()

  // Eğer item dropdown'ın üstünde kalıyorsa
  if (itemRect.top < dropdownRect.top) {
    selectedItem.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }
  // Eğer item dropdown'ın altında kalıyorsa
  else if (itemRect.bottom > dropdownRect.bottom) {
    selectedItem.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }
}

// Klavye navigasyonu
function onPostalCodeKeydown(event) {
  if (!showPostalCodeDropdown.value || postalCodeResults.value.length === 0) {
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedPostalCodeIndex.value = Math.min(
        selectedPostalCodeIndex.value + 1,
        postalCodeResults.value.length - 1
      )
      // Seçim değiştiğinde scroll et
      setTimeout(() => scrollToSelectedItem(), 0)
      break
    case 'ArrowUp':
      event.preventDefault()
      selectedPostalCodeIndex.value = Math.max(selectedPostalCodeIndex.value - 1, -1)
      // Seçim değiştiğinde scroll et
      setTimeout(() => scrollToSelectedItem(), 0)
      break
    case 'Enter':
      event.preventDefault()
      if (selectedPostalCodeIndex.value >= 0 && selectedPostalCodeIndex.value < postalCodeResults.value.length) {
        selectPostalCode(postalCodeResults.value[selectedPostalCodeIndex.value])
      }
      break
    case 'Escape':
      showPostalCodeDropdown.value = false
      selectedPostalCodeIndex.value = -1
      break
  }
}

// Click outside to close dropdown
function handleClickOutside(event) {
  const postalCodeContainer = event.target.closest('.postal-code-container')
  if (!postalCodeContainer && showPostalCodeDropdown.value) {
    showPostalCodeDropdown.value = false
  }
}

// Formleadport'tan form verilerini çek
async function fetchFormleadportData() {
  if (!formleadportFormId.value.trim()) {
    formleadportError.value = 'Lütfen form numarası girin'
    return
  }
  
  isLoadingFormData.value = true
  formleadportError.value = ''
  
  try {
    const { data } = await axios.get(`/api/leads/formleadport-data/${formleadportFormId.value}`, {
      headers: authHeaders()
    })
    
    if (data.success) {
      formleadportData.value = data.data
      showFormPreview.value = true
    } else {
      formleadportError.value = data.error || 'Form verileri alınamadı'
    }
  } catch (e) {
    const status = e?.response?.status
    const data = e?.response?.data
    
    if (status === 404) {
      formleadportError.value = 'Bu form numarası bulunamadı'
    } else if (status === 401) {
      formleadportError.value = 'Yetkilendirme hatası'
    } else if (status === 429) {
      formleadportError.value = 'Çok fazla istek gönderildi, lütfen bekleyin'
    } else {
      formleadportError.value = data?.error || 'Form verileri alınamadı'
    }
  } finally {
    isLoadingFormData.value = false
  }
}

// Form verilerini lead formuna otomatik doldur
function useFormleadportData() {
  if (!formleadportData.value) return
  
  const formData = formleadportData.value
  
  // Formleadport verilerini lead formuna map et
  leadForm.value.title = `${formData.firma_adi} - ${formData.musteri_isim} ${formData.musteri_soyisim}`
  leadForm.value.description = `Müşteri: ${formData.musteri_isim} ${formData.musteri_soyisim}\nFirma: ${formData.firma_adi}\nTelefon: ${formData.telefon || 'Belirtilmemiş'}\nEmail: ${formData.email || 'Belirtilmemiş'}`
  leadForm.value.postalCode = formData.posta_kodu || ''
  postalCodeSearch.value = formData.posta_kodu || ''
  
  // Sigorta türü mapping
  if (formData.sigorta) {
    const sigortaMapping = {
      'Özel': 'Sağlık',
      'Yasal': 'Sağlık', 
      'Sigorta Yok': 'Sağlık'
    }
    leadForm.value.insuranceType = sigortaMapping[formData.sigorta] || 'Sağlık'
  }
  
  // Private details'e detaylı bilgileri ekle
  leadForm.value.privateDetails = `FORMLEADPORT VERİLERİ:
Form ID: ${formData.form_id}
Müşteri: ${formData.musteri_isim} ${formData.musteri_soyisim}
Cinsiyet: ${formData.musteri_cinsiyet || 'Belirtilmemiş'}
Doğum Tarihi: ${formData.musteri_dogum_tarihi || 'Belirtilmemiş'}
Email: ${formData.email || 'Belirtilmemiş'}
Telefon: ${formData.telefon || 'Belirtilmemiş'}
Sabit Telefon: ${formData.sabit_telefon || 'Belirtilmemiş'}
Firma: ${formData.firma_adi}
Adres: ${formData.adres || 'Belirtilmemiş'}
Şehir: ${formData.sehir || 'Belirtilmemiş'}
Medeni Durum: ${formData.medeni_durum || 'Belirtilmemiş'}
Çalışma Durumu: ${formData.calisma_durumu || 'Belirtilmemiş'}
Sigorta: ${formData.sigorta || 'Belirtilmemiş'}
Sigorta Şirketi: ${formData.sigorta_sirket || 'Belirtilmemiş'}
Randevu Tarihi: ${formData.randevu_tarihi || 'Belirtilmemiş'}
Randevu Tipi: ${formData.randevu_tipi || 'Belirtilmemiş'}

ORİJİNAL FORMLAADPORT VERİLERİ:
${JSON.stringify(formData, null, 2)}`
  
  // Modal'ı kapat
  showFormPreview.value = false
  formleadportError.value = ''
}

// Modal'ı kapat
function closeFormPreview() {
  showFormPreview.value = false
  formleadportData.value = null
  formleadportError.value = ''
}

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

// Görünüm tipi (grid veya table)
const viewMode = ref(localStorage.getItem('adminLeadViewMode') || 'grid')

// Harita composable'ını kullan
const { showMap, mapRoot, toggleMapVisibility, ensureZipcodesLoaded, initMap, updateMapMarkers, cleanup } = useMap('adminLeads')

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadSettings() {
  try {
    const response = await axios.get('/api/settings', { headers: authHeaders() })
    settings.value = response.data
    insuranceTypes.value = response.data.insuranceTypes || [
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
  } catch (error) {
    console.error('Ayarlar yüklenemedi:', error)
    insuranceTypes.value = [
      { name: 'Hayvan', icon: 'fa-paw' },
      { name: 'Araba', icon: 'fa-car' },
      { name: 'Sağlık', icon: 'fa-heart-pulse' }
    ] // Fallback
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

async function openLeadModal(mode, lead = null) {
  modalMode.value = mode
  showLeadModal.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  // Formleadport değişkenlerini sıfırla
  formleadportFormId.value = ''
  formleadportData.value = null
  showFormPreview.value = false
  formleadportError.value = ''

  if (mode === 'new') {
    // Yeni lead için varsayılan değerleri yükle
    try {
      const settingsResponse = await axios.get('/api/settings', { headers: authHeaders() })
      const settings = settingsResponse.data

      // Varsayılan bitiş tarihini hesapla (şu an + varsayılan gün sayısı)
      const now = new Date()
      const defaultEndDate = new Date(now.getTime() + (settings.defaultAuctionDays || 7) * 24 * 60 * 60 * 1000)
      const formattedEndDate = defaultEndDate.toISOString().slice(0, 16)

      leadForm.value = {
        title: '',
        description: '',
        privateDetails: '',
        startPrice: '',
        minIncrement: settings.defaultMinIncrement || 10,
        buyNowPrice: '',
        endsAt: formattedEndDate,
        postalCode: '',
        insuranceType: '',
        isActive: true,
        isShowcase: false
      }
      postalCodeSearch.value = ''
      postalCodeResults.value = []
    } catch (error) {
      // Hata durumunda varsayılan değerleri kullan
      const now = new Date()
      const defaultEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const formattedEndDate = defaultEndDate.toISOString().slice(0, 16)

      leadForm.value = {
        title: '',
        description: '',
        privateDetails: '',
        startPrice: '',
        minIncrement: 10,
        buyNowPrice: '',
        endsAt: formattedEndDate,
        postalCode: '',
        insuranceType: '',
        isActive: true,
        isShowcase: false
      }
      postalCodeSearch.value = ''
      postalCodeResults.value = []
    }
  } else if (mode === 'edit' && lead) {
    // Edit için mevcut lead verilerini yükle
    editingLead.value = lead
    leadForm.value = {
      title: lead.title,
      description: lead.description || '',
      privateDetails: lead.privateDetails || '',
      startPrice: lead.startPrice.toString(),
      minIncrement: lead.minIncrement.toString(),
      buyNowPrice: lead.instantBuyPrice ? lead.instantBuyPrice.toString() : '',
      endsAt: lead.endsAt ? new Date(lead.endsAt).toISOString().slice(0, 16) : '',
      isActive: lead.isActive,
      postalCode: lead.postalCode || '',
      insuranceType: lead.insuranceType || '',
      isShowcase: !!lead.isShowcase
    }
    // Posta kodu için sadece posta kodu numarasını göster
    postalCodeSearch.value = lead.postalCode || ''
  }
}

function closeLeadModal() {
  showLeadModal.value = false
  editingLead.value = null
  errorMessage.value = ''
  successMessage.value = ''
}

async function saveLead() {
  try {
    errorMessage.value = ''

    // Validation
    if (!leadForm.value.title.trim()) {
      errorMessage.value = 'Başlık gerekli'
      return
    }
    if (!leadForm.value.startPrice || parseFloat(leadForm.value.startPrice) <= 0) {
      errorMessage.value = 'Geçerli başlangıç fiyatı girin'
      return
    }
    if (!leadForm.value.minIncrement || parseFloat(leadForm.value.minIncrement) <= 0) {
      errorMessage.value = 'Geçerli minimum artış girin'
      return
    }
    if (!leadForm.value.endsAt) {
      errorMessage.value = 'Bitiş tarihi gerekli'
      return
    }

    // datetime-local input'u lokal saati verir, biz de onu olduğu gibi backend'e göndermeliyiz
    // Backend'de createDate() ile parse edildiğinde doğru timezone'da yorumlanacak
    const leadData = {
      ...leadForm.value,
      privateDetails: leadForm.value.privateDetails || undefined,
      postalCode: leadForm.value.postalCode || undefined,
      startPrice: parseFloat(leadForm.value.startPrice),
      minIncrement: parseFloat(leadForm.value.minIncrement),
      instantBuyPrice: leadForm.value.buyNowPrice ? parseFloat(leadForm.value.buyNowPrice) : null,
      insuranceType: leadForm.value.insuranceType || undefined,
      endsAt: leadForm.value.endsAt, // datetime-local değerini olduğu gibi gönder
      isShowcase: !!leadForm.value.isShowcase
    }

    if (modalMode.value === 'new') {
      // Yeni lead oluştur
      await axios.post('/api/leads', leadData, { headers: authHeaders() })
      successMessage.value = 'Lead başarıyla oluşturuldu!'
    } else {
      // Mevcut lead'i güncelle
      await axios.put(`/api/leads/${editingLead.value.id}`, leadData, { headers: authHeaders() })
      successMessage.value = 'Lead başarıyla güncellendi!'
    }

    await fetchMine()

    setTimeout(() => {
      closeLeadModal()
    }, 1500)

  } catch (error) {
    let backendMessage = ''

    if (error.response?.data) {
      // Eğer message alanı varsa onu kullan
      if (error.response.data.message) {
        backendMessage = error.response.data.message
      }
      // Eğer error alanı varsa onu kullan
      else if (error.response.data.error) {
        backendMessage = error.response.data.error
        // Eğer issues varsa onları da ekle
        if (error.response.data.issues && error.response.data.issues.length > 0) {
          const issueMessages = error.response.data.issues.map(issue => issue.message).join(', ')
          backendMessage += `: ${issueMessages}`
        }
      }
    }

    errorMessage.value = backendMessage
      ? `Lead ${modalMode.value === 'new' ? 'oluşturulamadı' : 'güncellenemedi'}: ${backendMessage}`
      : `Lead ${modalMode.value === 'new' ? 'oluşturulamadı' : 'güncellenemedi'}`
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

// Görünüm tipini değiştir
function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'table' : 'grid'
  localStorage.setItem('adminLeadViewMode', viewMode.value)
}

// Harita görünürlüğünü değiştir (composable'dan geliyor)

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
  await ensureZipcodesLoaded()
  initMap()
  updateMapMarkers(filteredLeads.value, settings.value, getInsuranceTypeIconifyName, formatPrice)
  
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
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
  document.removeEventListener('click', handleClickOutside)
  cleanup()
})

// Harita güncellemelerini izle
watch(filteredLeads, () => {
  if (showMap.value) {
    updateMapMarkers(filteredLeads.value, settings.value, getInsuranceTypeIconifyName, formatPrice)
  }
})

// Harita görünürlüğü değiştiğinde marker'ları güncelle
watch(showMap, (newValue) => {
  if (newValue) {
    // Harita açıldığında marker'ları güncelle
    setTimeout(() => {
      updateMapMarkers(filteredLeads.value, settings.value, getInsuranceTypeIconifyName, formatPrice)
    }, 100)
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
          <button class="view-toggle-btn" @click="toggleMapVisibility" :title="showMap ? 'Haritayı Gizle' : 'Haritayı Göster'">
            <Icon v-if="showMap" icon="mdi:map-marker" width="20" height="20" />
            <Icon v-else icon="mdi:map-marker-off" width="20" height="20" />
          </button>
          <button class="view-toggle-btn" @click="toggleViewMode" :title="viewMode === 'grid' ? 'Tablo Görünümü' : 'Kart Görünümü'">
            <Icon v-if="viewMode === 'grid'" icon="mdi:view-list" width="20" height="20" />
            <Icon v-else icon="mdi:view-grid" width="20" height="20" />
          </button>
          <button class="btn btn-outline" @click="toggleFilters">
            <Icon icon="mdi:filter" width="20" height="20" />
            Filtreler
          </button>
          <button class="btn btn-primary btn-large" @click="openLeadModal('new')">
            <Icon icon="mdi:plus" width="20" height="20" />
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

    <!-- Harita: filtrelenen leadlerin posta kodlarına göre pinler -->
    <div v-if="showMap" class="map-container">
      <div ref="mapRoot" class="leads-map"></div>
    </div>

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
    
    <!-- Tablo Görünümü -->
    <div v-else-if="viewMode === 'table'" class="table-view">
      <table class="leads-table">
        <thead>
          <tr>
            <th>Lead</th>
            <th>Sigorta Tipi</th>
            <th>Başlangıç Fiyatı</th>
            <th>Güncel Teklif</th>
            <th>Anında Al</th>
            <th>Teklif Sayısı</th>
            <th>Durum</th>
            <th>Sahip</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lead in filteredLeads" :key="lead.id" class="table-row" :class="{ 'sold-row': lead.sale }">
            <td class="lead-cell">
              <div class="lead-info">
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
                <span class="start-price">{{ formatPrice(lead.startPrice, settings.defaultCurrency) }}</span>
              </div>
            </td>
            <td>
              <div class="price-cell">
                <span class="current-price">
                  {{ formatPrice(lead.bids?.[0]?.amount || lead.startPrice, settings.defaultCurrency) }}
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
              <span class="bid-count">{{ lead.bids?.length || 0 }}</span>
            </td>
            <td>
              <span class="status-badge-table" :class="lead.sale ? 'sold' : (lead.isActive ? 'active' : 'inactive')">
                {{ lead.sale ? 'Satıldı' : (lead.isActive ? 'Aktif' : 'Pasif') }}
              </span>
            </td>
            <td>
              <span class="owner-text">{{ lead.owner?.email || 'Sahip yok' }}</span>
            </td>
            <td>
              <div class="table-actions">
                <button class="table-btn primary" @click="viewLeadDetails(lead.id)">
                  Detay
                </button>
                <button v-if="!lead.sale" class="table-btn secondary" @click="openLeadModal('edit', lead)">
                  Düzenle
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grid Görünümü -->
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
              <Icon icon="mdi:eye" width="14" height="14" />
              Detay
            </button>
            <button v-if="!lead.sale" class="btn btn-secondary" @click="openLeadModal('edit', lead)">
              <Icon icon="mdi:pencil" width="14" height="14" />
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
          <div class="sale-payment-info">
            <span class="payment-method-badge" :class="lead.sale.paymentMethod">
              {{ lead.sale.paymentMethod === 'balance' ? 'Bakiye' : 'IBAN' }}
            </span>
            <div v-if="lead.sale.paymentMethod === 'balance' && lead.sale.balanceBefore !== null && lead.sale.balanceAfter !== null" class="balance-info">
              <span class="balance-before">Öncesi: {{ formatPrice(lead.sale.balanceBefore, settings.defaultCurrency) }}</span>
              <span class="balance-after">Sonrası: {{ formatPrice(lead.sale.balanceAfter, settings.defaultCurrency) }}</span>
            </div>
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

    <!-- Unified Lead Modal (New/Edit) -->
    <div v-if="showLeadModal" class="modal-backdrop" @click="closeLeadModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ modalMode === 'new' ? 'Yeni Lead Oluştur' : 'Lead Düzenle' }}</h3>
          <button class="modal-close" @click="closeLeadModal">×</button>
        </div>

        <div class="modal-body">
          <!-- Formleadport Entegrasyonu -->
          <div class="form-group full-width" style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <label style="margin-bottom: 8px; font-weight: 600; color: #1e293b;">Formleadport Form Numarası (Opsiyonel)</label>
            <div style="display: flex; gap: 8px; align-items: end;">
              <input 
                v-model="formleadportFormId" 
                type="text" 
                class="form-input" 
                placeholder="Örn: 123456" 
                maxlength="6"
                @keyup.enter="fetchFormleadportData"
                style="flex: 1;"
              />
              <button 
                type="button"
                class="btn btn-primary" 
                @click="fetchFormleadportData" 
                :disabled="isLoadingFormData"
                style="background: #3b82f6; color: white; white-space: nowrap; padding: 8px 16px;"
              >
                {{ isLoadingFormData ? 'Yükleniyor...' : 'Getir' }}
              </button>
            </div>
            <div v-if="formleadportError" style="color: #ef4444; font-size: 0.875rem; margin-top: 8px;">
              {{ formleadportError }}
            </div>
          </div>

          <!-- Tek sütun: Başlık -->
          <div class="form-group full-width">
            <label>Başlık *</label>
            <input v-model="leadForm.title" type="text" class="form-input" placeholder="Lead başlığı" required />
          </div>

          <!-- İki sütun: Sigorta Türü ve Posta Kodu -->
          <div class="form-row">
            <div class="form-group">
              <label>Sigorta Türü</label>
              <select v-model="leadForm.insuranceType" class="form-input">
                <option value="">Sigorta türü seçin</option>
                <option v-for="type in insuranceTypes" :key="type.name" :value="type.name">{{ type.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Posta Kodu</label>
              <div class="postal-code-container">
                <input 
                  v-model="postalCodeSearch" 
                  type="text" 
                  class="form-input" 
                  placeholder="Posta kodu veya şehir adı yazın..." 
                  @input="onPostalCodeInput"
                  @focus="onPostalCodeFocus"
                  @blur="onPostalCodeBlur"
                  @keydown="onPostalCodeKeydown"
                />
                <div v-if="showPostalCodeDropdown && postalCodeResults.length > 0" ref="postalCodeDropdownRef" class="postal-code-dropdown">
                  <div 
                    v-for="(zipcode, index) in postalCodeResults" 
                    :key="zipcode.postal"
                    :class="['postal-code-item', { 'selected': index === selectedPostalCodeIndex }]"
                    @mousedown="selectPostalCode(zipcode)"
                  >
                    {{ zipcode.display }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tek sütun: Açıklama -->
          <div class="form-group full-width">
            <label>Açıklama *</label>
            <textarea v-model="leadForm.description" class="form-textarea" placeholder="Lead açıklaması" rows="3" required></textarea>
          </div>

          <!-- Tek sütun: Private Details -->
          <div class="form-group full-width">
            <label>Lead Detayları (Sadece Satın Alan Görür)</label>
            <textarea v-model="leadForm.privateDetails" class="form-textarea" placeholder="Satın alan kişinin göreceği detay bilgileri girin" rows="4"></textarea>
            <small class="form-help">Bu alan sadece leadi satın alan kişi, lead sahibi ve adminler tarafından görülebilir.</small>
          </div>

          <!-- İki sütun: Fiyatlar -->
          <div class="form-row">
            <div class="form-group">
              <label>Başlangıç Fiyatı ({{ getCurrencySymbol(settings.defaultCurrency) }}) *</label>
              <input v-model="leadForm.startPrice" type="number" class="form-input" placeholder="0" min="0" step="1" required />
            </div>
            <div class="form-group">
              <label>Minimum Artış ({{ getCurrencySymbol(settings.defaultCurrency) }}) *</label>
              <input v-model="leadForm.minIncrement" type="number" class="form-input" placeholder="0" min="0" step="1" required />
            </div>
          </div>

          <!-- İki sütun: Anında Al ve Bitiş Tarihi -->
          <div class="form-row">
            <div class="form-group">
              <label>Anında Satın Alma Fiyatı ({{ getCurrencySymbol(settings.defaultCurrency) }})</label>
              <input v-model="leadForm.buyNowPrice" type="number" class="form-input" placeholder="Opsiyonel" min="0" step="1" />
              <small class="form-help">Anında satın alma fiyatı</small>
            </div>
            <div class="form-group">
              <label>Bitiş Tarihi *</label>
              <input v-model="leadForm.endsAt" type="datetime-local" class="form-input" required />
            </div>
          </div>

          <!-- Edit modunda: İki sütun: Vitrin ve Aktif Durumu -->
          <!-- New modunda: Tek sütun: Sadece Vitrin -->
          <div v-if="modalMode === 'edit'" class="form-row">
            <div class="form-group toggle-field">
              <label>Vitrine Ekle</label>
              <div class="toggle-container">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="leadForm.isShowcase" />
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">{{ leadForm.isShowcase ? 'Açık' : 'Kapalı' }}</span>
              </div>
              <small class="toggle-help">Vitrine alınan leadler ana sayfada öne çıkar.</small>
            </div>
            <div class="form-group toggle-field">
              <label>Lead aktif</label>
              <div class="toggle-container">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="leadForm.isActive" />
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">{{ leadForm.isActive ? 'Açık' : 'Kapalı' }}</span>
              </div>
              <small class="toggle-help">Görülebilir ve teklif verilebilir.</small>
            </div>
          </div>

          <div v-else class="form-group toggle-field full-width">
            <label>Vitrine Ekle</label>
            <div class="toggle-container">
              <label class="toggle-switch">
                <input type="checkbox" v-model="leadForm.isShowcase" />
                <span class="toggle-slider"></span>
              </label>
              <span class="toggle-label">{{ leadForm.isShowcase ? 'Açık' : 'Kapalı' }}</span>
            </div>
            <small class="toggle-help">Vitrine alınan leadler ana sayfanın vitrin bölümünde öne çıkarılır.</small>
          </div>

          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
          <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeLeadModal">İptal</button>
          <button class="btn btn-primary" @click="saveLead">
            {{ modalMode === 'new' ? 'Oluştur' : 'Güncelle' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Form Önizleme Modalı -->
    <div v-if="showFormPreview" class="modal-backdrop" @click="closeFormPreview">
      <div class="modal" @click.stop style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
        <div class="modal-header">
          <h3>📋 Formleadport Verileri Önizleme</h3>
          <button @click="closeFormPreview" class="modal-close">&times;</button>
        </div>
        
        <div class="modal-body" v-if="formleadportData">
          <div class="form-preview">
            <div class="preview-section">
              <h4>👤 Müşteri Bilgileri</h4>
              <div class="preview-grid">
                <div><strong>Ad Soyad:</strong> {{ formleadportData.musteri_isim }} {{ formleadportData.musteri_soyisim }}</div>
                <div><strong>Cinsiyet:</strong> {{ formleadportData.musteri_cinsiyet || 'Belirtilmemiş' }}</div>
                <div><strong>Doğum Tarihi:</strong> {{ formleadportData.musteri_dogum_tarihi || 'Belirtilmemiş' }}</div>
                <div><strong>Email:</strong> {{ formleadportData.email || 'Belirtilmemiş' }}</div>
                <div><strong>Telefon:</strong> {{ formleadportData.telefon || 'Belirtilmemiş' }}</div>
                <div><strong>Sabit Telefon:</strong> {{ formleadportData.sabit_telefon || 'Belirtilmemiş' }}</div>
              </div>
            </div>
            
            <div class="preview-section">
              <h4>🏢 Firma Bilgileri</h4>
              <div class="preview-grid">
                <div><strong>Firma Adı:</strong> {{ formleadportData.firma_adi }}</div>
                <div><strong>Adres:</strong> {{ formleadportData.adres || 'Belirtilmemiş' }}</div>
                <div><strong>Şehir:</strong> {{ formleadportData.sehir || 'Belirtilmemiş' }}</div>
                <div><strong>Posta Kodu:</strong> {{ formleadportData.posta_kodu || 'Belirtilmemiş' }}</div>
              </div>
            </div>
            
            <div class="preview-section">
              <h4>📅 Randevu Bilgileri</h4>
              <div class="preview-grid">
                <div><strong>Randevu Tarihi:</strong> {{ formleadportData.randevu_tarihi || 'Belirtilmemiş' }}</div>
                <div><strong>Randevu Tipi:</strong> {{ formleadportData.randevu_tipi || 'Belirtilmemiş' }}</div>
              </div>
            </div>
            
            <div class="preview-section">
              <h4>🏥 Sigorta Bilgileri</h4>
              <div class="preview-grid">
                <div><strong>Sigorta Türü:</strong> {{ formleadportData.sigorta || 'Belirtilmemiş' }}</div>
                <div><strong>Sigorta Şirketi:</strong> {{ formleadportData.sigorta_sirket || 'Belirtilmemiş' }}</div>
                <div><strong>Sigorta Başlangıç:</strong> {{ formleadportData.sigorta_baslangic_tarihi || 'Belirtilmemiş' }}</div>
                <div><strong>Katkı Payı:</strong> {{ formleadportData.sigorta_katki_payi || 'Belirtilmemiş' }}</div>
              </div>
            </div>
            
            <div class="preview-section">
              <h4>👨‍👩‍👧‍👦 Kişisel Bilgiler</h4>
              <div class="preview-grid">
                <div><strong>Medeni Durum:</strong> {{ formleadportData.medeni_durum || 'Belirtilmemiş' }}</div>
                <div><strong>Çalışma Durumu:</strong> {{ formleadportData.calisma_durumu || 'Belirtilmemiş' }}</div>
                <div><strong>Çocuk Sayısı:</strong> {{ formleadportData.aile_cocuk_sayisi || 'Belirtilmemiş' }}</div>
                <div><strong>Eş Yaşı:</strong> {{ formleadportData.es_yasi || 'Belirtilmemiş' }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeFormPreview" class="btn btn-secondary">İptal</button>
          <button @click="useFormleadportData" class="btn btn-primary">Bu Verileri Kullan</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Kompakt grid düzeni - 2'li düzen */
.leads-grid-compact {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
  padding: 24px;
  margin: 24px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
}

.filters-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
  margin-bottom: 4px;
}

.filter-input,
.filter-select {
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
  background: white;
  width: 100%;
  box-sizing: border-box;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.price-range,
.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.price-range input,
.date-range input {
  flex: 1;
  min-width: 0;
}

.price-range span,
.date-range span {
  color: #6b7280;
  font-weight: 500;
  font-size: 14px;
}

.filter-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
  margin-top: 16px;
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
    padding: 20px;
    margin: 20px 0;
  }
  
  .filters-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .filter-group {
    width: 100%;
  }

  .price-range span,
  .date-range span {
    display: none;
  }
  
  .filter-actions {
    justify-content: center;
    margin-top: 16px;
    width: 100%;
  }
  
  .filter-actions .btn {
    min-width: 120px;
    flex: 1;
  }
  
  .price-range,
  .date-range {
    flex-direction: column;
    gap: 8px;
  }
  
  .price-range input,
  .date-range input {
    width: 100%;
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

/* Modal genişliği ve form düzeni */
.modal {
  max-width: 700px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-help {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--primary);
}

/* Responsive modal */
@media (max-width: 768px) {
  .modal {
    max-width: 95vw;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Posta kodu dropdown stilleri */
.postal-code-container {
  position: relative;
  width: 100%;
}

.postal-code-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 2px;
}

.postal-code-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
  font-size: 14px;
  color: #374151;
}

.postal-code-item:hover,
.postal-code-item.selected {
  background-color: #f9fafb;
}

.postal-code-item.selected {
  background-color: #e5f3ff;
  border-left: 3px solid #3b82f6;
}

.postal-code-item:last-child {
  border-bottom: none;
}

.postal-code-item:first-child {
  border-radius: 8px 8px 0 0;
}

.postal-code-item:last-child {
  border-radius: 0 0 8px 8px;
}

.postal-code-item:only-child {
  border-radius: 8px;
}

/* Mobil uyumluluk */
@media (max-width: 768px) {
  .postal-code-dropdown {
    max-height: 150px;
  }
  
  .postal-code-item {
    padding: 10px 12px;
    font-size: 13px;
  }
}

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

/* View Toggle Button */
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

.leads-table tbody tr.sold-row {
  opacity: 0.7;
  background: #f0fdf4;
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

.start-price {
  font-weight: 600;
  color: #6b7280;
  font-size: 0.875rem;
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
  background: #dbeafe;
  color: #1e40af;
}

.status-badge-table.inactive {
  background: #f3f4f6;
  color: #6b7280;
}

.status-badge-table.sold {
  background: #dcfce7;
  color: #047857;
}

.owner-text {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
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

.table-btn.primary:hover {
  background: #111827;
}

.table-btn.secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.table-btn.secondary:hover {
  background: #e5e7eb;
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

  .table-actions {
    flex-direction: column;
    gap: 4px;
  }

  .table-btn {
    padding: 4px 8px;
    font-size: 0.6875rem;
  }
}

/* Form Önizleme Modal Stilleri */
.form-preview {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-section {
  background: #f8fafc;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.preview-section h4 {
  margin: 0 0 12px 0;
  color: #1e293b;
  font-size: 1rem;
}

.preview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.preview-grid div {
  font-size: 0.875rem;
  color: #475569;
}

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
  z-index: 2000;
}

.modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 600px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #64748b;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
}

.btn-secondary {
  background: #64748b;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #475569;
}

.btn-primary:hover {
  background: #2563eb;
}

/* Ödeme yöntemi ve bakiye stilleri */
.payment-method-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.payment-method-badge.balance {
  background: #dbeafe;
  color: #1e40af;
}

.payment-method-badge.iban {
  background: #fef3c7;
  color: #d97706;
}

.sale-payment-info {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.balance-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.75rem;
}

.balance-before {
  color: #6b7280;
}

.balance-after {
  color: #059669;
  font-weight: 600;
}
</style>
