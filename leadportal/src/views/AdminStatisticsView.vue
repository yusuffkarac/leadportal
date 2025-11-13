<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '@/utils/axios.js'
import { formatPrice } from '@/utils/currency.js'
import LineChart from '@/components/charts/LineChart.vue'
import BarChart from '@/components/charts/BarChart.vue'

const statistics = ref(null)
const settings = ref({ defaultCurrency: 'EUR' })
const isLoading = ref(true)
const error = ref('')

// Accordion durumları için localStorage key
const STORAGE_KEY = 'admin-statistics-sections'

// Kategoriler ve açık/kapalı durumları
const categories = ref([
  { id: 'general', title: 'Genel Metrikler', isOpen: true },
  { id: 'sales', title: 'Satış Analizi', isOpen: true },
  { id: 'bids', title: 'Teklif ve İhale Analizi', isOpen: true },
  { id: 'financial', title: 'Finansal Analiz', isOpen: true },
  { id: 'activity', title: 'Kullanıcı Aktivitesi', isOpen: true },
  { id: 'feedback', title: 'Geri Bildirimler', isOpen: true }
])

// localStorage'dan durumu yükle
function loadSectionStates() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const states = JSON.parse(saved)
      categories.value.forEach(category => {
        if (states[category.id] !== undefined) {
          category.isOpen = states[category.id]
        }
      })
    }
  } catch (err) {
    console.error('Bölüm durumları yüklenemedi:', err)
  }
}

// localStorage'a durumu kaydet
function saveSectionStates() {
  try {
    const states = {}
    categories.value.forEach(category => {
      states[category.id] = category.isOpen
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states))
  } catch (err) {
    console.error('Bölüm durumları kaydedilemedi:', err)
  }
}

// Bölüm aç/kapa
function toggleSection(categoryId) {
  const category = categories.value.find(c => c.id === categoryId)
  if (category) {
    category.isOpen = !category.isOpen
    saveSectionStates()
  }
}

// Bölüm durumlarını izle ve kaydet
watch(() => categories.value.map(c => ({ id: c.id, isOpen: c.isOpen })), () => {
  saveSectionStates()
}, { deep: true })

onMounted(() => {
  loadSectionStates()
  loadStatistics()
})

// Chart data computed properties
const salesTrendChartData = computed(() => {
  if (!statistics.value?.salesTrend) return null

  return {
    labels: statistics.value.salesTrend.map(d => {
      const date = new Date(d.date)
      return `${date.getDate()}/${date.getMonth() + 1}`
    }),
    datasets: [
      {
        label: 'Satışlar',
        data: statistics.value.salesTrend.map(d => d.count),
        borderColor: '#1d4ed8',
        backgroundColor: 'rgba(29, 78, 216, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Gelir',
        data: statistics.value.salesTrend.map(d => d.revenue),
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  }
})

const hourlyActivityChartData = computed(() => {
  if (!statistics.value?.userEngagement?.hourlyActivity) return null

  return {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Aktivite',
        data: statistics.value.userEngagement.hourlyActivity,
        backgroundColor: 'rgba(29, 78, 216, 0.6)',
        borderColor: '#1d4ed8',
        borderWidth: 1
      }
    ]
  }
})

const revenueComparisonChartData = computed(() => {
  if (!statistics.value?.financialComparison) return null

  const fc = statistics.value.financialComparison
  return {
    labels: ['Bu Hafta', 'Geçen Hafta', 'Bu Ay', 'Geçen Ay'],
    datasets: [
      {
        label: 'Gelir',
        data: [
          fc.thisWeek.revenue,
          fc.lastWeek.revenue,
          fc.thisMonth.revenue,
          fc.lastMonth.revenue
        ],
        backgroundColor: ['#1d4ed8', '#60a5fa', '#059669', '#34d399'],
        borderWidth: 0
      }
    ]
  }
})

async function loadStatistics() {
  isLoading.value = true
  error.value = ''

  try {
    const [statsRes, settingsRes] = await Promise.all([
      api.get('/statistics'),
      api.get('/settings/branding')
    ])

    statistics.value = statsRes.data
    settings.value.defaultCurrency = settingsRes.data?.defaultCurrency || 'EUR'
  } catch (err) {
    console.error('İstatistikler yüklenemedi:', err)
    error.value = 'İstatistikler yüklenirken bir hata oluştu.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadStatistics()
})
</script>

