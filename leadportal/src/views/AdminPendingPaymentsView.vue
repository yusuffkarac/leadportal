<template>
  <div class="pending-payments">
    <div class="page-header">
      <div>
        <h1>
          <Icon icon="mdi:credit-card-outline" width="24" />
          IBAN Ödemeleri
        </h1>
        <p>IBAN ile yapılan ödemeleri görüntüleyin ve yönetin</p>
      </div>
      <!-- Statistics Cards -->
      <div class="stats-cards">
        <div class="stat-card pending">
          <Icon icon="mdi:clock-outline" width="24" />
          <div>
            <div class="stat-value">{{ pendingPayments.length }}</div>
            <div class="stat-label">Bekleyen</div>
          </div>
        </div>
        <div class="stat-card completed">
          <Icon icon="mdi:check-circle-outline" width="24" />
          <div>
            <div class="stat-value">{{ completedPayments.length }}</div>
            <div class="stat-label">Onaylanmış</div>
          </div>
        </div>
        <div class="stat-card rejected">
          <Icon icon="mdi:close-circle-outline" width="24" />
          <div>
            <div class="stat-value">{{ rejectedPayments.length }}</div>
            <div class="stat-label">Reddedilmiş</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-container">
      <div class="tabs-nav">
        <button
          class="tab-button"
          :class="{ active: activeTab === 'pending' }"
          @click="switchTab('pending')"
        >
          <Icon icon="mdi:clock-alert-outline" width="18" />
          Bekleyen ({{ pendingPayments.length }})
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'completed' }"
          @click="switchTab('completed')"
        >
          <Icon icon="mdi:check-circle" width="18" />
          Onaylanmış ({{ completedPayments.length }})
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'rejected' }"
          @click="switchTab('rejected')"
        >
          <Icon icon="mdi:close-circle" width="18" />
          Reddedilmiş ({{ rejectedPayments.length }})
        </button>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="search-filter-section">
      <div class="search-container">
        <Icon icon="mdi:magnify" width="18" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Lead ara (isim, email, Lead ID)..."
          class="search-input"
        />
      </div>

      <button class="filter-toggle" @click="showFilters = !showFilters">
        <Icon icon="mdi:filter-outline" width="18" />
        Filtreler
        <Icon
          :icon="showFilters ? 'mdi:chevron-up' : 'mdi:chevron-down'"
          width="18"
        />
      </button>
    </div>

    <!-- Filter Options -->
    <div v-if="showFilters" class="filters-panel">
      <div class="filter-group">
        <label>Miktar Aralığı</label>
        <div class="amount-filter">
          <input
            v-model.number="minAmount"
            type="number"
            placeholder="Min"
            class="amount-input"
          />
          <span class="dash">-</span>
          <input
            v-model.number="maxAmount"
            type="number"
            placeholder="Max"
            class="amount-input"
          />
        </div>
      </div>

      <div class="filter-group">
        <label>Tarih Aralığı</label>
        <div class="date-filter">
          <input
            v-model="startDate"
            type="date"
            class="date-input"
          />
          <span class="dash">-</span>
          <input
            v-model="endDate"
            type="date"
            class="date-input"
          />
        </div>
      </div>

      <button class="btn-reset-filters" @click="resetFilters">
        <Icon icon="mdi:refresh" width="16" />
        Filtreleri Sıfırla
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <Icon icon="mdi:loading" class="spin" width="48" />
      <p>Yükleniyor...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="displayedPayments.length === 0" class="empty-state">
      <Icon v-if="activeTab === 'pending'" icon="mdi:check-all" width="64" />
      <Icon v-else-if="activeTab === 'completed'" icon="mdi:file-document-outline" width="64" />
      <Icon v-else icon="mdi:shield-check-outline" width="64" />

      <h3 v-if="activeTab === 'pending'">Harika! Bekleyen ödeme yok</h3>
      <h3 v-else-if="activeTab === 'completed'">Henüz onaylanmış IBAN ödemesi yok</h3>
      <h3 v-else>Harika! Reddedilmiş ödeme yok</h3>

      <p v-if="activeTab === 'pending'">Tüm IBAN ödemeleri onaylanmış durumda</p>
      <p v-else-if="activeTab === 'completed'">IBAN ödemeleri onaylandıkça burada görünecek</p>
      <p v-else>Reddedilen ödemeler burada görünecek</p>
    </div>

    <!-- Payments List -->
    <div v-else class="payments-list">
      <div
        v-for="payment in displayedPayments"
        :key="payment.id"
        class="payment-card"
        :class="{ completed: activeTab === 'completed', rejected: activeTab === 'rejected' }"
      >
        <div class="payment-header">
          <div class="payment-title">
            <Icon icon="mdi:file-document-outline" width="20" />
            <div class="lead-info">
              <h3>{{ payment.lead.title }}</h3>
              <span class="lead-id">Lead ID: {{ payment.leadId }}</span>
            </div>
          </div>
          <div class="payment-amount">
            <span class="amount">{{ formatCurrency(payment.amount) }}</span>
            <span v-if="activeTab === 'pending'" class="badge pending-badge">Beklemede</span>
            <span v-else-if="activeTab === 'completed'" class="badge completed-badge">Onaylanmış</span>
            <span v-else class="badge rejected-badge">Reddedilmiş</span>
          </div>
        </div>

        <div class="payment-details">
          <div class="detail-row">
            <div class="detail-item compact">
              <Icon icon="mdi:account" width="14" />
              <div class="detail-value">{{ payment.buyer.email }}</div>
            </div>
            <div class="detail-item compact">
              <Icon icon="mdi:calendar" width="14" />
              <div class="detail-value">{{ formatDateShort(payment.createdAt) }}</div>
            </div>
          </div>

          <!-- IBAN Details -->
          <div class="iban-details">
            <div class="iban-row">
              <span class="iban-label">Hesap:</span>
              <span class="iban-value">{{ payment.buyer.ibanAccountHolder || '-' }}</span>
            </div>
            <div class="iban-row">
              <span class="iban-label">IBAN:</span>
              <span class="iban-value monospace">{{ payment.buyer.ibanNumber || '-' }}</span>
            </div>
          </div>

          <!-- Admin Notes - Only for pending -->
          <div v-if="activeTab === 'pending'" class="admin-notes-section">
            <textarea
              v-model="payment.adminNotes"
              placeholder="Admin notu..."
              rows="2"
              class="notes-input"
            ></textarea>
          </div>

          <!-- Show admin notes if completed or rejected -->
          <div v-if="(activeTab === 'completed' || activeTab === 'rejected') && payment.adminNotes" 
               :class="['compact-notes', activeTab === 'rejected' ? 'rejected' : 'completed']">
            <p>{{ payment.adminNotes }}</p>
          </div>

          <!-- Lead Navigation Button -->
          <div class="lead-navigation">
            <button class="btn-view-lead" @click="goToLead(payment.leadId)">
              <Icon icon="mdi:arrow-right-circle" width="14" />
              Leade Git
            </button>
          </div>
        </div>

        <!-- Action Buttons - Only for pending -->
        <div v-if="activeTab === 'pending'" class="payment-actions">
          <button
            class="btn-confirm"
            @click="openConfirmModal(payment)"
            :disabled="payment.isConfirming || payment.isRejecting"
          >
            <Icon icon="mdi:check-circle" width="18" />
            {{ payment.isConfirming ? 'Onaylanıyor...' : 'Onayla' }}
          </button>
          <button
            class="btn-reject"
            @click="openRejectModal(payment)"
            :disabled="payment.isConfirming || payment.isRejecting"
          >
            <Icon icon="mdi:close-circle" width="18" />
            {{ payment.isRejecting ? 'Reddediliyor...' : 'Reddet' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="showConfirmModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <Icon icon="mdi:help-circle-outline" width="32" class="modal-icon confirm" />
          <h3>{{ modalTitle }}</h3>
        </div>
        <div class="modal-body">
          <p>{{ modalMessage }}</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="showConfirmModal = false">İptal</button>
          <button class="modal-btn confirm" @click="confirmPayment">Onayla</button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="modal-overlay" @click="showRejectModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <Icon icon="mdi:alert-circle-outline" width="32" class="modal-icon warning" />
          <h3>{{ modalTitle }}</h3>
        </div>
        <div class="modal-body">
          <p>{{ modalMessage }}</p>
          <label class="modal-label">Red nedeni (zorunlu):</label>
          <textarea
            v-model="rejectReason"
            placeholder="Red nedeninizi buraya yazın..."
            rows="3"
            class="modal-textarea"
            @keydown.enter.prevent
          ></textarea>
        </div>
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="showRejectModal = false">İptal</button>
          <button
            class="modal-btn reject"
            @click="rejectPayment"
            :disabled="!rejectReason.trim()"
          >
            Reddet
          </button>
        </div>
      </div>
    </div>

    <!-- Success/Error Modal -->
    <div v-if="showErrorModal" class="modal-overlay" @click="showErrorModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <Icon
            :icon="modalTitle === 'Başarılı!' ? 'mdi:check-circle' : 'mdi:alert-circle'"
            width="32"
            :class="['modal-icon', modalTitle === 'Başarılı!' ? 'success' : 'error']"
          />
          <h3>{{ modalTitle }}</h3>
        </div>
        <div class="modal-body">
          <p>{{ modalMessage }}</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn confirm" @click="showErrorModal = false">Tamam</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import axios from '../utils/axios'

const router = useRouter()

const activeTab = ref('pending') // 'pending', 'completed', or 'rejected'
const pendingPayments = ref([])
const completedPayments = ref([])
const rejectedPayments = ref([])
const isLoading = ref(false)

// Modal states
const showConfirmModal = ref(false)
const showRejectModal = ref(false)
const showErrorModal = ref(false)
const modalMessage = ref('')
const modalTitle = ref('')
const rejectReason = ref('')
const selectedPayment = ref(null)

// Search and Filter states
const searchQuery = ref('')
const showFilters = ref(false)
const minAmount = ref(null)
const maxAmount = ref(null)
const startDate = ref('')
const endDate = ref('')

const totalPendingRevenue = computed(() => {
  return pendingPayments.value.reduce((sum, payment) => sum + payment.amount, 0)
})

const totalCompletedRevenue = computed(() => {
  return completedPayments.value.reduce((sum, payment) => sum + payment.amount, 0)
})

const displayedPayments = computed(() => {
  let payments = []

  if (activeTab.value === 'pending') payments = pendingPayments.value
  else if (activeTab.value === 'completed') payments = completedPayments.value
  else payments = rejectedPayments.value

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    payments = payments.filter(payment => {
      const title = (payment.lead?.title || '').toLowerCase()
      const email = (payment.buyer?.email || '').toLowerCase()
      const leadId = (payment.leadId || '').toString()

      return title.includes(query) || email.includes(query) || leadId.includes(query)
    })
  }

  // Apply amount filter
  if (minAmount.value !== null && minAmount.value !== '') {
    payments = payments.filter(payment => payment.amount >= minAmount.value)
  }
  if (maxAmount.value !== null && maxAmount.value !== '') {
    payments = payments.filter(payment => payment.amount <= maxAmount.value)
  }

  // Apply date filter
  if (startDate.value) {
    const start = new Date(startDate.value)
    payments = payments.filter(payment => new Date(payment.createdAt) >= start)
  }
  if (endDate.value) {
    const end = new Date(endDate.value)
    end.setHours(23, 59, 59, 999) // Include the entire end day
    payments = payments.filter(payment => new Date(payment.createdAt) <= end)
  }

  return payments
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

const formatDate = (dateString) => {
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString))
}

const formatDateShort = (dateString) => {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString))
}

