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
    <div class="tabs">
      <button
        class="tab"
        :class="{ active: activeTab === 'pending' }"
        @click="switchTab('pending')"
      >
        <Icon icon="mdi:clock-alert-outline" width="18" />
        Bekleyen ({{ pendingPayments.length }})
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'completed' }"
        @click="switchTab('completed')"
      >
        <Icon icon="mdi:check-circle" width="18" />
        Onaylanmış ({{ completedPayments.length }})
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'rejected' }"
        @click="switchTab('rejected')"
      >
        <Icon icon="mdi:close-circle" width="18" />
        Reddedilmiş ({{ rejectedPayments.length }})
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
            <h3>{{ payment.lead.title }}</h3>
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
            <div class="detail-item">
              <Icon icon="mdi:account" width="18" />
              <div>
                <div class="detail-label">Alıcı</div>
                <div class="detail-value">
                  {{ payment.buyer.firstName || payment.buyer.email }}
                  <span v-if="payment.buyer.lastName">{{ payment.buyer.lastName }}</span>
                </div>
                <div class="detail-sub">{{ payment.buyer.email }}</div>
              </div>
            </div>

            <div class="detail-item">
              <Icon icon="mdi:calendar" width="18" />
              <div>
                <div class="detail-label">Tarih</div>
                <div class="detail-value">{{ formatDate(payment.createdAt) }}</div>
              </div>
            </div>

            <div class="detail-item">
              <Icon icon="mdi:credit-card" width="18" />
              <div>
                <div class="detail-label">Yöntem</div>
                <div class="detail-value">IBAN</div>
              </div>
            </div>
          </div>

          <!-- IBAN Details -->
          <div class="iban-details">
            <div class="iban-header">
              <Icon icon="mdi:bank" width="18" />
              <span>IBAN Bilgileri</span>
            </div>
            <div class="iban-info">
              <div class="iban-row">
                <span class="iban-label">Hesap Sahibi:</span>
                <span class="iban-value">{{ payment.buyer.ibanAccountHolder || 'Belirtilmemiş' }}</span>
              </div>
              <div class="iban-row">
                <span class="iban-label">IBAN:</span>
                <span class="iban-value monospace">{{ payment.buyer.ibanNumber || 'Belirtilmemiş' }}</span>
              </div>
            </div>
          </div>

          <!-- Admin Notes - Only for pending -->
          <div v-if="activeTab === 'pending'" class="admin-notes-section">
            <label>Admin Notu</label>
            <textarea
              v-model="payment.adminNotes"
              placeholder="Not ekleyin..."
              rows="2"
              class="notes-input"
            ></textarea>
          </div>

          <!-- Show admin notes if completed -->
          <div v-if="activeTab === 'completed' && payment.adminNotes" class="completed-notes">
            <div class="notes-header">
              <Icon icon="mdi:note-text-outline" width="18" />
              <span>Admin Notu</span>
            </div>
            <p>{{ payment.adminNotes }}</p>
          </div>

          <!-- Show rejection reason if rejected -->
          <div v-if="activeTab === 'rejected' && payment.adminNotes" class="rejected-notes">
            <div class="notes-header rejected">
              <Icon icon="mdi:note-alert-outline" width="18" />
              <span>Red Nedeni</span>
            </div>
            <p>{{ payment.adminNotes }}</p>
          </div>

          <!-- Show confirmation details if completed -->
          <div v-if="activeTab === 'completed'" class="confirmation-details">
            <div class="confirmation-item">
              <Icon icon="mdi:calendar-check" width="18" />
              <div>
                <div class="detail-label">Onay Tarihi</div>
                <div class="detail-value">{{ formatDate(payment.confirmedAt) }}</div>
              </div>
            </div>
          </div>

          <!-- Show rejection details if rejected -->
          <div v-if="activeTab === 'rejected'" class="rejection-details">
            <div class="confirmation-item">
              <Icon icon="mdi:calendar-remove" width="18" />
              <div>
                <div class="detail-label">Red Tarihi</div>
                <div class="detail-value">{{ formatDate(payment.confirmedAt) }}</div>
              </div>
            </div>
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
import { Icon } from '@iconify/vue'
import axios from '../utils/axios'

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

const totalPendingRevenue = computed(() => {
  return pendingPayments.value.reduce((sum, payment) => sum + payment.amount, 0)
})

const totalCompletedRevenue = computed(() => {
  return completedPayments.value.reduce((sum, payment) => sum + payment.amount, 0)
})