<template>
  <div class="admin-statistics">
    <div class="page-header">
      <div class="header-left">
        <h1>Platform İstatistikleri</h1>
        <p class="subtitle">Detaylı performans metrikleri ve analiz</p>
      </div>
      <button class="refresh-btn" @click="loadStatistics" :disabled="isLoading">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
        Yenile
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>İstatistikler yükleniyor...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
      <button @click="loadStatistics" class="retry-btn">Tekrar Dene</button>
    </div>

    <div v-else class="statistics-content">
      <!-- Accordion Kategoriler -->
      
      <!-- Genel Metrikler -->
      <div class="accordion-section">
        <div class="accordion-header" @click="toggleSection('general')">
          <div class="accordion-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>{{ categories.find(c => c.id === 'general')?.title }}</span>
          </div>
          <svg 
            class="accordion-icon" 
            :class="{ 'open': categories.find(c => c.id === 'general')?.isOpen }"
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div v-show="categories.find(c => c.id === 'general')?.isOpen" class="accordion-content">
          <!-- Üst Metrikler -->
          <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Toplam Kullanıcılar</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="metric-value">{{ statistics.totalUsers?.toLocaleString() || '0' }}</div>
          <div class="metric-detail">
            <span class="detail-label">Aktif Kullanıcılar:</span>
            <span class="detail-value">{{ statistics.activeUsers || 0 }}</span>
          </div>
          <div class="metric-footer">
            <span class="badge badge-success">+{{ statistics.newUsersLast24h || 0 }}</span>
            <span class="footer-text">Son 24 saat</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Bugün Satılan Leadler</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div class="metric-value">{{ statistics.todayLeadsSold || 0 }}</div>
          <div class="metric-detail">
            <span class="detail-label">Bugünkü Gelir:</span>
            <span class="detail-value">{{ formatPrice(statistics.todayRevenue || 0, settings.defaultCurrency) }}</span>
          </div>
          <div class="metric-footer">
            <span class="badge badge-primary">{{ statistics.todayLeadsSold || 0 }} lead</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Toplam Satış</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div class="metric-value">{{ formatPrice(statistics.allTimeRevenue || 0, settings.defaultCurrency) }}</div>
          <div class="metric-detail">
            <span class="detail-label">Toplam Lead:</span>
            <span class="detail-value">{{ statistics.allTimeLeadsSold?.toLocaleString() || '0' }}</span>
          </div>
          <div class="metric-footer">
            <span class="badge badge-warning">Ortalama: {{ formatPrice(statistics.avgLeadPrice || 0, settings.defaultCurrency) }}</span>
          </div>
        </div>
      </div>
        </div>
      </div>

      <!-- Satış Analizi -->
      <div class="accordion-section">
        <div class="accordion-header" @click="toggleSection('sales')">
          <div class="accordion-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span>{{ categories.find(c => c.id === 'sales')?.title }}</span>
          </div>
          <svg 
            class="accordion-icon" 
            :class="{ 'open': categories.find(c => c.id === 'sales')?.isOpen }"
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div v-show="categories.find(c => c.id === 'sales')?.isOpen" class="accordion-content">
          <!-- Detaylı İstatistikler -->
          <div class="details-grid">
        <!-- En Çok Satın Alanlar -->
        <div class="detail-card">
          <div class="card-header">
            <h2>En Çok Satın Alanlar</h2>
            <span class="subtitle">Bu ay en aktif alıcılar</span>
          </div>
          <div class="buyers-list">
            <div
              v-for="(buyer, index) in statistics.topBuyers?.slice(0, 5) || []"
              :key="buyer.id"
              class="buyer-item"
            >
              <div class="buyer-rank" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
              <div class="buyer-info">
                <span class="buyer-name">{{ buyer.name || 'Bilinmeyen' }}</span>
                <span class="buyer-stats">{{ buyer.leadCount || 0 }} lead satın aldı</span>
              </div>
              <div class="buyer-amount">
                <span class="amount">{{ formatPrice(buyer.totalSpent || 0, settings.defaultCurrency) }}</span>
                <span v-if="buyer.growth" class="growth" :class="buyer.growth > 0 ? 'positive' : 'negative'">
                  {{ buyer.growth > 0 ? '+' : '' }}{{ buyer.growth }}%
                </span>
              </div>
            </div>
            <div v-if="!statistics.topBuyers || statistics.topBuyers.length === 0" class="empty-state">
              <p>Henüz satın alma verisi bulunmuyor.</p>
            </div>
          </div>
        </div>

        <!-- Sigorta Tipi Dağılımı -->
        <div class="detail-card">
          <div class="card-header">
            <h2>Sigorta Tipi Dağılımı</h2>
            <span class="subtitle">Gelir dağılımı analizi</span>
          </div>
          <div class="revenue-by-type">
            <div
              v-for="type in statistics.revenueByType || []"
              :key="type.insuranceType"
              class="type-item"
            >
              <div class="type-header">
                <span class="type-name">{{ type.insuranceType || 'Belirtilmemiş' }}</span>
                <span class="type-amount">{{ formatPrice(type.revenue || 0, settings.defaultCurrency) }}</span>
              </div>
              <div class="type-progress">
                <div
                  class="progress-bar"
                  :style="{ width: type.percentage + '%' }"
                ></div>
              </div>
              <div class="type-stats">
                <span>{{ type.leadCount || 0 }} lead</span>
                <span>{{ type.percentage || 0 }}%</span>
              </div>
            </div>
            <div v-if="!statistics.revenueByType || statistics.revenueByType.length === 0" class="empty-state">
              <p>Henüz sigorta tipi verisi bulunmuyor.</p>
            </div>
          </div>
        </div>
      </div>

          <!-- Satış Trendi Grafiği -->
          <div v-if="salesTrendChartData" class="chart-section">
            <div class="card-header">
              <h2>Son 30 Gün Satış Trendi</h2>
              <span class="subtitle">Günlük satış ve gelir performansı</span>
            </div>
            <div class="chart-container">
              <LineChart :data="salesTrendChartData" />
            </div>
          </div>

          <!-- Lead Performans -->
          <div v-if="statistics.leadPerformance" class="detail-card">
            <div class="card-header">
              <h2>Lead Performans Metrikleri</h2>
              <span class="subtitle">Lead yaşam döngüsü ve dönüşüm analizi</span>
            </div>
            <div class="performance-grid">
              <div class="perf-metric">
                <span class="perf-label">Aktif Leadler</span>
                <span class="perf-value">{{ statistics.leadPerformance.activeLeads }}</span>
              </div>
              <div class="perf-metric">
                <span class="perf-label">Toplam Lead</span>
                <span class="perf-value">{{ statistics.leadPerformance.totalLeads }}</span>
              </div>
              <div class="perf-metric">
                <span class="perf-label">Satılan Lead</span>
                <span class="perf-value">{{ statistics.leadPerformance.soldLeads }}</span>
              </div>
              <div class="perf-metric">
                <span class="perf-label">Dönüşüm Oranı</span>
                <span class="perf-value">%{{ statistics.leadPerformance.conversionRate }}</span>
              </div>
              <div class="perf-metric">
                <span class="perf-label">Ort. Satış Süresi</span>
                <span class="perf-value">{{ statistics.leadPerformance.avgSaleTime }} saat</span>
              </div>
            </div>

            <div class="subsection">
              <h3>En Hızlı Satışlar</h3>
              <div class="fastest-sales-list">
                <div v-for="sale in statistics.leadPerformance.fastestSales" :key="sale.title" class="fast-sale-item">
                  <span class="sale-title">{{ sale.title }}</span>
                  <span class="sale-time">{{ sale.hours }} saat</span>
                  <span class="sale-amount">{{ formatPrice(sale.amount, settings.defaultCurrency) }}</span>
                </div>
              </div>
            </div>

            <div class="subsection">
              <h3>En Yüksek Fiyatlı Satışlar</h3>
              <div class="highest-sales-list">
                <div v-for="sale in statistics.leadPerformance.highestSales" :key="sale.title" class="high-sale-item">
                  <span class="sale-title">{{ sale.title }}</span>
                  <span class="sale-buyer">{{ sale.buyer }}</span>
                  <span class="sale-amount highlight">{{ formatPrice(sale.amount, settings.defaultCurrency) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Satıcı İstatistikleri -->
          <div v-if="statistics.sellerStatistics" class="detail-card">
            <div class="card-header">
              <h2>En Başarılı Satıcılar</h2>
              <span class="subtitle">Lead satış performansı</span>
            </div>
            <div class="sellers-table">
              <table>
                <thead>
                  <tr>
                    <th>Sıra</th>
                    <th>Satıcı</th>
                    <th>Satılan Lead</th>
                    <th>Toplam Gelir</th>
                    <th>Ortalama Fiyat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(seller, index) in statistics.sellerStatistics.topSellers" :key="seller.id">
                    <td>{{ index + 1 }}</td>
                    <td>{{ seller.name }}</td>
                    <td>{{ seller.leadsSold }}</td>
                    <td>{{ formatPrice(seller.totalRevenue, settings.defaultCurrency) }}</td>
                    <td>{{ formatPrice(seller.avgPrice, settings.defaultCurrency) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Teklif ve İhale Analizi -->
      <div class="accordion-section">
        <div class="accordion-header" @click="toggleSection('bids')">
          <div class="accordion-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{{ categories.find(c => c.id === 'bids')?.title }}</span>
          </div>
          <svg 
            class="accordion-icon" 
            :class="{ 'open': categories.find(c => c.id === 'bids')?.isOpen }"
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div v-show="categories.find(c => c.id === 'bids')?.isOpen" class="accordion-content">
          <!-- Teklif İstatistikleri -->
          <div v-if="statistics.bidStatistics" class="stats-grid-2">
            <div class="detail-card">
              <div class="card-header">
                <h2>Teklif İstatistikleri</h2>
                <span class="subtitle">Tekliflere genel bakış</span>
              </div>
              <div class="bid-stats">
                <div class="bid-stat-item">
                  <span class="stat-label">Toplam Teklif</span>
                  <span class="stat-value large">{{ statistics.bidStatistics.totalBids?.toLocaleString() }}</span>
                </div>
                <div class="bid-stat-item">
                  <span class="stat-label">Son 24 Saat</span>
                  <span class="stat-value">{{ statistics.bidStatistics.bidsLast24h }}</span>
                </div>
                <div class="bid-stat-item">
                  <span class="stat-label">Lead Başına Ort.</span>
                  <span class="stat-value">{{ statistics.bidStatistics.avgBidsPerLead }}</span>
                </div>
                <div class="bid-stat-item">
                  <span class="stat-label">Dönüşüm Oranı</span>
                  <span class="stat-value">%{{ statistics.bidStatistics.bidConversionRate }}</span>
                </div>
              </div>

              <div class="subsection">
                <h3>En Çok Teklif Alan Leadler</h3>
                <div class="bidded-leads-list">
                  <div v-for="lead in statistics.bidStatistics.mostBiddedLeads" :key="lead.title" class="bidded-lead-item">
                    <span class="lead-title">{{ lead.title }}</span>
                    <span class="bid-count badge badge-primary">{{ lead.bidCount }} teklif</span>
                    <span :class="['status-badge', lead.isActive ? 'active' : 'inactive']">
                      {{ lead.isActive ? 'Aktif' : 'Pasif' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Coğrafi Analiz -->
            <div v-if="statistics.geographicData" class="detail-card">
              <div class="card-header">
                <h2>Posta Kodu Analizi</h2>
                <span class="subtitle">En çok satış yapılan bölgeler</span>
              </div>
              <div class="postal-codes-list">
                <div v-for="(pc, index) in statistics.geographicData.topPostalCodes" :key="pc.postalCode" class="postal-code-item">
                  <span class="rank">#{{ index + 1 }}</span>
                  <span class="postal-code">{{ pc.postalCode }}</span>
                  <span class="count">{{ pc.count }} satış</span>
                  <span class="revenue">{{ formatPrice(pc.revenue, settings.defaultCurrency) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Finansal Analiz -->
      <div class="accordion-section">
        <div class="accordion-header" @click="toggleSection('financial')">
          <div class="accordion-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <span>{{ categories.find(c => c.id === 'financial')?.title }}</span>
          </div>
          <svg 
            class="accordion-icon" 
            :class="{ 'open': categories.find(c => c.id === 'financial')?.isOpen }"
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div v-show="categories.find(c => c.id === 'financial')?.isOpen" class="accordion-content">
          <!-- Finansal Karşılaştırmalar -->
          <div v-if="statistics.financialComparison" class="comparison-section">
        <div class="card-header">
          <h2>Finansal Karşılaştırmalar</h2>
          <span class="subtitle">Dönemsel büyüme analizi</span>
        </div>

        <div class="comparison-grid">
          <div class="comparison-card">
            <h3>Haftalık Karşılaştırma</h3>
            <div class="comparison-data">
              <div class="period">
                <span class="period-label">Bu Hafta</span>
                <span class="period-value">{{ formatPrice(statistics.financialComparison.thisWeek.revenue, settings.defaultCurrency) }}</span>
                <span class="period-count">{{ statistics.financialComparison.thisWeek.count }} satış</span>
              </div>
              <div class="period">
                <span class="period-label">Geçen Hafta</span>
                <span class="period-value">{{ formatPrice(statistics.financialComparison.lastWeek.revenue, settings.defaultCurrency) }}</span>
                <span class="period-count">{{ statistics.financialComparison.lastWeek.count }} satış</span>
              </div>
              <div class="growth-indicator" :class="statistics.financialComparison.weeklyGrowth >= 0 ? 'positive' : 'negative'">
                <span>{{ statistics.financialComparison.weeklyGrowth >= 0 ? '+' : '' }}{{ statistics.financialComparison.weeklyGrowth }}%</span>
              </div>
            </div>
          </div>

          <div class="comparison-card">
            <h3>Aylık Karşılaştırma</h3>
            <div class="comparison-data">
              <div class="period">
                <span class="period-label">Bu Ay</span>
                <span class="period-value">{{ formatPrice(statistics.financialComparison.thisMonth.revenue, settings.defaultCurrency) }}</span>
                <span class="period-count">{{ statistics.financialComparison.thisMonth.count }} satış</span>
              </div>
              <div class="period">
                <span class="period-label">Geçen Ay</span>
                <span class="period-value">{{ formatPrice(statistics.financialComparison.lastMonth.revenue, settings.defaultCurrency) }}</span>
                <span class="period-count">{{ statistics.financialComparison.lastMonth.count }} satış</span>
              </div>
              <div class="growth-indicator" :class="statistics.financialComparison.monthlyGrowth >= 0 ? 'positive' : 'negative'">
                <span>{{ statistics.financialComparison.monthlyGrowth >= 0 ? '+' : '' }}{{ statistics.financialComparison.monthlyGrowth }}%</span>
              </div>
            </div>
          </div>

          <div class="comparison-card">
            <h3>Satış Türü Karşılaştırma</h3>
            <div class="sale-type-comparison">
              <div class="sale-type">
                <span class="type-label">Hemen Al</span>
                <span class="type-value">{{ formatPrice(statistics.financialComparison.instantBuy.revenue, settings.defaultCurrency) }}</span>
                <span class="type-count">{{ statistics.financialComparison.instantBuy.count }} satış</span>
              </div>
              <div class="sale-type">
                <span class="type-label">Açık Artırma</span>
                <span class="type-value">{{ formatPrice(statistics.financialComparison.auction.revenue, settings.defaultCurrency) }}</span>
                <span class="type-count">{{ statistics.financialComparison.auction.count }} satış</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="revenueComparisonChartData" class="chart-container" style="margin-top: 2rem;">
          <BarChart :data="revenueComparisonChartData" />
        </div>
          </div>
        </div>
      </div>

      <!-- Kullanıcı Aktivitesi -->
      <div class="accordion-section">
        <div class="accordion-header" @click="toggleSection('activity')">
          <div class="accordion-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>{{ categories.find(c => c.id === 'activity')?.title }}</span>
          </div>
          <svg 
            class="accordion-icon" 
            :class="{ 'open': categories.find(c => c.id === 'activity')?.isOpen }"
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div v-show="categories.find(c => c.id === 'activity')?.isOpen" class="accordion-content">
          <!-- Son Aktiviteler -->
          <div class="activity-section">
            <div class="card-header">
              <h2>Son Aktiviteler</h2>
              <span class="subtitle">Son 24 saatteki önemli olaylar</span>
            </div>
            <div class="activity-list">
              <div
                v-for="activity in statistics.recentActivity || []"
                :key="activity.id"
                class="activity-item"
              >
                <div class="activity-icon" :class="`icon-${activity.type}`">
                  <svg v-if="activity.type === 'sale'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  <svg v-else-if="activity.type === 'user'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div class="activity-content">
                  <p class="activity-title">{{ activity.title }}</p>
                  <p class="activity-description">{{ activity.description }}</p>
                </div>
                <div class="activity-meta">
                  <span class="activity-time">{{ activity.time }}</span>
                  <span v-if="activity.badge" class="activity-badge" :class="`badge-${activity.badgeType}`">
                    {{ activity.badge }}
                  </span>
                </div>
              </div>
              <div v-if="!statistics.recentActivity || statistics.recentActivity.length === 0" class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>Henüz aktivite bulunmuyor.</p>
              </div>
            </div>
          </div>

          <!-- Kullanıcı Aktivite İstatistikleri -->
      <div v-if="statistics.userActivity" class="activity-stats-section">
        <div class="card-header">
          <h2>Son Kullanıcı Aktiviteleri</h2>
          <span class="subtitle">En son aktif olan kullanıcılar ve online durum</span>
        </div>

        <div class="online-stats">
          <div class="online-badge">
            <span class="online-indicator"></span>
            <span class="online-text">{{ statistics.userActivity.onlineUsers }} kullanıcı şu anda online</span>
          </div>
        </div>

        <div class="user-activity-table">
          <table>
            <thead>
              <tr>
                <th>Durum</th>
                <th>Kullanıcı</th>
                <th>Son Aktivite</th>
                <th>IP Adresi</th>
                <th>Cihaz</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in statistics.userActivity.recentActiveUsers" :key="user.id">
                <td>
                  <span class="status-dot" :class="{ 'online': user.isOnline, 'offline': !user.isOnline }"></span>
                </td>
                <td>
                  <div class="user-cell">
                    <span class="user-name">{{ user.name }}</span>
                    <span class="user-email">{{ user.email }}</span>
                  </div>
                </td>
                <td>
                  <span class="activity-time">{{ user.lastActivityFormatted }}</span>
                </td>
                <td>
                  <span class="ip-address">{{ user.lastIP }}</span>
                </td>
                <td>
                  <span class="device-info">{{ user.deviceInfo }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!statistics.userActivity.recentActiveUsers || statistics.userActivity.recentActiveUsers.length === 0" class="empty-state">
            <p>Henüz aktivite verisi bulunmuyor.</p>
          </div>
        </div>
      </div>

      <!-- Kullanıcı Engagement -->
      <div v-if="statistics.userEngagement" class="engagement-section">
        <div class="card-header">
          <h2>Kullanıcı Etkileşimi</h2>
          <span class="subtitle">Aktivite paternleri ve watchlist kullanımı</span>
        </div>

        <div class="engagement-grid">
          <div class="engagement-card">
            <h3>Watchlist İstatistikleri</h3>
            <div class="watch-stats">
              <div class="watch-stat">
                <span>Toplam Takip</span>
                <strong>{{ statistics.userEngagement.totalWatches }}</strong>
              </div>
              <div class="watch-stat">
                <span>Son 24 Saat</span>
                <strong>{{ statistics.userEngagement.watchesLast24h }}</strong>
              </div>
            </div>
            <div class="watched-leads">
              <h4>En Çok Takip Edilen Leadler</h4>
              <div v-for="lead in statistics.userEngagement.mostWatchedLeads" :key="lead.title" class="watched-lead-item">
                <span class="lead-title">{{ lead.title }}</span>
                <span class="watch-count">{{ lead.watchCount }} takipçi</span>
              </div>
            </div>
          </div>

          <div class="engagement-card">
            <h3>En Aktif Saatler</h3>
            <div class="peak-hours-list">
              <div v-for="hour in statistics.userEngagement.peakHours" :key="hour.hour" class="peak-hour-item">
                <span class="hour">{{ hour.hour }}:00 - {{ hour.hour + 1 }}:00</span>
                <span class="activity-count">{{ hour.count }} aktivite</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="hourlyActivityChartData" class="chart-container" style="margin-top: 2rem;">
          <h3 style="margin-bottom: 1rem;">Saatlik Aktivite Dağılımı</h3>
          <BarChart :data="hourlyActivityChartData" />
        </div>
      </div>
        </div>
      </div>

      <!-- Geri Bildirimler -->
      <div class="accordion-section">
        <div class="accordion-header" @click="toggleSection('feedback')">
          <div class="accordion-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{{ categories.find(c => c.id === 'feedback')?.title }}</span>
          </div>
          <svg 
            class="accordion-icon" 
            :class="{ 'open': categories.find(c => c.id === 'feedback')?.isOpen }"
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div v-show="categories.find(c => c.id === 'feedback')?.isOpen" class="accordion-content">
          <!-- Feedback İstatistikleri -->
      <div v-if="statistics.feedbackStatistics" class="feedback-stats-section">
        <div class="card-header">
          <h2>Geri Bildirim İstatistikleri</h2>
          <span class="subtitle">Ticket ve müşteri memnuniyeti metrikleri</span>
        </div>

        <div class="feedback-metrics-grid">
          <div class="feedback-metric-card">
            <div class="metric-header">
              <span class="metric-label">Toplam Ticket</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div class="metric-value">{{ statistics.feedbackStatistics.totalFeedbacks?.toLocaleString() || '0' }}</div>
            <div class="metric-detail">
              <span class="detail-label">Son 24 saat:</span>
              <span class="detail-value">{{ statistics.feedbackStatistics.feedbacksLast24h || 0 }}</span>
            </div>
          </div>

          <div class="feedback-metric-card">
            <div class="metric-header">
              <span class="metric-label">Ortalama Yıldız</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div class="metric-value">{{ statistics.feedbackStatistics.avgRating || '0' }}/5</div>
            <div class="metric-detail">
              <span class="detail-label">Toplam değerlendirme:</span>
              <span class="detail-value">{{ statistics.feedbackStatistics.totalFeedbacks || 0 }}</span>
            </div>
          </div>

          <div class="feedback-metric-card">
            <div class="metric-header">
              <span class="metric-label">Kapanan Ticket</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div class="metric-value">{{ statistics.feedbackStatistics.closedFeedbacks?.toLocaleString() || '0' }}</div>
            <div class="metric-detail">
              <span class="detail-label">Kapanma oranı:</span>
              <span class="detail-value">
                {{ statistics.feedbackStatistics.totalFeedbacks > 0 
                  ? Math.round((statistics.feedbackStatistics.closedFeedbacks / statistics.feedbackStatistics.totalFeedbacks) * 100) 
                  : 0 }}%
              </span>
            </div>
          </div>

          <div class="feedback-metric-card">
            <div class="metric-header">
              <span class="metric-label">Ort. Yanıt Süresi</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="metric-value">{{ statistics.feedbackStatistics.avgResponseTime || '0' }} saat</div>
            <div class="metric-detail">
              <span class="detail-label">Toplam cevap:</span>
              <span class="detail-value">{{ statistics.feedbackStatistics.totalReplies?.toLocaleString() || '0' }}</span>
            </div>
          </div>
        </div>

        <div class="feedback-status-grid">
          <div class="status-card">
            <div class="status-header">
              <span class="status-label">Açık</span>
              <span class="status-badge status-open">{{ statistics.feedbackStatistics.openFeedbacks || 0 }}</span>
            </div>
            <div class="status-progress">
              <div 
                class="progress-bar" 
                :style="{ 
                  width: statistics.feedbackStatistics.totalFeedbacks > 0 
                    ? (statistics.feedbackStatistics.openFeedbacks / statistics.feedbackStatistics.totalFeedbacks) * 100 + '%' 
                    : '0%',
                  backgroundColor: '#3b82f6'
                }"
              ></div>
            </div>
          </div>

          <div class="status-card">
            <div class="status-header">
              <span class="status-label">İşlemde</span>
              <span class="status-badge status-in-progress">{{ statistics.feedbackStatistics.inProgressFeedbacks || 0 }}</span>
            </div>
            <div class="status-progress">
              <div 
                class="progress-bar" 
                :style="{ 
                  width: statistics.feedbackStatistics.totalFeedbacks > 0 
                    ? (statistics.feedbackStatistics.inProgressFeedbacks / statistics.feedbackStatistics.totalFeedbacks) * 100 + '%' 
                    : '0%',
                  backgroundColor: '#f59e0b'
                }"
              ></div>
            </div>
          </div>

          <div class="status-card">
            <div class="status-header">
              <span class="status-label">Çözüldü</span>
              <span class="status-badge status-resolved">{{ statistics.feedbackStatistics.resolvedFeedbacks || 0 }}</span>
            </div>
            <div class="status-progress">
              <div 
                class="progress-bar" 
                :style="{ 
                  width: statistics.feedbackStatistics.totalFeedbacks > 0 
                    ? (statistics.feedbackStatistics.resolvedFeedbacks / statistics.feedbackStatistics.totalFeedbacks) * 100 + '%' 
                    : '0%',
                  backgroundColor: '#10b981'
                }"
              ></div>
            </div>
          </div>

          <div class="status-card">
            <div class="status-header">
              <span class="status-label">Kapalı</span>
              <span class="status-badge status-closed">{{ statistics.feedbackStatistics.closedFeedbacks || 0 }}</span>
            </div>
            <div class="status-progress">
              <div 
                class="progress-bar" 
                :style="{ 
                  width: statistics.feedbackStatistics.totalFeedbacks > 0 
                    ? (statistics.feedbackStatistics.closedFeedbacks / statistics.feedbackStatistics.totalFeedbacks) * 100 + '%' 
                    : '0%',
                  backgroundColor: '#9ca3af'
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.admin-statistics {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: var(--page-padding);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-direction: row;
}

.header-left h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  color: var(--text);
}

.subtitle {
  color: var(--muted);
  font-size: 0.95rem;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: var(--muted);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state svg {
  color: var(--danger);
  margin-bottom: 1rem;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  opacity: 0.9;
}

/* Accordion Stilleri */
.accordion-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  margin-bottom: 1.5rem;
  overflow: hidden;
  transition: all 0.2s;
}

.accordion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  cursor: pointer;
  background: var(--bg);
  transition: all 0.2s;
  user-select: none;
}

.accordion-header:hover {
  background: var(--border);
}

.accordion-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
}

.accordion-title svg {
  color: var(--primary);
  flex-shrink: 0;
}

.accordion-icon {
  color: var(--muted);
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.accordion-icon.open {
  transform: rotate(180deg);
}

.accordion-content {
  padding: 1.5rem;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 5000px;
  }
}

/* Metrikler Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.metric-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.2s;
}

.metric-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.metric-label {
  font-size: 0.875rem;
  color: var(--muted);
  font-weight: 500;
}

.metric-header svg {
  color: var(--primary);
}

.metric-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.75rem;
}

.metric-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-top: 1px solid var(--border);
  margin-bottom: 0.75rem;
}

.detail-label {
  font-size: 0.875rem;
  color: var(--muted);
}

.detail-value {
  font-weight: 600;
  color: var(--text);
}

.metric-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-success {
  background: #dcfce7;
  color: #047857;
}

.badge-primary {
  background: #dbeafe;
  color: #1e40af;
}

.badge-warning {
  background: #fef3c7;
  color: #b45309;
}

.footer-text {
  font-size: 0.75rem;
  color: var(--muted);
}

/* Detaylı İstatistikler */
.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.detail-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom:1.5rem

}

.card-header {
  margin-bottom: 1.5rem;
}

.card-header h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  color: var(--text);
}

/* Alıcılar Listesi */
.buyers-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.buyer-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg);
  border-radius: 0.75rem;
  transition: all 0.2s;
}

