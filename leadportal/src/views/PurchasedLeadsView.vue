<template>
  <div class="purchased-leads-page">
    <div class="page-content">
      <div class="page-header">
        <h1>Satın Aldığım Lead'ler</h1>
        <p class="page-subtitle">Açık artırmalardan satın aldığınız lead'lerin listesi</p>
      </div>

      <!-- Stats Section -->
      <div class="stats-section">
        <div class="stats-background"></div>
        <div class="stats-content">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ purchasedLeads.length }}</div>
              <div class="stat-label">Toplam Satın Alınan</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">₺{{ totalSpent.toLocaleString() }}</div>
              <div class="stat-label">Toplam Harcama</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">₺{{ averagePrice.toLocaleString() }}</div>
              <div class="stat-label">Ortalama Fiyat</div>
            </div>
          </div>
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

      <!-- Purchased Leads List -->
      <div v-else class="purchased-leads-list">
        <div v-for="sale in purchasedLeads" :key="sale.id" class="purchased-lead-card">
          <div class="lead-header">
            <div class="lead-info">
              <h3 class="lead-title">{{ sale.lead.title }}</h3>
              <p class="lead-description">{{ sale.lead.description }}</p>
            </div>
            <div class="lead-status">
              <span class="status-badge sold">Satın Alındı</span>
            </div>
          </div>

          <div class="lead-details">
            <div class="detail-row">
              <div class="detail-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span class="detail-label">Satın Alma Fiyatı:</span>
                <span class="detail-value price">₺{{ sale.amount.toLocaleString() }}</span>
              </div>
            </div>

            <div class="detail-row">
              <div class="detail-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span class="detail-label">Satıcı:</span>
                <span class="detail-value">{{ sale.lead.owner.email }}</span>
              </div>
            </div>

            <div class="detail-row">
              <div class="detail-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
                <span class="detail-label">Satın Alma Tarihi:</span>
                <span class="detail-value">{{ formatDate(sale.soldAt) }}</span>
              </div>
            </div>
          </div>

          <div class="lead-actions">
            <button class="btn btn-primary" @click="viewLeadDetails(sale.lead.id)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Lead Detaylarını Görüntüle
            </button>
            <button class="btn btn-secondary" @click="downloadLeadInfo(sale)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Bilgileri İndir
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const purchasedLeads = ref([])
const loading = ref(true)

// Computed properties
const totalSpent = computed(() => {
  return purchasedLeads.value.reduce((total, sale) => total + sale.amount, 0)
})

const averagePrice = computed(() => {
  if (purchasedLeads.value.length === 0) return 0
  return Math.round(totalSpent.value / purchasedLeads.value.length)
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

onMounted(() => {
  fetchPurchasedLeads()
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
  color: #6b7280;
  max-width: 600px;
  margin: 0 auto;
}

/* Stats Section */
.stats-section {
  margin-bottom: 60px;
  position: relative;
  padding: 80px 0;
  border-radius: 16px;
  overflow: hidden;
}

.stats-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/images/about-stats-background.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.1;
  z-index: 1;
}

.stats-content {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 16px;
  margin: 0 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 32px;
}

.stat-card {
  text-align: center;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
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
  border-top: 4px solid #3b82f6;
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
  color: #6b7280;
  margin-bottom: 32px;
}

/* Purchased Leads List */
.purchased-leads-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.purchased-lead-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.lead-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.lead-info {
  flex: 1;
}

.lead-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.lead-description {
  color: #6b7280;
  line-height: 1.6;
}

.lead-status {
  margin-left: 24px;
}

.status-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-badge.sold {
  background: #dcfce7;
  color: #166534;
}

.lead-details {
  margin-bottom: 24px;
}

.detail-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #374151;
}

.detail-item svg {
  color: #6b7280;
  flex-shrink: 0;
}

.detail-label {
  font-weight: 500;
  margin-right: 8px;
}

.detail-value {
  font-weight: 600;
}

.detail-value.price {
  color: #059669;
  font-size: 1.125rem;
}

.lead-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

/* Responsive */
@media (max-width: 768px) {
  .lead-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .lead-status {
    margin-left: 0;
    align-self: flex-start;
  }
  
  .lead-actions {
    flex-direction: column;
  }
  
  .btn {
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-content {
    margin: 0 10px;
    padding: 20px;
  }
}
</style>