const fetchPendingPayments = async () => {
  isLoading.value = true
  try {
    const response = await axios.get('/lead-sales/admin/pending')
    pendingPayments.value = response.data.map(payment => ({
      ...payment,
      adminNotes: '',
      isConfirming: false,
      isRejecting: false
    }))
  } catch (error) {
    console.error('Error fetching pending payments:', error)
    alert('Bekleyen ödemeler yüklenirken bir hata oluştu')
  } finally {
    isLoading.value = false
  }
}

const fetchCompletedPayments = async () => {
  isLoading.value = true
  try {
    const response = await axios.get('/lead-sales/admin/all')
    // Filter only IBAN payments with COMPLETED status
    completedPayments.value = response.data.filter(payment =>
      payment.paymentMethod === 'iban' && payment.paymentStatus === 'COMPLETED'
    )
  } catch (error) {
    console.error('Error fetching completed payments:', error)
    modalTitle.value = 'Hata!'
    modalMessage.value = 'Onaylanmış ödemeler yüklenirken bir hata oluştu'
    showErrorModal.value = true
  } finally {
    isLoading.value = false
  }
}

const fetchRejectedPayments = async () => {
  isLoading.value = true
  try {
    const response = await axios.get('/lead-sales/admin/all')
    // Filter only IBAN payments with FAILED status
    rejectedPayments.value = response.data.filter(payment =>
      payment.paymentMethod === 'iban' && payment.paymentStatus === 'FAILED'
    )
  } catch (error) {
    console.error('Error fetching rejected payments:', error)
    modalTitle.value = 'Hata!'
    modalMessage.value = 'Reddedilmiş ödemeler yüklenirken bir hata oluştu'
    showErrorModal.value = true
  } finally {
    isLoading.value = false
  }
}