.buyer-item:hover {
  background: var(--border);
}

.buyer-rank {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #854d0e;
}

.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
  color: #52525b;
}

.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #e5a572);
  color: #78350f;
}

.rank-4,
.rank-5 {
  background: var(--border);
  color: var(--muted);
}

.buyer-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.buyer-name {
  font-weight: 600;
  color: var(--text);
}

.buyer-stats {
  font-size: 0.875rem;
  color: var(--muted);
}

.buyer-amount {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.amount {
  font-weight: 700;
  color: var(--text);
}

.growth {
  font-size: 0.75rem;
  font-weight: 600;
}

.growth.positive {
  color: var(--success);
}

.growth.negative {
  color: var(--danger);
}

/* Sigorta Tipi Dağılımı */
.revenue-by-type {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.type-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.type-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.type-name {
  font-weight: 600;
  color: var(--text);
}

.type-amount {
  font-weight: 700;
  color: var(--primary);
}

.type-progress {
  height: 8px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--success));
  border-radius: 999px;
  transition: width 0.3s ease;
}

.type-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--muted);
}

/* Aktiviteler */
.activity-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom:1.5rem;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg);
  border-radius: 0.75rem;
  transition: all 0.2s;
}

.activity-item:hover {
  background: var(--border);
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-sale {
  background: #dcfce7;
  color: #047857;
}

.icon-user {
  background: #dbeafe;
  color: #1e40af;
}

.activity-content {
  flex: 1;
}

.activity-title {
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  color: var(--text);
}

.activity-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--muted);
}