const displayedPayments = computed(() => {
  if (activeTab.value === 'pending') return pendingPayments.value
  if (activeTab.value === 'completed') return completedPayments.value
  return rejectedPayments.value
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

    // Remove from list
    pendingPayments.value = pendingPayments.value.filter(p => p.id !== payment.id)
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

    // Remove from list
    pendingPayments.value = pendingPayments.value.filter(p => p.id !== payment.id)
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

const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'completed' && completedPayments.value.length === 0) {
    fetchCompletedPayments()
  } else if (tab === 'rejected' && rejectedPayments.value.length === 0) {
    fetchRejectedPayments()
  }
}

onMounted(() => {
  fetchPendingPayments()
})
</script>

<style scoped>
.pending-payments {
  padding: 1.25rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  gap: 1rem;
  flex-wrap: wrap;
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
  padding: 0.875rem 1rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-card.pending {
  border-left: 4px solid #f59e0b;
}

.stat-card.completed {
  border-left: 4px solid #10b981;
}

.stat-card svg {
  color: #64748b;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 0.75rem;
  color: #64748b;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  border-bottom: 2px solid #e2e8f0;
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tab:hover {
  color: #1e293b;
  background: #f8fafc;
}

.tab.active {
  color: #1e293b;
  border-bottom-color: #f59e0b;
}

/* Loading & Empty States */
.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.payment-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border-left: 3px solid #f59e0b;
}

.payment-card.completed {
  border-left-color: #10b981;
}

.payment-card.completed .payment-header {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.payment-card.rejected {
  border-left-color: #ef4444;
}

.payment-card.rejected .payment-header {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
}

.payment-header {
  padding: 1rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.payment-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.payment-title h3 {
  font-size: 1rem;
  color: #1e293b;
  margin: 0;
  font-weight: 600;
}

.payment-amount {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.amount {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.badge {
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
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
}

.detail-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  gap: 0.75rem;
}

.detail-item svg {
  color: #64748b;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.detail-label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.detail-value {
  font-size: 1rem;
  color: #1e293b;
  font-weight: 600;
}

.detail-sub {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.25rem;
}

/* IBAN Details */
.iban-details {
  background: #f8fafc;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.iban-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.75rem;
}

.iban-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.iban-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.iban-label {
  font-size: 0.875rem;
  color: #64748b;
}

.iban-value {
  font-size: 0.875rem;
  color: #1e293b;
  font-weight: 500;
}

.iban-value.monospace {
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
}

/* Admin Notes */
.admin-notes-section {
  margin-top: 1rem;
}

.admin-notes-section label {
  display: block;
  font-size: 0.875rem;
  color: #1e293b;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.notes-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  resize: vertical;
  font-family: inherit;
}

.notes-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Completed Notes */
.completed-notes {
  background: #f0fdf4;
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 1rem;
}

.notes-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #065f46;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.completed-notes p {
  color: #047857;
  font-size: 0.875rem;
  margin: 0;
}

/* Rejected Notes */
.rejected-notes {
  background: #fef2f2;
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 1rem;
}

.notes-header.rejected {
  color: #991b1b;
}

.rejected-notes p {
  color: #b91c1c;
  font-size: 0.875rem;
  margin: 0;
}

/* Confirmation Details */
.confirmation-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.confirmation-item {
  display: flex;
  gap: 0.75rem;
  align-items: start;
}

.confirmation-item svg {
  color: #10b981;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

/* Rejection Details */
.rejection-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.rejection-details .confirmation-item svg {
  color: #ef4444;
}

/* Payment Actions */
.payment-actions {
  padding: 1rem;
  background: #f8fafc;
  display: flex;
  gap: 0.75rem;
  border-top: 1px solid #e2e8f0;
}

.btn-confirm,
.btn-reject {
  flex: 1;
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  transition: all 0.2s;
}

.btn-confirm {
  background: #10b981;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-reject {
  background: #ef4444;
  color: white;
}

.btn-reject:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-confirm:disabled,
.btn-reject:disabled {
  opacity: 0.5;
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
}

.modal-btn.cancel:hover {
  background: #e2e8f0;
}

.modal-btn.confirm {
  background: #10b981;
  color: white;
}

.modal-btn.confirm:hover {
  background: #059669;
}

.modal-btn.reject {
  background: #ef4444;
  color: white;
}

.modal-btn.reject:hover {
  background: #dc2626;
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .pending-payments {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-cards {
    width: 100%;
  }

  .tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .tab {
    white-space: nowrap;
    padding: 0.625rem 1rem;
    font-size: 0.8125rem;
  }

  .payment-header {
    flex-direction: column;
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