const openConfirmModal = (payment) => {
  selectedPayment.value = payment
  modalTitle.value = 'Ödemeyi Onayla'
  modalMessage.value = `${payment.lead.title} için ${formatCurrency(payment.amount)} tutarındaki ödemeyi onaylamak istediğinize emin misiniz?`
  showConfirmModal.value = true
}

const confirmPayment = async () => {
  const payment = selectedPayment.value
  if (!payment) return

  showConfirmModal.value = false
  payment.isConfirming = true

  try {
    await axios.post(`/lead-sales/admin/${payment.id}/confirm-payment`, {
      adminNotes: payment.adminNotes || null
    })

    modalTitle.value = 'Başarılı!'
    modalMessage.value = 'Ödeme başarıyla onaylandı! Alıcı ve satıcıya bildirim gönderildi.'
    showErrorModal.value = true

    // Remove from pending list
    pendingPayments.value = pendingPayments.value.filter(p => p.id !== payment.id)
    
    // Add to completed list with updated status
    const updatedPayment = {
      ...payment,
      paymentStatus: 'COMPLETED',
      confirmedAt: new Date().toISOString()
    }
    completedPayments.value = [updatedPayment, ...completedPayments.value]
  } catch (error) {
    console.error('Error confirming payment:', error)
    modalTitle.value = 'Hata!'
    modalMessage.value = 'Ödeme onaylanırken bir hata oluştu: ' + (error.response?.data?.error || error.message)
    showErrorModal.value = true
  } finally {
    payment.isConfirming = false
  }
}