.activity-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.activity-time {
  font-size: 0.75rem;
  color: var(--muted);
}

.activity-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-success {
  background: #dcfce7;
  color: #047857;
}

.badge-primary {
  background: #dbeafe;
  color: #1e40af;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--muted);
  text-align: center;
}

.empty-state svg {
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
}

/* Grafik Bölümleri */
.chart-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.chart-container {
  height: 350px;
  padding: 1rem;
}

/* Lead Performans */
.performance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.perf-metric {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--bg);
  border-radius: 0.5rem;
  text-align: center;
}

.perf-label {
  font-size: 0.875rem;
  color: var(--muted);
}

.perf-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--primary);
}

.subsection {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.subsection h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--text);
}

.fastest-sales-list,
.highest-sales-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.fast-sale-item,
.high-sale-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--bg);
  border-radius: 0.5rem;
}

.sale-title {
  flex: 1;
  font-size: 0.875rem;
  color: var(--text);
}

.sale-time,
.sale-buyer {
  font-size: 0.875rem;
  color: var(--muted);
}

.sale-amount {
  font-weight: 600;
  color: var(--text);
}

.sale-amount.highlight {
  color: var(--primary);
  font-weight: 700;
}

/* İki Kolon Grid */
.stats-grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Teklif İstatistikleri */
.bid-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.bid-stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--bg);
  border-radius: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--muted);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
}

