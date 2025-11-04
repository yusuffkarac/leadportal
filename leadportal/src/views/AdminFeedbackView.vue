<template>
  <div class="admin-feedback-page">
    <div class="page-content">
      <div class="page-header">
        <h1>Geri Bildirimler</h1>
        <p class="header-subtitle">Müşteri feedback'lerini yönetin</p>
      </div>

      <!-- Filters Section -->
      <div class="filters-section">
        <div class="filter-group">
          <div class="filter-item">
            <label>Durum</label>
            <select v-model="selectedStatus" class="filter-select">
              <option value="">Tümü</option>
              <option value="OPEN">Açık</option>
              <option value="IN_PROGRESS">İşlemde</option>
              <option value="RESOLVED">Çözüldü</option>
              <option value="CLOSED">Kapalı</option>
            </select>
          </div>
          <div class="filter-item">
            <label>Öncelik</label>
            <select v-model="selectedPriority" class="filter-select">
              <option value="">Tümü</option>
              <option value="LOW">Düşük</option>
              <option value="MEDIUM">Orta</option>
              <option value="HIGH">Yüksek</option>
              <option value="URGENT">Acil</option>
            </select>
          </div>
          <div class="filter-item">
            <label>Atanan Kişi</label>
            <select v-model="selectedAssignee" class="filter-select">
              <option value="">Tümü</option>
              <option value="unassigned">Atanmamış</option>
              <option v-for="admin in adminUsers" :key="admin.id" :value="admin.id">
                {{ admin.email }}
              </option>
            </select>
          </div>
          <div class="filter-item search-item">
            <label>Ara</label>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Yorum, e-posta, lead başlığı..."
              class="search-input"
            />
          </div>
          <button class="btn-reset" @click="resetFilters" title="Filtreleri Temizle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Geri bildirimler yükleniyor...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredFeedbacks.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h3>Geri bildirim bulunamadı</h3>
        <p>Seçilen filtrelerle eşleşen geri bildirim yok.</p>
      </div>

      <!-- Feedbacks List -->
      <div v-else class="feedbacks-list">
        <div
          v-for="feedback in filteredFeedbacks"
          :key="feedback.id"
          class="feedback-card"
          :class="`priority-${feedback.priority?.toLowerCase()}`"
        >
          <div class="feedback-header">
            <div class="feedback-info">
              <h3 class="feedback-title">{{ feedback.subject }}</h3>
              <div class="feedback-meta">
                <span class="user-email">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  {{ feedback.user.email }}
                </span>
                <span class="lead-title">{{ feedback.leadSale.lead.title }}</span>
              </div>
            </div>
            <div class="feedback-badges">
              <span class="status-badge" :class="feedback.status.toLowerCase()">
                {{ getStatusLabel(feedback.status) }}
              </span>
              <span class="priority-badge" :class="feedback.priority.toLowerCase()">
                {{ getPriorityLabel(feedback.priority) }}
              </span>
              <span v-if="feedback.rating" class="rating-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                {{ feedback.rating }}/5
              </span>
            </div>
          </div>

          <div v-if="feedback.comment" class="feedback-comment">
            <p>{{ feedback.comment }}</p>
          </div>

          <div class="feedback-actions-bar">
            <div class="action-group">
              <label class="assign-label">Ata:</label>
              <select
                :value="feedback.assignedTo || ''"
                @change="assignFeedback(feedback.id, $event.target.value)"
                class="assign-select"
              >
                <option value="">Atanmamış</option>
                <option v-for="admin in adminUsers" :key="admin.id" :value="admin.id">
                  {{ admin.email }}
                </option>
              </select>
              <div v-if="feedback.assignedToUser" class="assigned-to">
                Atanan: <strong>{{ feedback.assignedToUser.email }}</strong>
              </div>
            </div>
            <div class="action-group">
              <label class="status-label">Durum:</label>
              <select
                :value="feedback.status"
                @change="updateStatus(feedback.id, $event.target.value)"
                class="status-select"
              >
                <option value="OPEN">Açık</option>
                <option value="IN_PROGRESS">İşlemde</option>
                <option value="RESOLVED">Çözüldü</option>
                <option value="CLOSED">Kapalı</option>
              </select>
            </div>
            <button class="btn-view-details" @click="selectFeedbackForReply(feedback)" title="Detaylar">
              Detaylar & Cevap
            </button>
          </div>

          <!-- Replies Preview -->
          <div v-if="feedback.replies && feedback.replies.length > 0" class="replies-preview">
            <div class="replies-count">
              {{ feedback.replies.length }} cevap
            </div>
          </div>

          <div v-if="feedback.closedAt" class="closed-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Kapalı: {{ formatDate(feedback.closedAt) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Feedback Detail Modal -->
    <div v-if="selectedFeedback" class="modal-overlay" @click.self="selectedFeedback = null">
      <div class="modal-content feedback-detail-modal">
        <div class="modal-header">
          <h2>{{ selectedFeedback.subject }}</h2>
          <button class="btn-close" @click="selectedFeedback = null">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Original Feedback -->
          <div class="original-feedback">
            <div class="user-section">
              <div class="user-info">
                <div class="user-email">{{ selectedFeedback.user.email }}</div>
                <div class="user-name">{{ selectedFeedback.user.firstName }} {{ selectedFeedback.user.lastName }}</div>
              </div>
              <div class="feedback-date">{{ formatDate(selectedFeedback.createdAt) }}</div>
            </div>

            <div v-if="selectedFeedback.rating" class="rating-display">
              <div class="rating-stars">
                <svg v-for="i in 5" :key="i" width="16" height="16" viewBox="0 0 24 24" :fill="i <= selectedFeedback.rating ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span class="rating-text">{{ selectedFeedback.rating }}/5</span>
            </div>

            <div v-if="selectedFeedback.comment" class="comment-section">
              <p>{{ selectedFeedback.comment }}</p>
            </div>

            <div class="lead-info-detail">
              <strong>Lead:</strong> {{ selectedFeedback.leadSale.lead.title }}
            </div>
          </div>

          <!-- Conversation Thread -->
          <div class="conversation-thread">
            <h3>Sohbet Geçmişi</h3>
            <div v-if="selectedFeedback.replies.length === 0" class="no-replies">
              Henüz cevap yok
            </div>
            <div v-else class="replies-list">
              <div v-for="reply in selectedFeedback.replies" :key="reply.id" class="reply-message" :class="{ 'is-admin': reply.user.id === currentUserId }">
                <div class="reply-header">
                  <span class="reply-user">
                    {{ reply.user.email }}
                    <span v-if="reply.isAdmin" class="admin-badge">Admin</span>
                  </span>
                  <span class="reply-time">{{ formatDate(reply.createdAt) }}</span>
                </div>
                <div class="reply-message-text">{{ reply.message }}</div>
              </div>
            </div>
          </div>

          <!-- Reply Input -->
          <div class="reply-input-section">
            <textarea
              v-model="replyMessage"
              placeholder="Cevabınızı yazın..."
              class="reply-textarea"
              @keydown.meta.enter="sendReply"
              @keydown.ctrl.enter="sendReply"
            />
            <button
              @click="sendReply"
              :disabled="!replyMessage.trim() || replyLoading"
              class="btn-send-reply"
            >
              <span v-if="!replyLoading">Gönder</span>
              <span v-else>Gönderiliyor...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const feedbacks = ref([])