const openRejectModal = (payment) => {
  selectedPayment.value = payment
  rejectReason.value = ''
  modalTitle.value = 'Ödemeyi Reddet'
  modalMessage.value = `${payment.lead.title} ödemesini reddetmek üzeresiniz. Lead tekrar satışa çıkacak.`
  showRejectModal.value = true
}

const rejectPayment = async () => {
  const payment = selectedPayment.value
  if (!payment) return

  if (!rejectReason.value.trim()) {
    return
  }

  showRejectModal.value = false
  payment.isRejecting = true

  try {
    await axios.post(`/lead-sales/admin/${payment.id}/reject-payment`, {
      adminNotes: rejectReason.value
    })

    modalTitle.value = 'Başarılı!'
    modalMessage.value = 'Ödeme reddedildi ve lead tekrar satışa çıkarıldı.'
    showErrorModal.value = true

    // Remove from pending list
    pendingPayments.value = pendingPayments.value.filter(p => p.id !== payment.id)
    
    // Add to rejected list with updated status
    const updatedPayment = {
      ...payment,
      paymentStatus: 'FAILED',
      adminNotes: rejectReason.value,
      confirmedAt: new Date().toISOString()
    }
    rejectedPayments.value = [updatedPayment, ...rejectedPayments.value]
  } catch (error) {
    console.error('Error rejecting payment:', error)
    modalTitle.value = 'Hata!'
    modalMessage.value = 'Ödeme reddedilirken bir hata oluştu: ' + (error.response?.data?.error || error.message)
    showErrorModal.value = true
  } finally {
    payment.isRejecting = false
    rejectReason.value = ''
  }
}

const fetchAllPayments = async () => {
  try {
    const response = await axios.get('/lead-sales/admin/all')
    const allIbanPayments = response.data.filter(payment => payment.paymentMethod === 'iban')
    
    // Tüm IBAN ödemelerini durumlarına göre ayır
    completedPayments.value = allIbanPayments.filter(payment => payment.paymentStatus === 'COMPLETED')
    rejectedPayments.value = allIbanPayments.filter(payment => payment.paymentStatus === 'FAILED')
  } catch (error) {
    console.error('Error fetching all payments:', error)
  }
}