.stat-value.large {
  font-size: 2rem;
  color: var(--primary);
}

.bidded-leads-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bidded-lead-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--bg);
  border-radius: 0.5rem;
}

.lead-title {
  flex: 1;
  font-size: 0.875rem;
  color: var(--text);
}

.bid-count {
  font-size: 0.75rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.active {
  background: #dcfce7;
  color: #047857;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

/* Posta Kodu Analizi */
.postal-codes-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.postal-code-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--bg);
  border-radius: 0.5rem;
}

.postal-code-item .rank {
  font-weight: 700;
  color: var(--muted);
  width: 30px;
}

.postal-code {
  font-weight: 600;
  color: var(--text);
  min-width: 80px;
}

.postal-code-item .count {
  flex: 1;
  font-size: 0.875rem;
  color: var(--muted);
}

.postal-code-item .revenue {
  font-weight: 700;
  color: var(--primary);
}

/* Finansal Karşılaştırmalar */
.comparison-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.comparison-card {
  padding: 1.5rem;
  background: var(--bg);
  border-radius: 0.75rem;
}

.comparison-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--text);
}

.comparison-data {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.period {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.period-label {
  font-size: 0.875rem;
  color: var(--muted);
}

.period-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
}

.period-count {
  font-size: 0.875rem;
  color: var(--muted);
}

.growth-indicator {
  padding: 0.75rem;
  border-radius: 0.5rem;
  text-align: center;
  font-weight: 700;
  font-size: 1.25rem;
}

.growth-indicator.positive {
  background: #dcfce7;
  color: #047857;
}

.growth-indicator.negative {
  background: #fee2e2;
  color: #991b1b;
}

.sale-type-comparison {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sale-type {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
}

.type-label {
  font-size: 0.875rem;
  color: var(--muted);
}

.type-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.type-count {
  font-size: 0.875rem;
  color: var(--muted);
}

/* Satıcı Tablosu */
.sellers-table {
  overflow-x: auto;
}

.sellers-table table {
  width: 100%;
  border-collapse: collapse;
}

.sellers-table th {
  text-align: left;
  padding: 0.75rem;
  background: var(--bg);
  color: var(--muted);
  font-size: 0.875rem;
  font-weight: 600;
  border-bottom: 2px solid var(--border);
}

.sellers-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

.sellers-table tr:hover {
  background: var(--bg);
}

.sellers-table tr:last-child td {
  border-bottom: none;
}

/* Kullanıcı Engagement */
.engagement-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 2.5rem;

}

.engagement-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.engagement-card {
  padding: 1.5rem;
  background: var(--bg);
  border-radius: 0.75rem;
}

.engagement-card h3,
.engagement-card h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--text);
}

