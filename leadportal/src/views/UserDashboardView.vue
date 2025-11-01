<template>
  <div class="user-dashboard">
    <div class="page-header">
      <div class="header-left">
        <h1>Kişisel Dashboard</h1>
        <p class="subtitle">Satın alma performansınız ve aktivite analizleriniz</p>
      </div>
      <button class="refresh-btn" @click="loadUserStats" :disabled="isLoading">
        <Icon icon="mdi:refresh" width="18" height="18" />
        Yenile
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>İstatistikler yükleniyor...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <Icon icon="mdi:alert-circle" width="48" height="48" />
      <p>{{ error }}</p>
      <button @click="loadUserStats" class="retry-btn">Tekrar Dene</button>
    </div>

    <div v-else class="dashboard-content">
      <!-- Ana Metrikler -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Toplam Satın Alınan</span>
            <Icon icon="mdi:shopping" width="20" height="20" />
          </div>
          <div class="metric-value">{{ userStats.totalPurchases }}</div>
          <div class="metric-detail">
            <span class="detail-label">Son 30 gün:</span>
            <span class="detail-value">{{ userStats.last30Days.purchases }}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Toplam Harcama</span>
            <Icon icon="mdi:currency-eur" width="20" height="20" />
          </div>
          <div class="metric-value">{{ formatPrice(userStats.totalSpent, settings.defaultCurrency) }}</div>
          <div class="metric-detail">
            <span class="detail-label">Ortalama:</span>
            <span class="detail-value">{{ formatPrice(userStats.avgPurchasePrice, settings.defaultCurrency) }}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Teklif Kazanma Oranı</span>
            <Icon icon="mdi:target" width="20" height="20" />
          </div>
          <div class="metric-value">%{{ userStats.bidWinRate }}</div>
          <div class="metric-detail">
            <span class="detail-label">Kazanılan:</span>
            <span class="detail-value">{{ userStats.wonBids }}/{{ userStats.totalBids }}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Watchlist Dönüşüm</span>
            <Icon icon="mdi:eye" width="20" height="20" />
          </div>
          <div class="metric-value">%{{ userStats.watchlistConversionRate }}</div>
          <div class="metric-detail">
            <span class="detail-label">Satın alınan:</span>
            <span class="detail-value">{{ userStats.purchasedFromWatchlist }}/{{ userStats.totalWatched }}</span>
          </div>
        </div>
      </div>

      <!-- Aylık Karşılaştırma ve Hedef -->
      <div class="comparison-section">
        <div class="comparison-card">
          <h3>Aylık Karşılaştırma</h3>
          <div class="comparison-data">
            <div class="period">
              <span class="period-label">Bu Ay</span>
              <span class="period-value">{{ formatPrice(userStats.monthlyComparison.thisMonth.spent, settings.defaultCurrency) }}</span>
              <span class="period-count">{{ userStats.monthlyComparison.thisMonth.purchases }} satın alma</span>
            </div>
            <div class="period">
              <span class="period-label">Geçen Ay</span>
              <span class="period-value">{{ formatPrice(userStats.monthlyComparison.lastMonth.spent, settings.defaultCurrency) }}</span>
              <span class="period-count">{{ userStats.monthlyComparison.lastMonth.purchases }} satın alma</span>
            </div>
            <div class="growth-indicator" :class="userStats.monthlyComparison.growth >= 0 ? 'positive' : 'negative'">
              <span>{{ userStats.monthlyComparison.growth >= 0 ? '+' : '' }}{{ userStats.monthlyComparison.growth }}%</span>
            </div>
          </div>
        </div>

        <div class="goal-card">
          <h3>Aylık Hedef</h3>
          <div class="goal-progress">
            <div class="goal-info">
              <span class="goal-label">Hedef: {{ formatPrice(userStats.monthlyGoal, settings.defaultCurrency) }}</span>
              <span class="goal-current">{{ formatPrice(userStats.monthlyComparison.thisMonth.spent, settings.defaultCurrency) }}</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar" :style="{ width: userStats.goalProgress + '%' }"></div>
            </div>
            <div class="goal-percentage">{{ userStats.goalProgress }}% tamamlandı</div>
          </div>
        </div>
      </div>

      <!-- Başarımlar -->
      <div v-if="userStats.achievements.length > 0" class="achievements-section">
        <div class="card-header">
          <h2>Başarımlar</h2>
          <span class="subtitle">Elde ettiğiniz rozetler</span>
        </div>
        <div class="achievements-grid">
          <div v-for="achievement in userStats.achievements" :key="achievement.name" class="achievement-card">
            <div class="achievement-icon">
              <Icon icon="mdi:trophy" width="24" height="24" />
            </div>
            <div class="achievement-content">
              <h4>{{ achievement.name }}</h4>
              <p>{{ achievement.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Coğrafi Analiz -->
      <div v-if="userStats.topPostalCodes.length > 0" class="geographic-section">
        <div class="card-header">
          <h2>Coğrafi Analiz</h2>
          <span class="subtitle">En çok satın aldığınız bölgeler</span>
        </div>
        <div class="postal-codes-list">
          <div v-for="(pc, index) in userStats.topPostalCodes" :key="pc.postalCode" class="postal-code-item">
            <span class="rank">#{{ index + 1 }}</span>
            <span class="postal-code">{{ pc.postalCode }}</span>
            <span class="count">{{ pc.count }} satın alma</span>
            <span class="revenue">{{ formatPrice(pc.totalSpent, settings.defaultCurrency) }}</span>
          </div>
        </div>
      </div>

      <!-- Son Aktiviteler -->
      <div class="activities-section">
        <div class="activities-grid">
          <!-- Son Satın Almalar -->
          <div class="activity-card">
            <div class="card-header">
              <h3>Son Satın Almalar</h3>
              <button @click="openPurchasesModal" class="view-all-link">Tümünü Gör</button>
            </div>
            <div class="activity-list">
              <div v-for="purchase in userStats.recentPurchases" :key="purchase.id" class="activity-item clickable" @click="goToLead(purchase.leadId)">
                <div class="activity-icon purchase">
                  <Icon icon="mdi:shopping" width="16" height="16" />
                </div>
                <div class="activity-content">
                  <p class="activity-title">{{ purchase.leadTitle }}</p>
                  <p class="activity-description">{{ formatPrice(purchase.amount, settings.defaultCurrency) }} • {{ purchase.seller }}</p>
                </div>
                <div class="activity-meta">
                  <span class="activity-time">{{ formatDate(purchase.soldAt) }}</span>
                </div>
              </div>
              <div v-if="userStats.recentPurchases.length === 0" class="empty-state">
                <p>Henüz satın alma yapmadınız.</p>
              </div>
            </div>
          </div>

          <!-- Son Teklifler -->
          <div class="activity-card">
            <div class="card-header">
              <h3>Son Teklifler</h3>
              <button @click="openBidsModal" class="view-all-link">Tümünü Gör</button>
            </div>
            <div class="activity-list">
              <div v-for="bid in userStats.recentBids" :key="bid.id" class="activity-item clickable" @click="goToLead(bid.leadId)">
                <div class="activity-icon" :class="{
                  'bid-won': bid.status === 'won',
                  'bid-lost': bid.status === 'lost',
                  'bid-waiting': bid.status === 'waiting'
                }">
                  <Icon icon="mdi:target" width="16" height="16" />
                </div>
                <div class="activity-content">
                  <p class="activity-title">{{ bid.leadTitle }}</p>
                  <p class="activity-description">{{ formatPrice(bid.amount, settings.defaultCurrency) }}</p>
                </div>
                <div class="activity-meta">
                  <span class="activity-time">{{ formatDate(bid.createdAt) }}</span>
                  <span v-if="bid.status === 'won'" class="status-badge won">Kazandı</span>
                  <span v-else-if="bid.status === 'lost'" class="status-badge lost">Kaybetti</span>
                  <span v-else class="status-badge waiting">Bekliyor</span>
                </div>
              </div>
              <div v-if="userStats.recentBids.length === 0" class="empty-state">
                <p>Henüz teklif vermediniz.</p>
              </div>
            </div>
          </div>

          <!-- Watchlist -->
          <div class="activity-card">
            <div class="card-header">
              <h3>Watchlist</h3>
              <button @click="openWatchlistModal" class="view-all-link">Tümünü Gör</button>
            </div>
            <div class="activity-list">
              <div v-for="watch in userStats.recentWatchlist" :key="watch.id" class="activity-item clickable" @click="goToLead(watch.leadId)">
                <div class="activity-icon" :class="watch.purchased ? 'watch-purchased' : 'watch-active'">
                  <Icon icon="mdi:eye" width="16" height="16" />
                </div>
                <div class="activity-content">
                  <p class="activity-title">{{ watch.leadTitle }}</p>
                  <p class="activity-description">Takip ediliyor</p>
                </div>
                <div class="activity-meta">
                  <span class="activity-time">{{ formatDate(watch.watchedAt) }}</span>
                  <span v-if="watch.purchased" class="status-badge purchased">Satın Alındı</span>
                </div>
              </div>
              <div v-if="userStats.recentWatchlist.length === 0" class="empty-state">
                <p>Watchlist'iniz boş.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Purchases Modal -->
    <div v-if="showPurchasesModal" class="modal-overlay" @click="showPurchasesModal = false">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h2>Tüm Satın Almalar</h2>
          <button class="close-btn" @click="showPurchasesModal = false">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
        <div class="modal-body">
          <div v-if="isLoadingModal" class="modal-loading">
            <div class="spinner"></div>
            <p>Yükleniyor...</p>
          </div>
          <div v-else-if="allPurchases.length === 0" class="modal-empty">
            <Icon icon="mdi:shopping-outline" width="48" height="48" />
            <p>Henüz satın alma yapmadınız.</p>
          </div>
          <div v-else class="modal-list">
            <div v-for="purchase in allPurchases" :key="purchase.id" class="modal-item clickable" @click="goToLead(purchase.leadId)">
              <div class="activity-icon purchase">
                <Icon icon="mdi:shopping" width="20" height="20" />
              </div>
              <div class="modal-item-content">
                <h4>{{ purchase.leadTitle }}</h4>
                <p class="item-description">{{ purchase.seller }}</p>
                <div class="item-details">
                  <span class="item-price">{{ formatPrice(purchase.amount, settings.defaultCurrency) }}</span>
                  <span class="item-method">{{ purchase.paymentMethod === 'balance' ? 'Bakiye' : 'IBAN' }}</span>
                </div>
              </div>
              <div class="modal-item-meta">
                <span class="item-date">{{ formatDate(purchase.soldAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bids Modal -->
    <div v-if="showBidsModal" class="modal-overlay" @click="showBidsModal = false">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h2>Tüm Teklifler</h2>
          <button class="close-btn" @click="showBidsModal = false">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
        <div class="modal-body">
          <div v-if="isLoadingModal" class="modal-loading">
            <div class="spinner"></div>
            <p>Yükleniyor...</p>
          </div>
          <div v-else-if="allBids.length === 0" class="modal-empty">
            <Icon icon="mdi:target-variant" width="48" height="48" />
            <p>Henüz teklif vermediniz.</p>
          </div>
          <div v-else class="modal-list">
            <div v-for="bid in allBids" :key="bid.id" class="modal-item clickable" @click="goToLead(bid.leadId)">
              <div class="activity-icon" :class="{
                'bid-won': bid.status === 'won',
                'bid-lost': bid.status === 'lost',
                'bid-waiting': bid.status === 'waiting'
              }">
                <Icon icon="mdi:target" width="20" height="20" />
              </div>
              <div class="modal-item-content">
                <h4>{{ bid.leadTitle }}</h4>
                <div class="item-details">
                  <span class="item-price">{{ formatPrice(bid.amount, settings.defaultCurrency) }}</span>
                  <span v-if="bid.status === 'won'" class="status-badge won">Kazandı</span>
                  <span v-else-if="bid.status === 'lost'" class="status-badge lost">Kaybetti</span>
                  <span v-else class="status-badge waiting">Bekliyor</span>
                </div>
              </div>
              <div class="modal-item-meta">
                <span class="item-date">{{ formatDate(bid.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Watchlist Modal -->
    <div v-if="showWatchlistModal" class="modal-overlay" @click="showWatchlistModal = false">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h2>Watchlist</h2>
          <button class="close-btn" @click="showWatchlistModal = false">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
        <div class="modal-body">
          <div v-if="isLoadingModal" class="modal-loading">
            <div class="spinner"></div>
            <p>Yükleniyor...</p>
          </div>
          <div v-else-if="allWatchlist.length === 0" class="modal-empty">
            <Icon icon="mdi:eye-outline" width="48" height="48" />
            <p>Watchlist'iniz boş.</p>
          </div>
          <div v-else class="modal-list">
            <div v-for="watch in allWatchlist" :key="watch.id" class="modal-item clickable" @click="goToLead(watch.leadId)">
              <div class="activity-icon" :class="watch.purchased ? 'watch-purchased' : 'watch-active'">
                <Icon icon="mdi:eye" width="20" height="20" />
              </div>
              <div class="modal-item-content">
                <h4>{{ watch.leadTitle }}</h4>
                <p class="item-description">Takip ediliyor</p>
              </div>
              <div class="modal-item-meta">
                <span class="item-date">{{ formatDate(watch.watchedAt) }}</span>
                <span v-if="watch.purchased" class="status-badge purchased">Satın Alındı</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios.js'
import { formatPrice } from '@/utils/currency.js'
import { Icon } from '@iconify/vue'

const router = useRouter()
const userStats = ref(null)
const settings = ref({ defaultCurrency: 'EUR' })
const isLoading = ref(true)
const error = ref('')

// Modal states
const showPurchasesModal = ref(false)
const showBidsModal = ref(false)
const showWatchlistModal = ref(false)

// Full data for modals
const allPurchases = ref([])
const allBids = ref([])
const allWatchlist = ref([])
const isLoadingModal = ref(false)

async function loadUserStats() {
  isLoading.value = true
  error.value = ''

  try {
    const [statsRes, settingsRes] = await Promise.all([
      api.get('/statistics/user'),
      api.get('/settings/branding')
    ])

    userStats.value = statsRes.data
    settings.value.defaultCurrency = settingsRes.data?.defaultCurrency || 'EUR'
  } catch (err) {
    console.error('Kullanıcı istatistikleri yüklenemedi:', err)
    error.value = 'İstatistikler yüklenirken bir hata oluştu.'
  } finally {
    isLoading.value = false
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function goToLead(leadId) {
  router.push(`/lead/${leadId}`)
}

async function loadAllPurchases() {
  isLoadingModal.value = true
  try {
    const response = await api.get('/statistics/user/purchases')
    allPurchases.value = response.data
  } catch (err) {
    console.error('Satın almalar yüklenemedi:', err)
  } finally {
    isLoadingModal.value = false
  }
}

async function loadAllBids() {
  isLoadingModal.value = true
  try {
    const response = await api.get('/statistics/user/bids')
    allBids.value = response.data
  } catch (err) {
    console.error('Teklifler yüklenemedi:', err)
  } finally {
    isLoadingModal.value = false
  }
}

async function loadAllWatchlist() {
  isLoadingModal.value = true
  try {
    const response = await api.get('/statistics/user/watchlist')
    allWatchlist.value = response.data
  } catch (err) {
    console.error('Watchlist yüklenemedi:', err)
  } finally {
    isLoadingModal.value = false
  }
}

function openPurchasesModal() {
  showPurchasesModal.value = true
  loadAllPurchases()
}

function openBidsModal() {
  showBidsModal.value = true
  loadAllBids()
}

function openWatchlistModal() {
  showWatchlistModal.value = true
  loadAllWatchlist()
}

onMounted(() => {
  loadUserStats()
})
</script>

<style scoped>
.user-dashboard {
  max-width: 80%;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;
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

/* Metrikler Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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
}

.detail-label {
  font-size: 0.875rem;
  color: var(--muted);
}

.detail-value {
  font-weight: 600;
  color: var(--text);
}

/* Karşılaştırma Bölümü */
.comparison-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.comparison-card,
.goal-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
}

.comparison-card h3,
.goal-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
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

/* Hedef İlerlemesi */
.goal-progress {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.goal-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goal-label {
  font-size: 0.875rem;
  color: var(--muted);
}

.goal-current {
  font-weight: 700;
  color: var(--text);
}

.progress-bar-container {
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

.goal-percentage {
  text-align: center;
  font-size: 0.875rem;
  color: var(--muted);
  font-weight: 500;
}

/* Başarımlar */
.achievements-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.card-header {
  margin-bottom: 1.5rem;
}

.card-header h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  color: var(--text);
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.achievement-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg);
  border-radius: 0.75rem;
  border: 1px solid var(--border);
}

.achievement-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-radius: 0.75rem;
  color: white;
  flex-shrink: 0;
}

.achievement-content h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: var(--text);
}

.achievement-content p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--muted);
}

/* Coğrafi Analiz */
.geographic-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

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

/* Aktiviteler */
.activities-section {
  margin-bottom: 2rem;
}

.activities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.activity-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
}

.activity-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.activity-card h3 {
  margin: 0;
  font-size: 1.125rem;
  color: var(--text);
}

.view-all-link {
  font-size: 0.875rem;
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}

.view-all-link:hover {
  text-decoration: underline;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg);
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.activity-item:hover {
  background: var(--border);
}

.activity-item.clickable {
  cursor: pointer;
}

.activity-item.clickable:hover {
  background: var(--border);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon.purchase {
  background: #dcfce7;
  color: #047857;
}

.activity-icon.bid-won {
  background: #dcfce7;
  color: #047857;
}

.activity-icon.bid-lost {
  background: #fee2e2;
  color: #991b1b;
}

.activity-icon.bid-waiting {
  background: #dbeafe;
  color: #1e40af;
}

.activity-icon.watch-purchased {
  background: #dcfce7;
  color: #047857;
}

.activity-icon.watch-active {
  background: #dbeafe;
  color: #1e40af;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-title {
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  color: var(--text);
  font-size: 0.875rem;
  line-height: 1.3;
}

.activity-description {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted);
  line-height: 1.3;
}

.activity-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.activity-time {
  font-size: 0.75rem;
  color: var(--muted);
}

.status-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.status-badge.won {
  background: #dcfce7;
  color: #047857;
}

.status-badge.lost {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.waiting {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.purchased {
  background: #dcfce7;
  color: #047857;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: var(--muted);
  text-align: center;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

/* Modal Styles */
.modal-overlay {
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
  padding: 1rem;
}

.modal-container {
  background: var(--panel);
  border-radius: 1rem;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text);
}

.close-btn {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--border);
  color: var(--text);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.modal-loading,
.modal-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--muted);
}

.modal-empty svg {
  margin-bottom: 1rem;
  opacity: 0.5;
}

.modal-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg);
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  transition: all 0.2s;
}

.modal-item.clickable {
  cursor: pointer;
}

.modal-item.clickable:hover {
  background: var(--border);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.modal-item-content {
  flex: 1;
  min-width: 0;
}

.modal-item-content h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: var(--text);
  font-weight: 600;
}

.item-description {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: var(--muted);
}

.item-details {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.item-price {
  font-weight: 700;
  color: var(--primary);
  font-size: 0.875rem;
}

.item-method {
  padding: 0.25rem 0.5rem;
  background: var(--border);
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text);
}

.modal-item-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.item-date {
  font-size: 0.75rem;
  color: var(--muted);
  white-space: nowrap;
}

.view-all-link {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .user-dashboard {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .metric-value {
    font-size: 2rem;
  }

  .comparison-section {
    grid-template-columns: 1fr;
  }

  .activities-grid {
    grid-template-columns: 1fr;
  }

  .achievements-grid {
    grid-template-columns: 1fr;
  }

  .modal-container {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-item {
    flex-direction: column;
    gap: 0.75rem;
  }

  .modal-item-meta {
    align-items: flex-start;
    width: 100%;
  }
}
</style>