const resetFilters = () => {
  searchQuery.value = ''
  minAmount.value = null
  maxAmount.value = null
  startDate.value = ''
  endDate.value = ''
}

const switchTab = (tab) => {
  activeTab.value = tab
  // Artık tüm ödemeler sayfa açıldığında yüklendiği için ekstra fetch gerekmiyor
}

const goToLead = (leadId) => {
  router.push({ name: 'lead-detail', params: { id: leadId } })
}

onMounted(async () => {
  await Promise.all([
    fetchPendingPayments(),
    fetchAllPayments()
  ])
})
</script>

<style scoped>
.pending-payments {
  padding: 1.25rem;
  max-width: 90%;
  margin: 0 auto;
  overflow-x: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  gap: 1rem;
  flex-wrap: wrap;
  flex-direction: row;
}

.page-header h1 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.page-header p {
  color: #64748b;
  font-size: 0.875rem;
}

/* Statistics Cards */
.stats-cards {
  display: flex;
  gap: 1rem;
}

.stat-card {
  background: white;
  padding: 1rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid #f0f1f3;
}

.stat-card.pending {
  background: #fffbf7;
}

.stat-card.pending svg {
  color: #f59e0b;
}

.stat-card.completed {
  background: #f7fef9;
}

.stat-card.completed svg {
  color: #10b981;
}

.stat-card.rejected {
  background: #fdf7f7;
}

.stat-card.rejected svg {
  color: #ef4444;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

/* Tabs */
.tabs-container {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.tabs-nav {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
}

.tab-button:hover {
  color: #475569;
  background: #f1f5f9;
}

.tab-button.active {
  color: var(--text);
  border-bottom-color: var(--text);
  background: white;
}

/* Search and Filter Section */
.search-filter-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-container {
  flex: 1;
  min-width: 250px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: #64748b;
  pointer-events: none;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  transition: all 0.25s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: #cbd5e1;
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
}

.filter-toggle:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.filter-toggle svg {
  color: #64748b;
}

/* Filters Panel */
.filters-panel {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 1.5rem;
  align-items: flex-start;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.5;
  min-height: 1.3125rem;
}

.amount-filter,
.date-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.amount-input,
.date-input {
  flex: 1;
  padding: 0.625rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  transition: all 0.25s ease;
}

.amount-input:focus,
.date-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.amount-input::placeholder {
  color: #cbd5e1;
}

.dash {
  color: #cbd5e1;
  font-weight: 500;
}

.btn-reset-filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
  align-self: flex-start;
  margin-top: 1.8125rem;
}

.btn-reset-filters:hover {
  background: #e2e8f0;
  color: #475569;
  border-color: #cbd5e1;
}

.btn-reset-filters svg {
  width: 16px;
  height: 16px;
}

/* Loading & Empty States */
.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f1f3;
}

.loading-state svg.spin {
  animation: spin 1s linear infinite;
  color: #3b82f6;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state svg {
  color: #10b981;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.5rem;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #64748b;
}

/* Payments List */
.payments-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

@media (max-width: 1200px) {
  .payments-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .payments-list {
    grid-template-columns: 1fr;
  }
}

.payment-card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  border: 1px solid #f0f1f3;
  display: flex;
  flex-direction: column;
  transition: all 0.25s ease;
}

.payment-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: #e2e8f0;
}



.payment-card.completed .payment-header {
  background: #f7fef9;
  border-bottom: 1px solid #d1fae5;
}


.payment-card.rejected .payment-header {
  background: #fdf7f7;
  border-bottom: 1px solid #fee2e2;
}