.watch-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.watch-stat {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  text-align: center;
}

.watch-stat span {
  font-size: 0.875rem;
  color: var(--muted);
}

.watch-stat strong {
  font-size: 1.5rem;
  color: var(--primary);
}

.watched-leads {
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.watched-lead-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
}

.watch-count {
  font-weight: 600;
  color: var(--primary);
}

.peak-hours-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.peak-hour-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
}

.peak-hour-item .hour {
  font-weight: 600;
  color: var(--text);
}

.activity-count {
  color: var(--muted);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .admin-statistics {
    padding: var(--page-padding-mobile);
    padding-bottom: calc(var(--page-padding-mobile) + 2rem);
    max-width: 100%;
  }
  .card-header {
    flex-direction: column;
  
  }
  .detail-card {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .accordion-content {
    padding: 1rem;
  }
  .refresh-btn{
    display: none;

  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 1.5rem;
  }

  .metrics-grid,
  .details-grid,
  .stats-grid-2 {
    grid-template-columns: 1fr;
    margin-bottom: 1.5rem;
  }

  .metric-value {
    font-size: 2rem;
  }

  .buyer-item {
    flex-wrap: wrap;
  }

  .buyer-amount {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .performance-grid,
  .bid-stats,
  .watch-stats {
    grid-template-columns: 1fr;
  }

  .comparison-grid,
  .engagement-grid {
    grid-template-columns: 1fr;
  }

  .chart-container {
    height: 300px;
  }

  .chart-section,
  .comparison-section,
  .activity-stats-section,
  .feedback-stats-section {
    margin-bottom: 1.5rem;
  }
}

/* Kullanıcı Aktivite Bölümü */
.activity-stats-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.online-stats {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--bg);
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.online-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: var(--panel);
  border: 2px solid #dcfce7;
  border-radius: 999px;
}

.online-indicator {
  width: 12px;
  height: 12px;
  background: #22c55e;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

.online-text {
  font-weight: 600;
  color: #047857;
  font-size: 1rem;
}

.user-activity-table {
  overflow-x: auto;
}

.user-activity-table table {
  width: 100%;
  border-collapse: collapse;
}

.user-activity-table th {
  text-align: left;
  padding: 0.75rem;
  background: var(--bg);
  color: var(--muted);
  font-size: 0.875rem;
  font-weight: 600;
  border-bottom: 2px solid var(--border);
}

.user-activity-table td {
  padding: 1rem 0.75rem;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

.user-activity-table tr:hover {
  background: var(--bg);
}

.user-activity-table tr:last-child td {
  border-bottom: none;
}

.status-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin: 0 auto;
}

.status-dot.online {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
  animation: pulse 2s infinite;
}

.status-dot.offline {
  background: #94a3b8;
}

.user-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-name {
  font-weight: 600;
  color: var(--text);
}

.user-email {
  font-size: 0.75rem;
  color: var(--muted);
}

.activity-time {
  font-size: 0.875rem;
  color: var(--text);
  font-weight: 500;
}

.ip-address {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--muted);
  background: var(--bg);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.device-info {
  font-size: 0.875rem;
  color: var(--text);
}

@media (max-width: 768px) {
  .user-activity-table {
    font-size: 0.875rem;
  }

  .user-activity-table th,
  .user-activity-table td {
    padding: 0.5rem;
  }
}

/* Feedback İstatistikleri */
.feedback-stats-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 0.5rem;
  margin-bottom: 1.5rem;
}

.feedback-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.feedback-metric-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: all 0.2s;
}

.feedback-metric-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.feedback-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.status-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1rem;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.status-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 700;
}

.status-badge.status-open {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.status-in-progress {
  background: #fed7aa;
  color: #b45309;
}

.status-badge.status-resolved {
  background: #bbf7d0;
  color: #065f46;
}

.status-badge.status-closed {
  background: #e5e7eb;
  color: #374151;
}

.status-progress {
  height: 8px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.status-progress .progress-bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

@media (max-width: 768px) {
  .feedback-metrics-grid,
  .feedback-status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
