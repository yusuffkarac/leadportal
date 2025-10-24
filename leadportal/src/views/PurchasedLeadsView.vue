<template>
  <div class="purchased-leads-page">
    <div class="page-content">
      <div class="page-header">
        <h1>Satın Aldığım Lead'ler</h1>
      </div>

      <!-- Stats Section -->
      <div class="stats-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ purchasedLeads.length }}</div>
              <div class="stat-label">Toplam Satın Alınan</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatPrice(totalSpent, settings.defaultCurrency) }}</div>
              <div class="stat-label">Toplam Harcama</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 19c-5 0-7-2-7-5s2-5 7-5 7 2 7 5-2 5-7 5z"/>
                <path d="M9 9c-5 0-7-2-7-5s2-5 7-5 7 2 7 5-2 5-7 5z"/>
                <path d="M23 19v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatPrice(averagePrice, settings.defaultCurrency) }}</div>
              <div class="stat-label">Ortalama Fiyat</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Search and Filter Section -->
      <div v-if="purchasedLeads.length > 0" class="search-filter-section">
        <div class="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Lead başlığı veya açıklamasında ara..."
            class="search-input"
          >
        </div>
        <div class="filter-controls">
          <button class="view-toggle-btn" @click="toggleMapVisibility" :title="showMap ? 'Haritayı Gizle' : 'Haritayı Göster'">
            <svg v-if="showMap" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
              <line x1="2" y1="2" x2="22" y2="22"/>
            </svg>
          </button>
          <button class="view-toggle-btn" @click="toggleViewMode" :title="viewMode === 'grid' ? 'Tablo Görünümü' : 'Kart Görünümü'">
            <svg v-if="viewMode === 'grid'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </button>
          <select v-model="sortBy" class="sort-select">
            <option value="date">Tarihe Göre</option>
            <option value="price">Fiyata Göre</option>
            <option value="title">Başlığa Göre</option>
          </select>
          <select v-model="sortOrder" class="sort-order">
            <option value="desc">Azalan</option>
            <option value="asc">Artan</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Lead'ler yükleniyor...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!purchasedLeads.length" class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <h3>Henüz satın aldığınız lead yok</h3>
        <p>Açık artırmalardan teklif vererek lead satın alabilirsiniz.</p>
        <RouterLink to="/" class="btn btn-primary">Açık Artırmalara Git</RouterLink>
      </div>

      <!-- Harita -->
      <div v-if="showMap" class="map-container">
        <div ref="mapRoot" class="leads-map"></div>
      </div>

      <!-- Tablo Görünümü -->
      <div v-if="viewMode === 'table'" class="table-view">
        <table class="purchased-leads-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Satın Alma Fiyatı</th>
              <th>Satıcı</th>
              <th>Satın Alma Tarihi</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in filteredAndSortedLeads" :key="sale.id" class="table-row">
              <td class="lead-cell">
                <div class="lead-info">
                  <div>
                    <div class="lead-title-text">{{ sale.lead.title }}</div>
                    <div class="lead-description-text">{{ sale.lead.description?.substring(0, 80) }}...</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="price-cell">
                  <span class="purchase-price">{{ formatPrice(sale.amount, settings.defaultCurrency) }}</span>
                </div>
              </td>
              <td>
                <span class="seller-text">{{ sale.lead.owner.email }}</span>
              </td>
              <td>
                <span class="date-text">{{ formatDate(sale.soldAt) }}</span>
              </td>
              <td>
                <div class="table-actions">
                  <button class="table-btn primary" @click="viewLeadDetails(sale.lead.id)">
                    Detay
                  </button>
                  <button class="table-btn secondary" @click="downloadLeadInfo(sale)" title="JSON İndir">
                    JSON
                  </button>
                  <button class="table-btn secondary" @click="() => downloadLeadAsPDF(sale)" title="PDF İndir">
                    PDF
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Grid Görünümü -->
      <div v-if="viewMode === 'grid'" class="purchased-leads-list">
        <div v-for="sale in filteredAndSortedLeads" :key="sale.id" class="purchased-lead-card" :data-lead-id="sale.lead.id">
          <div class="lead-header">
            <div class="lead-info">
              <h3 class="lead-title">{{ sale.lead.title }}</h3>
              <p class="lead-description">{{ sale.lead.description }}</p>
            </div>
            <div class="lead-status">
              <span class="status-badge sold">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                Satın Alındı
              </span>
            </div>
          </div>

          <div class="lead-details">
            <div class="detail-grid">
              <div class="detail-item">
                <div class="detail-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <div class="detail-content">
                  <span class="detail-label">Satın Alma Fiyatı</span>
                  <span class="detail-value price">{{ formatPrice(sale.amount, settings.defaultCurrency) }}</span>
                </div>
              </div>

              <div class="detail-item">
                <div class="detail-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div class="detail-content">
                  <span class="detail-label">Satıcı</span>
                  <span class="detail-value">{{ sale.lead.owner.email }}</span>
                </div>
              </div>

              <div class="detail-item">
                <div class="detail-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                </div>
                <div class="detail-content">
                  <span class="detail-label">Satın Alma Tarihi</span>
                  <span class="detail-value">{{ formatDate(sale.soldAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Özel detaylar: satın alınmış leadlerde backend görünürlüğü sağlıyor -->
          <div v-if="sale.lead.privateDetails" class="private-details">
            <div class="private-title">Satın Alanlara Özel Detaylar</div>
            <pre class="private-content">{{ sale.lead.privateDetails }}</pre>
          </div>

          <div class="lead-actions">
            <button class="btn btn-primary" @click="viewLeadDetails(sale.lead.id)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Detayları Görüntüle
            </button>
            <div class="action-buttons">
              <button class="btn btn-secondary" @click="downloadLeadInfo(sale)" title="JSON İndir">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                JSON
              </button>
              <button class="btn btn-secondary" @click="() => downloadLeadAsPDF(sale)" title="PDF İndir">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { formatPrice } from '@/utils/currency.js'
import { useMap } from '@/composables/useMap.js'
import jsPDF from 'jspdf'

const router = useRouter()
const purchasedLeads = ref([])
const loading = ref(true)
const settings = ref({ defaultCurrency: 'TRY' })
const searchQuery = ref('')
const sortBy = ref('date')
const sortOrder = ref('desc')

// Görünüm tipi (grid veya table)
const viewMode = ref(localStorage.getItem('purchasedLeadViewMode') || 'grid')

// Harita composable'ını kullan
const { showMap, mapRoot, toggleMapVisibility, ensureZipcodesLoaded, initMap, updateMapMarkers, cleanup } = useMap('purchasedLeads')

// Ayarları yükle
async function loadSettings() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const response = await axios.get('/api/settings', { 
      headers: { 'Authorization': `Bearer ${token}` }
    })
    settings.value = response.data
  } catch (error) {
    console.error('Ayarlar yüklenemedi:', error)
  }
}

// Computed properties
const totalSpent = computed(() => {
  return purchasedLeads.value.reduce((total, sale) => total + sale.amount, 0)
})

const averagePrice = computed(() => {
  if (purchasedLeads.value.length === 0) return 0
  return Math.round(totalSpent.value / purchasedLeads.value.length)
})

// Filtered and sorted leads
const filteredAndSortedLeads = computed(() => {
  let filtered = purchasedLeads.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(sale => 
      sale.lead.title.toLowerCase().includes(query) ||
      sale.lead.description.toLowerCase().includes(query) ||
      sale.lead.owner.email.toLowerCase().includes(query)
    )
  }

  // Sort
  filtered = [...filtered].sort((a, b) => {
    let aValue, bValue

    switch (sortBy.value) {
      case 'price':
        aValue = a.amount
        bValue = b.amount
        break
      case 'title':
        aValue = a.lead.title.toLowerCase()
        bValue = b.lead.title.toLowerCase()
        break
      case 'date':
      default:
        aValue = new Date(a.soldAt)
        bValue = new Date(b.soldAt)
        break
    }

    if (sortOrder.value === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  return filtered
})

// Methods
async function fetchPurchasedLeads() {
  try {
    loading.value = true
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    
    if (!token) {
      router.push('/login')
      return
    }

    const response = await axios.get('/api/lead-sales/purchased', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    purchasedLeads.value = response.data
  } catch (error) {
    console.error('Error fetching purchased leads:', error)
    if (error.response?.status === 401) {
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function viewLeadDetails(leadId) {
  router.push(`/lead/${leadId}`)
}

// Görünüm tipini değiştir
function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'table' : 'grid'
  localStorage.setItem('purchasedLeadViewMode', viewMode.value)
}

function downloadLeadInfo(sale) {
  const leadInfo = {
    title: sale.lead.title,
    description: sale.lead.description,
    purchasePrice: sale.amount,
    seller: sale.lead.owner.email,
    purchaseDate: formatDate(sale.soldAt),
    leadId: sale.lead.id
  }

  const dataStr = JSON.stringify(leadInfo, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `lead-${sale.lead.id}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function downloadLeadAsPDF(sale) {
  try {
    // Lead detaylarını ve teklifleri al
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const leadResponse = await axios.get(`/api/leads/${sale.lead.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const leadWithBids = leadResponse.data
    
    // Yeni PDF dokümanı oluştur
    const doc = new jsPDF()
    
    // Türkçe karakter desteği için font ayarları
    doc.setFont('helvetica')
    
    // Sayfa boyutları
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let yPosition = margin
    
    // Başlık - Almanca
    doc.setFontSize(20)
    doc.setTextColor(59, 130, 246) // #3b82f6
    doc.text('Lead Informationen', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15
    
    // Alt başlık - Almanca
    doc.setFontSize(12)
    doc.setTextColor(102, 102, 102) // #666
    doc.text('Gekaufte Lead Details', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 25
    
    // Çizgi
    doc.setDrawColor(59, 130, 246)
    doc.setLineWidth(2)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 20
    
    // Lead başlığı - Türkçe karakterleri temizle
    doc.setFontSize(16)
    doc.setTextColor(31, 41, 55) // #1f2937
    doc.setFont(undefined, 'bold')
    
    const cleanTitle = sale.lead.title
      .replace(/ç/g, 'c').replace(/Ç/g, 'C')
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    
    // Başlığı satırlara böl
    const titleLines = doc.splitTextToSize(cleanTitle, pageWidth - 2 * margin)
    doc.text(titleLines, margin, yPosition)
    yPosition += titleLines.length * 7 + 10
    
    // Lead açıklaması - Türkçe karakterleri temizle
    doc.setFontSize(12)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(107, 114, 128) // var(--primary)
    
    const cleanDescription = sale.lead.description
      .replace(/ç/g, 'c').replace(/Ç/g, 'C')
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    
    const descriptionLines = doc.splitTextToSize(cleanDescription, pageWidth - 2 * margin)
    doc.text(descriptionLines, margin, yPosition)
    yPosition += descriptionLines.length * 6 + 20
    
    // Satın alma bilgileri kutusu
    const boxY = yPosition
    const boxHeight = 80
    const boxWidth = pageWidth - 2 * margin
    
    // Kutu arka planı
    doc.setFillColor(248, 249, 250) // #f8f9fa
    doc.rect(margin, boxY, boxWidth, boxHeight, 'F')
    
    // Kutu kenarlığı
    doc.setDrawColor(229, 231, 235) // #e5e7eb
    doc.setLineWidth(1)
    doc.rect(margin, boxY, boxWidth, boxHeight)
    
    yPosition += 15
    
    // Kutu başlığı - Almanca
    doc.setFontSize(14)
    doc.setTextColor(31, 41, 55) // #1f2937
    doc.setFont(undefined, 'bold')
    doc.text('Kaufinformationen', margin + 10, yPosition)
    yPosition += 20
    
    // Bilgiler
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    
    // Kaufpreis - Almanca
    doc.setTextColor(55, 65, 81) // #374151
    doc.text('Kaufpreis:', margin + 10, yPosition)
    doc.setTextColor(5, 150, 105) // #059669
    doc.setFont(undefined, 'bold')
    doc.text(`€ ${sale.amount.toLocaleString()}`, margin + 60, yPosition)
    yPosition += 12
    
    // Verkäufer - Almanca
    doc.setTextColor(55, 65, 81) // #374151
    doc.setFont(undefined, 'normal')
    doc.text('Verkäufer:', margin + 10, yPosition)
    doc.setTextColor(107, 114, 128) // var(--primary)
    doc.text(sale.lead.owner.email, margin + 60, yPosition)
    yPosition += 12
    
    // Kaufdatum - Almanca
    doc.setTextColor(55, 65, 81) // #374151
    doc.text('Kaufdatum:', margin + 10, yPosition)
    doc.setTextColor(107, 114, 128) // var(--primary)
    
    // Tarihi temizle ve Almanca format
    const cleanDate = formatDate(sale.soldAt)
      .replace(/ç/g, 'c').replace(/Ç/g, 'C')
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    
    doc.text(cleanDate, margin + 60, yPosition)
    yPosition += 12
    
    // Lead ID - Almanca
    doc.setTextColor(55, 65, 81) // #374151
    doc.text('Lead ID:', margin + 10, yPosition)
    doc.setTextColor(107, 114, 128) // var(--primary)
    doc.text(sale.lead.id, margin + 60, yPosition)
    
    yPosition += 30
    
    // Teklifler bölümü - Almanca
    if (leadWithBids.bids && leadWithBids.bids.length > 0) {
      // Teklifler başlığı
      doc.setFontSize(14)
      doc.setTextColor(31, 41, 55) // #1f2937
      doc.setFont(undefined, 'bold')
      doc.text('Gebote (Angebote)', margin, yPosition)
      yPosition += 15
      
      // Teklifler tablosu
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      
      // Tablo başlıkları
      doc.setTextColor(55, 65, 81) // #374151
      doc.setFont(undefined, 'bold')
      doc.text('Rang', margin, yPosition)
      doc.text('Betrag', margin + 30, yPosition)
      doc.text('Bieter', margin + 80, yPosition)
      doc.text('Datum', margin + 140, yPosition)
      yPosition += 6
      
      // Çizgi
      doc.setDrawColor(229, 231, 235) // #e5e7eb
      doc.setLineWidth(0.5)
      doc.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 6
      
      // Teklifler listesi
      doc.setFont(undefined, 'normal')
      leadWithBids.bids.forEach((bid, index) => {
        // Sayfa kontrolü
        if (yPosition > pageHeight - 40) {
          doc.addPage()
          yPosition = margin
        }
        
        // Rang (Sıra)
        doc.setTextColor(107, 114, 128) // var(--primary)
        doc.text(`${index + 1}.`, margin, yPosition)
        
        // Betrag (Miktar)
        doc.setTextColor(5, 150, 105) // #059669
        doc.setFont(undefined, 'bold')
        doc.text(`€ ${bid.amount.toLocaleString()}`, margin + 30, yPosition)
        
        // Bieter (Teklif Veren)
        doc.setTextColor(107, 114, 128) // var(--primary)
        doc.setFont(undefined, 'normal')
        const bidderEmail = bid.user?.email || 'Anonym'
        doc.text(bidderEmail, margin + 80, yPosition)
        
        // Datum (Tarih)
        const bidDate = new Date(bid.createdAt)
        const dateStr = `${bidDate.getDate()}.${bidDate.getMonth() + 1}.${bidDate.getFullYear()} ${bidDate.getHours()}:${bidDate.getMinutes().toString().padStart(2, '0')}`
        doc.text(dateStr, margin + 140, yPosition)
        
        yPosition += 10
      })
      
      yPosition += 15
    }
    
    // Alt bilgi çizgisi
    doc.setDrawColor(229, 231, 235) // #e5e7eb
    doc.setLineWidth(1)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 15
    
    // Alt bilgi - Almanca
    doc.setFontSize(10)
    doc.setTextColor(156, 163, 175) // #9ca3af
    doc.text('Dieses Dokument wurde automatisch vom Lead Portal System erstellt.', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 8
    
    // Erstellungsdatum - basit format
    const now = new Date()
    const simpleDate = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`
    doc.text(`Erstellungsdatum: ${simpleDate}`, pageWidth / 2, yPosition, { align: 'center' })
    
    // PDF'i indir
    doc.save(`lead-${sale.lead.id}.pdf`)
    
    console.log('PDF başarıyla oluşturuldu')
    
  } catch (error) {
    console.error('PDF oluşturma hatası:', error)
    alert('PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.')
  }
}

onMounted(async () => {
  await loadSettings()
  await fetchPurchasedLeads()
  await ensureZipcodesLoaded()
  initMap()
  // Satın alınan lead'ler için harita marker'larını güncelle
  if (showMap.value) {
    updateMapMarkers(filteredAndSortedLeads.value, settings.value, () => 'mdi:file', formatPrice)
  }
})

// Harita güncellemelerini izle
watch(filteredAndSortedLeads, () => {
  if (showMap.value) {
    updateMapMarkers(filteredAndSortedLeads.value, settings.value, () => 'mdi:file', formatPrice)
  }
})

// Harita görünürlüğü değiştiğinde marker'ları güncelle
watch(showMap, (newValue) => {
  if (newValue) {
    // Harita açıldığında marker'ları güncelle
    setTimeout(() => {
      updateMapMarkers(filteredAndSortedLeads.value, settings.value, () => 'mdi:file', formatPrice)
    }, 100)
  }
})
</script>

<style scoped>
.purchased-leads-page {
  min-height: 100vh;
  background: #f8f9fa;
}

.page-header {
  text-align: center;
  margin-bottom: 60px;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16px;
}

.page-subtitle {
  font-size: 1.125rem;
  color: var(--primary);
  max-width: 600px;
  margin: 0 auto;
}

/* Stats Section */
.stats-section {
  margin-bottom: 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: #f8fafc;
  border-radius: 10px;
  color: var(--text);
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

/* Search and Filter Section */
.search-filter-section {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 300px;
}

.search-box svg {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--text);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.sort-select,
.sort-order {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-select:focus,
.sort-order:focus {
  outline: none;
  border-color: var(--text);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 80px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid var(--text);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  color: #9ca3af;
  margin-bottom: 24px;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
}

.empty-state p {
  color: var(--primary);
  margin-bottom: 32px;
}

/* Purchased Leads List */
.purchased-leads-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.purchased-lead-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.purchased-lead-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.lead-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.lead-info {
  flex: 1;
}

.lead-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 6px;
  line-height: 1.3;
}

.lead-description {
  color: #64748b;
  line-height: 1.5;
  font-size: 0.875rem;
}

.lead-status {
  margin-left: 20px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.sold {
  background: #dcfce7;
  color: #166534;
}

.lead-details {
  margin-bottom: 20px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
  min-height: 60px;
}

.detail-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: white;
  border-radius: 8px;
  color: #64748b;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.detail-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.detail-label {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.2;
}

.detail-value {
  display: block;
  font-weight: 600;
  color: #1e293b;
  font-size: 0.875rem;
  word-break: break-word;
  line-height: 1.3;
}

.detail-value.price {
  color: #059669;
  font-size: 1rem;
  font-weight: 700;
}

.lead-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.private-details {
  margin-top: 16px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 1rem;
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

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  white-space: nowrap;
}

.btn-primary {
  background: var(--text);
  color: white;
  min-width: 160px;
  justify-content: center;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  font-size: 0.75rem;
}

.btn-secondary:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

/* Responsive */
@media (max-width: 768px) {
  .page-header h1 {
    font-size: 2rem;
  }
  
  .page-subtitle {
    font-size: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .stat-card {
    padding: 20px;
  }
  
  .search-filter-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .filter-controls {
    justify-content: space-between;
  }
  
  .sort-select,
  .sort-order {
    flex: 1;
  }
  
  .lead-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .lead-status {
    margin-left: 0;
    align-self: flex-start;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .lead-actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .action-buttons {
    margin-left: 0;
    justify-content: center;
  }
  
  .btn-primary {
    min-width: auto;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .purchased-leads-page {
    padding: 0 16px;
  }
  
  .page-header {
    margin-bottom: 32px;
  }
  
  .page-header h1 {
    font-size: 1.75rem;
  }
  
  .purchased-lead-card {
    padding: 20px;
  }
  
  .stat-card {
    padding: 16px;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
  }
  
  .stat-value {
    font-size: 1.5rem;
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
  border: 1px solid #e2e8f0;
  overflow: hidden;
  position: relative;
  z-index: 0;
}

/* View Toggle Button */
.view-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;
}

.view-toggle-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #475569;
}

/* Tablo Görünümü */
.table-view {
  overflow-x: auto;
  background: white;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.purchased-leads-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.purchased-leads-table thead {
  background: #f8fafc;
  border-bottom: 2px solid #f1f5f9;
}

.purchased-leads-table th {
  padding: 16px 20px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.purchased-leads-table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s ease;
}

.purchased-leads-table tbody tr:hover {
  background: #f8fafc;
}

.purchased-leads-table td {
  padding: 16px 20px;
  color: #1e293b;
  vertical-align: middle;
}

.lead-cell {
  min-width: 300px;
  max-width: 400px;
}

.lead-info {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.lead-title-text {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
  line-height: 1.3;
  font-size: 0.9375rem;
}

.lead-description-text {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.4;
}

.price-cell {
  text-align: left;
}

.purchase-price {
  font-weight: 700;
  color: #059669;
  font-size: 1rem;
}

.seller-text {
  font-size: 0.875rem;
  color: #475569;
  font-weight: 500;
}

.date-text {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.table-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
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
  background: #1e293b;
  color: white;
}

.table-btn.primary:hover {
  background: #0f172a;
}

.table-btn.secondary {
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.table-btn.secondary:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

/* Tablo Responsive */
@media (max-width: 1200px) {
  .purchased-leads-table {
    font-size: 0.8125rem;
  }

  .purchased-leads-table th,
  .purchased-leads-table td {
    padding: 12px 16px;
  }

  .lead-cell {
    min-width: 250px;
    max-width: 350px;
  }
}

@media (max-width: 768px) {
  .table-view {
    border-radius: 8px;
  }

  .purchased-leads-table {
    font-size: 0.75rem;
  }

  .purchased-leads-table th,
  .purchased-leads-table td {
    padding: 10px 12px;
  }

  .lead-description-text {
    display: none;
  }

  .table-actions {
    flex-direction: column;
    gap: 4px;
  }

  .table-btn {
    padding: 4px 8px;
    font-size: 0.6875rem;
  }

  .view-toggle-btn {
    padding: 10px;
  }
}
</style>