.payment-header {
  padding: 1rem;
  background: #fffbf7;
  border-bottom: 1px solid #fecaca;

  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.payment-title {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.lead-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  flex: 1;
}

.payment-title h3 {
  font-size: 0.8125rem;
  color: #1e293b;
  margin: 0;
  font-weight: 600;
  line-height: 1.2;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.lead-id {
  font-size: 0.625rem;
  color: #64748b;
  font-weight: 400;
  word-break: break-all;
  margin-top: 0.125rem;
}

.payment-amount {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 0.375rem;
  flex-shrink: 0;
}

.amount {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}

.pending-badge {
  background: #f59e0b;
  color: white;
}

.completed-badge {
  background: #10b981;
  color: white;
}

.rejected-badge {
  background: #ef4444;
  color: white;
}

/* Payment Details */
.payment-details {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.detail-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.detail-item {
  display: flex;
  gap: 0.375rem;
  align-items: center;
}

.detail-item.compact {
  flex: 1;
  min-width: 0;
}

.detail-item svg {
  color: #64748b;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}

.detail-value {
  font-size: 0.75rem;
  color: #1e293b;
  font-weight: 500;
  line-height: 1.3;
  word-break: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* IBAN Details */
.iban-details {
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.iban-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.6875rem;
}

.iban-label {
  color: #64748b;
  flex-shrink: 0;
  font-weight: 500;
}

.iban-value {
  color: #1e293b;
  font-weight: 500;
  text-align: right;
  word-break: break-all;
  flex: 1;
  min-width: 0;
}

.iban-value.monospace {
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
  font-size: 0.625rem;
}

/* Admin Notes */
.admin-notes-section {
  margin-top: 0.75rem;
}

.notes-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.75rem;
  resize: vertical;
  font-family: inherit;
  line-height: 1.4;
  background: #fafbfc;
  transition: all 0.25s ease;
}

.notes-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Compact Notes */
.compact-notes {
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  line-height: 1.4;
  border: 1px solid transparent;
}

.compact-notes.completed {
  background: #f7fef9;
  border-color: #d1fae5;
}

.compact-notes.completed p {
  color: #047857;
  margin: 0;
  font-weight: 500;
}

.compact-notes.rejected {
  background: #fdf7f7;
  border-color: #fee2e2;
}

.compact-notes.rejected p {
  color: #b91c1c;
  margin: 0;
  font-weight: 500;
}


/* Lead Navigation */
.lead-navigation {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
}

.btn-view-lead {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.btn-view-lead:hover {
  background: #2563eb;
  border-color: #2563eb;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.25);
}

.btn-view-lead svg {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

/* Payment Actions */
.payment-actions {
  padding: 0.75rem 1rem;
  background: #fafbfc;
  display: flex;
  gap: 0.75rem;
  border-top: 1px solid #e2e8f0;
  margin-top: auto;
}

.btn-confirm,
.btn-reject {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  transition: all 0.25s ease;
}

.btn-confirm svg,
.btn-reject svg {
  width: 16px;
  height: 16px;
}

.btn-confirm {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.btn-confirm:hover:not(:disabled) {
  background: #059669;
  border-color: #059669;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
}

.btn-reject {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.btn-reject:hover:not(:disabled) {
  background: #dc2626;
  border-color: #dc2626;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.25);
}

.btn-confirm:disabled,
.btn-reject:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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
  z-index: 9999;
  padding: 1rem;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #1e293b;
  font-weight: 600;
}

.modal-icon {
  flex-shrink: 0;
}

.modal-icon.confirm {
  color: #3b82f6;
}

.modal-icon.warning {
  color: #f59e0b;
}

.modal-icon.success {
  color: #10b981;
}

.modal-icon.error {
  color: #ef4444;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  color: #64748b;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.modal-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.modal-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  resize: vertical;
  font-family: inherit;
}

.modal-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.modal-btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-btn.cancel {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.modal-btn.cancel:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.modal-btn.confirm {
  background: #10b981;
  color: white;
  border: 1px solid #10b981;
}

.modal-btn.confirm:hover {
  background: #059669;
  border-color: #059669;
}

.modal-btn.reject {
  background: #ef4444;
  color: white;
  border: 1px solid #ef4444;
}

.modal-btn.reject:hover {
  background: #dc2626;
  border-color: #dc2626;
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .pending-payments {
    padding: 1rem;
    max-width: 95%;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-cards {
    width: 100%;
  }

  .tabs-nav {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .tab-button {
    padding: 0.875rem 1rem;
    font-size: 0.8125rem;
  }

  .search-filter-section {
    flex-direction: column;
  }

  .search-container {
    width: 100%;
    min-width: 100%;
  }

  .filter-toggle {
    width: 100%;
  }

  .filters-panel {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .btn-reset-filters {
    grid-column: 1 / -1;
  }

  .payment-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .payment-amount {
    width: 100%;
    align-items: flex-start;
  }

  .detail-row {
    grid-template-columns: 1fr;
  }

  .payment-actions {
    flex-direction: column;
  }

  .modal-content {
    margin: 1rem;
  }

  .modal-footer {
    flex-direction: column;
  }

  .modal-btn {
    width: 100%;
  }
}
</style>