const loading = ref(true)
const selectedStatus = ref('')
const selectedPriority = ref('')
const selectedAssignee = ref('')
const searchQuery = ref('')
const adminUsers = ref([])
const selectedFeedback = ref(null)
const replyMessage = ref('')
const replyLoading = ref(false)
const currentUserId = ref(localStorage.getItem('userId') || '')

const token = localStorage.getItem('token') || sessionStorage.getItem('token')

// Fetch feedbacks
async function fetchFeedbacks() {
  try {
    loading.value = true
    const params = new URLSearchParams()
    if (selectedStatus.value) params.append('status', selectedStatus.value)
    if (selectedPriority.value) params.append('priority', selectedPriority.value)
    if (selectedAssignee.value && selectedAssignee.value !== 'unassigned') {
      params.append('assignedTo', selectedAssignee.value)
    }
    if (searchQuery.value) params.append('search', searchQuery.value)

    const response = await axios.get(`/api/feedback/admin/all?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    feedbacks.value = response.data
  } catch (error) {
    console.error('Geri bildirimleri yükleme hatası:', error)
  } finally {
    loading.value = false
  }
}

// Fetch admin users for assignment dropdown
async function fetchAdminUsers() {
  try {
    const response = await axios.get('/api/user-types/admins', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    adminUsers.value = response.data
  } catch (error) {
    console.error('Admin kullanıcıları yükleme hatası:', error)
  }
}

// Assign feedback to admin
async function assignFeedback(feedbackId, adminId) {
  try {
    await axios.patch(`/api/feedback/${feedbackId}/assign`,
      { assignedTo: adminId || null },
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    await fetchFeedbacks()
  } catch (error) {
    console.error('Atama hatası:', error)
    alert('Atama yapılamadı')
  }
}

// Update feedback status
async function updateStatus(feedbackId, newStatus) {
  try {
    await axios.patch(`/api/feedback/${feedbackId}/status`,
      { status: newStatus },
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    await fetchFeedbacks()
    if (selectedFeedback.value?.id === feedbackId) {
      selectedFeedback.value.status = newStatus
    }
  } catch (error) {
    console.error('Durum güncelleme hatası:', error)
    alert('Durum güncellenemedi')
  }
}

// Send reply
async function sendReply() {
  if (!replyMessage.value.trim() || !selectedFeedback.value) return

  try {
    replyLoading.value = true
    await axios.post(`/api/feedback/${selectedFeedback.value.id}/reply`,
      { message: replyMessage.value },
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    replyMessage.value = ''
    // Reload the selected feedback
    const response = await axios.get(`/api/feedback/${selectedFeedback.value.id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    selectedFeedback.value = response.data
    await fetchFeedbacks()
  } catch (error) {
    console.error('Cevap gönderme hatası:', error)
    alert('Cevap gönderilemedi')
  } finally {
    replyLoading.value = false
  }
}

// Select feedback for detailed view and reply
async function selectFeedbackForReply(feedback) {
  try {
    const response = await axios.get(`/api/feedback/${feedback.id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    selectedFeedback.value = response.data
    replyMessage.value = ''
  } catch (error) {
    console.error('Geri bildirim yükleme hatası:', error)
    alert('Geri bildirim detayları yüklenemedi')
  }
}

// Format date
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

// Get status label
function getStatusLabel(status) {
  const labels = {
    'OPEN': 'Açık',
    'IN_PROGRESS': 'İşlemde',
    'RESOLVED': 'Çözüldü',
    'CLOSED': 'Kapalı'
  }
  return labels[status] || status
}

// Get priority label
function getPriorityLabel(priority) {
  const labels = {
    'LOW': 'Düşük',
    'MEDIUM': 'Orta',
    'HIGH': 'Yüksek',
    'URGENT': 'Acil'
  }
  return labels[priority] || priority
}

// Reset filters
function resetFilters() {
  selectedStatus.value = ''
  selectedPriority.value = ''
  selectedAssignee.value = ''
  searchQuery.value = ''
  fetchFeedbacks()
}

// Computed filtered feedbacks
const filteredFeedbacks = computed(() => {
  let filtered = feedbacks.value

  // Additional client-side filtering if needed
  // Most filtering is done server-side for efficiency

  return filtered
})

onMounted(async () => {
  await fetchAdminUsers()
  await fetchFeedbacks()
})
</script>

<style scoped>
.admin-feedback-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 40px 20px;
}

.page-content {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px;
}

.header-subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

/* Filters Section */
.filters-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 32px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.filter-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  align-items: flex-end;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-item label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-select,
.search-input {
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  color: #1e293b;
  transition: all 0.2s ease;
}

.filter-select:hover,
.search-input:hover {
  border-color: #94a3b8;
}

.filter-select:focus,
.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-item {
  grid-column: span 1;
}

.btn-reset {
  padding: 10px 16px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  cursor: pointer;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.btn-reset:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
  color: #1e293b;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  color: #64748b;
  font-size: 16px;
  margin: 0;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  background: white;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: #f1f5f9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  margin-bottom: 24px;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 8px;
}

.empty-state p {
  color: #64748b;
  margin: 0;
}

/* Feedbacks List */
.feedbacks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feedback-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.feedback-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.feedback-card.priority-urgent {
  border-left: 4px solid #dc2626;
  background: linear-gradient(to right, rgba(220, 38, 38, 0.02), white);
}

.feedback-card.priority-high {
  border-left: 4px solid #f59e0b;
  background: linear-gradient(to right, rgba(245, 158, 11, 0.02), white);
}

.feedback-card.priority-medium {
  border-left: 4px solid #3b82f6;
  background: linear-gradient(to right, rgba(59, 130, 246, 0.02), white);
}

.feedback-card.priority-low {
  border-left: 4px solid #10b981;
  background: linear-gradient(to right, rgba(16, 185, 129, 0.02), white);
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.feedback-info {
  flex: 1;
}

.feedback-title {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 8px;
}

.feedback-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
  color: #64748b;
}

.user-email,
.lead-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.feedback-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-badge,
.priority-badge,
.rating-badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-badge {
  background: #f1f5f9;
  color: #475569;
}

.status-badge.open {
  background: #dbeafe;
  color: #0369a1;
}

.status-badge.in_progress {
  background: #fed7aa;
  color: #b45309;
}

.status-badge.resolved {
  background: #bbf7d0;
  color: #065f46;
}

.status-badge.closed {
  background: #e5e7eb;
  color: #374151;
}

.priority-badge {
  background: #f1f5f9;
  color: #475569;
}

.priority-badge.low {
  background: #dcfce7;
  color: #15803d;
}

.priority-badge.medium {
  background: #dbeafe;
  color: #0369a1;
}

.priority-badge.high {
  background: #fed7aa;
  color: #b45309;
}

.priority-badge.urgent {
  background: #fee2e2;
  color: #991b1b;
}

.rating-badge {
  background: #fef3c7;
  color: #92400e;
  gap: 6px;
}

.feedback-comment {
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  border-left: 3px solid #cbd5e1;
}

.feedback-comment p {
  margin: 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.6;
}

.feedback-actions-bar {
  display: flex;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  flex-wrap: wrap;
  align-items: center;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assign-label,
.status-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

.assign-select,
.status-select {
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.assign-select:hover,
.status-select:hover {
  border-color: #94a3b8;
}

.assign-select:focus,
.status-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.assigned-to {
  font-size: 13px;
  color: #64748b;
}

.btn-view-details {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-view-details:hover {
  background: #2563eb;
}

.replies-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  color: #64748b;
  font-size: 13px;
}

.replies-count {
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.closed-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
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
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
}

.feedback-detail-modal {
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #f1f5f9;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.btn-close:hover {
  color: #0f172a;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.original-feedback {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.user-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.user-info {
  flex: 1;
}

.user-email {
  font-weight: 600;
  color: #0f172a;
  display: block;
  margin-bottom: 4px;
}

.user-name {
  font-size: 14px;
  color: #64748b;
}

.feedback-date {
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
}

.rating-display {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.rating-stars {
  display: flex;
  gap: 4px;
  color: #fbbf24;
}

.rating-text {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.comment-section {
  background: white;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.comment-section p {
  margin: 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.6;
}

.lead-info-detail {
  font-size: 13px;
  color: #64748b;
}

.conversation-thread {
  margin-bottom: 24px;
}

.conversation-thread h3 {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 16px;
}

.no-replies {
  text-align: center;
  padding: 20px;
  color: #64748b;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 14px;
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-message {
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 3px solid #cbd5e1;
}

.reply-message.is-admin {
  background: #dbeafe;
  border-left-color: #3b82f6;
}

.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
}

.reply-user {
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
}

.admin-badge {
  background: #3b82f6;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.reply-time {
  color: #64748b;
  font-size: 12px;
}

.reply-message-text {
  color: #475569;
  font-size: 14px;
  line-height: 1.6;
}

.reply-input-section {
  display: flex;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #f1f5f9;
}

.reply-textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  color: #1e293b;
  transition: all 0.2s ease;
}

.reply-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-send-reply {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  align-self: flex-start;
}

.btn-send-reply:hover:not(:disabled) {
  background: #2563eb;
}

.btn-send-reply:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .admin-feedback-page {
    padding: 20px 16px;
  }

  .page-header h1 {
    font-size: 24px;
  }

  .filter-group {
    grid-template-columns: 1fr;
  }

  .feedback-header {
    flex-direction: column;
  }

  .feedback-badges {
    width: 100%;
  }

  .feedback-actions-bar {
    flex-direction: column;
  }

  .action-group {
    width: 100%;
  }

  .btn-view-details {
    width: 100%;
  }

  .modal-overlay {
    padding: 16px;
  }

  .modal-content {
    max-height: 95vh;
  }

  .reply-input-section {
    flex-direction: column;
  }

  .btn-send-reply {
    width: 100%;
    align-self: stretch;
  }
}
</style>
