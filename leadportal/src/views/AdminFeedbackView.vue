<template>
  <div class="admin-feedback-page">
    <div class="page-content">
      <div class="page-header">
        <h1>Feedback</h1>
        <p class="header-subtitle">Kundenfeedback verwalten</p>
      </div>

      <!-- Filters Section -->
      <div class="filters-section">
        <div class="filter-group">
          <div class="filter-item">
            <label>Status</label>
            <select v-model="selectedStatus" class="filter-select">
              <option value="">Alle</option>
              <option value="OPEN">Offen</option>
              <option value="IN_PROGRESS">In Bearbeitung</option>
              <option value="RESOLVED">Gelöst</option>
              <option value="CLOSED">Geschlossen</option>
            </select>
          </div>
          <div class="filter-item">
            <label>Priorität</label>
            <select v-model="selectedPriority" class="filter-select">
              <option value="">Alle</option>
              <option value="LOW">Niedrig</option>
              <option value="MEDIUM">Mittel</option>
              <option value="HIGH">Hoch</option>
              <option value="URGENT">Dringend</option>
            </select>
          </div>
          <div class="filter-item">
            <label>Zugewiesen an</label>
            <select v-model="selectedAssignee" class="filter-select">
              <option value="">Alle</option>
              <option value="unassigned">Nicht zugewiesen</option>
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
              placeholder="Kommentar, E-Mail, Lead-Titel..."
              class="search-input"
            />
          </div>
          <button class="btn-reset" @click="resetFilters" title="Filter zurücksetzen">
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
        <p>Feedback wird geladen...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredFeedbacks.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h3>Kein Feedback gefunden</h3>
        <p>Kein Feedback entspricht den ausgewählten Filtern.</p>
      </div>

      <!-- Feedbacks List -->
      <div v-else class="feedbacks-list">
        <div class="list-header">
          <div class="list-col col-subject">Betreff</div>
          <div class="list-col col-user">Benutzer</div>
          <div class="list-col col-status">Status</div>
          <div class="list-col col-priority">Priorität</div>
          <div class="list-col col-rating">Bewertung</div>
          <div class="list-col col-replies">Antworten</div>
          <div class="list-col col-actions">Aktionen</div>
        </div>
        <div
          v-for="feedback in filteredFeedbacks"
          :key="feedback.id"
          class="feedback-list-item"
          :class="`status-${feedback.status.toLowerCase()}`"
        >
          <div class="list-row">
            <div class="list-col col-subject">
              <div class="subject-content">
                <div class="subject-title">{{ feedback.subject }}</div>
                <div v-if="feedback.comment" class="subject-comment">{{ feedback.comment.substring(0, 60) }}{{ feedback.comment.length > 60 ? '...' : '' }}</div>
                <div class="subject-lead">{{ feedback.leadSale.lead.title }} ({{ feedback.leadSale.lead.id }})</div>
              </div>
            </div>
            <div class="list-col col-user">
              <div class="user-content">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>{{ feedback.user.email }}</span>
              </div>
              <div v-if="feedback.assignedToUser" class="assigned-user">
                Zugewiesen: {{ feedback.assignedToUser.email }}
              </div>
            </div>
            <div class="list-col col-status">
              <span class="status-badge" :class="feedback.status.toLowerCase()">
                {{ getStatusLabel(feedback.status) }}
              </span>
              <div v-if="feedback.closedAt" class="closed-time">
                {{ formatDate(feedback.closedAt) }}
              </div>
            </div>
            <div class="list-col col-priority">
              <span class="priority-badge" :class="feedback.priority.toLowerCase()">
                {{ getPriorityLabel(feedback.priority) }}
              </span>
            </div>
            <div class="list-col col-rating">
              <span v-if="feedback.rating" class="rating-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                {{ feedback.rating }}/5
              </span>
              <span v-else class="no-rating">-</span>
            </div>
            <div class="list-col col-replies">
              <span v-if="feedback.replies && feedback.replies.length > 0" class="replies-count">
                {{ feedback.replies.length }}
              </span>
              <span v-else class="no-replies">-</span>
            </div>
            <div class="list-col col-actions">
              <div class="action-buttons">
                <select
                  :value="feedback.assignedTo || ''"
                  @change="assignFeedback(feedback.id, $event.target.value)"
                  class="assign-select-small"
                  title="Zuweisen"
                >
                  <option value="">Nicht zugewiesen</option>
                  <option v-for="admin in adminUsers" :key="admin.id" :value="admin.id">
                    {{ admin.email }}
                  </option>
                </select>
                <select
                  :value="feedback.status"
                  @change="openStatusChangeModal(feedback.id, $event.target.value)"
                  class="status-select-small"
                  title="Status"
                >
                  <option value="OPEN">Offen</option>
                  <option value="IN_PROGRESS">In Bearbeitung</option>
                  <option value="RESOLVED">Gelöst</option>
                  <option value="CLOSED">Geschlossen</option>
                </select>
                <button class="btn-action-small btn-details" @click="selectFeedbackForReply(feedback)" title="Details">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </button>
                <button class="btn-action-small btn-history" @click="openStatusHistoryModal(feedback)" title="Statusverlauf">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20M2 12h20"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Shared Feedback Modal (same as user view) -->
    <FeedbackModal
      :show="!!selectedFeedback"
      :selectedLead="selectedLeadForModal"
      :isAdmin="true"
      :currentUserId="currentUserId"
      @close="selectedFeedback = null"
    />

    <!-- Status Change Modal -->
    <div v-if="showStatusChangeModal" class="modal-overlay" @click.self="closeStatusChangeModal">
      <div class="status-modal">
        <div class="modal-header">
          <h3>Status ändern</h3>
          <button class="close-btn" @click="closeStatusChangeModal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Neuer Status</label>
            <select v-model="statusChangeForm.newStatus" class="form-select">
              <option value="OPEN">Offen</option>
              <option value="IN_PROGRESS">In Bearbeitung</option>
              <option value="RESOLVED">Gelöst</option>
              <option value="CLOSED">Geschlossen</option>
            </select>
          </div>
          <div class="form-group">
            <label>Internal Note <span class="required">*</span></label>
            <textarea
              v-model="statusChangeForm.internalNote"
              class="form-textarea"
              placeholder="Notiz zur Statusänderung schreiben..."
              rows="4"
              required
            ></textarea>
            <p class="help-text">Diese Notiz ist erforderlich und wird im Statusverlauf angezeigt.</p>
          </div>
          <div v-if="statusChangeError" class="error-message">
            {{ statusChangeError }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeStatusChangeModal">Abbrechen</button>
          <button
            class="btn-primary"
            @click="confirmStatusChange"
            :disabled="!statusChangeForm.internalNote.trim() || statusChangeLoading"
          >
            {{ statusChangeLoading ? 'Wird gespeichert...' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Status History Modal -->
    <div v-if="showStatusHistoryModal" class="modal-overlay" @click.self="closeStatusHistoryModal">
      <div class="status-history-modal">
        <div class="modal-header">
          <h3>Statusverlauf</h3>
          <button class="close-btn" @click="closeStatusHistoryModal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div v-if="statusHistoryLoading" class="loading-state">
            <p>Wird geladen...</p>
          </div>
          <div v-else-if="statusHistory.length === 0" class="empty-state">
            <p>Noch keine Statusänderungen.</p>
          </div>
          <div v-else class="history-list">
            <div
              v-for="(history, index) in statusHistory"
              :key="history.id"
              class="history-item"
            >
              <div class="history-header">
                <div class="history-status">
                  <span class="status-badge" :class="history.oldStatus?.toLowerCase() || 'initial'">
                    {{ history.oldStatus ? getStatusLabel(history.oldStatus) : 'Anfangsstatus' }}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                  <span class="status-badge" :class="history.newStatus.toLowerCase()">
                    {{ getStatusLabel(history.newStatus) }}
                  </span>
                </div>
                <div class="history-meta">
                  <span class="history-date">{{ formatDate(history.createdAt) }}</span>
                  <span class="history-user">{{ history.changedByUser?.email || history.changedByUser?.firstName || 'Unbekannt' }}</span>
                </div>
              </div>
              <div class="history-note">
                <strong>Notiz:</strong> {{ history.internalNote }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import FeedbackModal from '../components/FeedbackModal.vue'
import axios from 'axios'

const route = useRoute()

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

// Status change modal
const showStatusChangeModal = ref(false)
const statusChangeForm = ref({
  feedbackId: null,
  newStatus: 'OPEN',
  internalNote: ''
})
const statusChangeLoading = ref(false)
const statusChangeError = ref('')

// Status history modal
const showStatusHistoryModal = ref(false)
const statusHistory = ref([])
const statusHistoryLoading = ref(false)
const selectedFeedbackForHistory = ref(null)

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
    console.error('Fehler beim Laden des Feedbacks:', error)
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
    console.error('Fehler beim Laden der Admin-Benutzer:', error)
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
    console.error('Fehler bei der Zuweisung:', error)
    alert('Zuweisung konnte nicht durchgeführt werden')
  }
}

// Open status change modal
function openStatusChangeModal(feedbackId, newStatus) {
  const feedback = feedbacks.value.find(f => f.id === feedbackId)
  if (!feedback) return
  
  // Eğer durum değişmiyorsa modal açma
  if (feedback.status === newStatus) return
  
  statusChangeForm.value = {
    feedbackId: feedbackId,
    newStatus: newStatus,
    internalNote: ''
  }
  statusChangeError.value = ''
  showStatusChangeModal.value = true
}

// Close status change modal
function closeStatusChangeModal() {
  showStatusChangeModal.value = false
  statusChangeForm.value = {
    feedbackId: null,
    newStatus: 'OPEN',
    internalNote: ''
  }
  statusChangeError.value = ''
}

// Confirm status change
async function confirmStatusChange() {
  if (!statusChangeForm.value.internalNote.trim()) {
    statusChangeError.value = 'Interne Notiz ist erforderlich'
    return
  }

  try {
    statusChangeLoading.value = true
    statusChangeError.value = ''
    
    await axios.patch(`/api/feedback/${statusChangeForm.value.feedbackId}/status`,
      {
        status: statusChangeForm.value.newStatus,
        internalNote: statusChangeForm.value.internalNote
      },
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    
    await fetchFeedbacks()
    if (selectedFeedback.value?.id === statusChangeForm.value.feedbackId) {
      // Reload selected feedback to get updated status
      const response = await axios.get(`/api/feedback/${statusChangeForm.value.feedbackId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      selectedFeedback.value = response.data
    }
    
    closeStatusChangeModal()
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Status:', error)
    statusChangeError.value = error.response?.data?.error || 'Status konnte nicht aktualisiert werden'
  } finally {
    statusChangeLoading.value = false
  }
}

// Open status history modal
async function openStatusHistoryModal(feedback) {
  selectedFeedbackForHistory.value = feedback
  showStatusHistoryModal.value = true
  statusHistoryLoading.value = true
  
  try {
    const response = await axios.get(`/api/feedback/${feedback.id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    statusHistory.value = response.data.statusHistory || []
  } catch (error) {
    console.error('Fehler beim Laden des Statusverlaufs:', error)
    statusHistory.value = []
  } finally {
    statusHistoryLoading.value = false
  }
}

// Close status history modal
function closeStatusHistoryModal() {
  showStatusHistoryModal.value = false
  selectedFeedbackForHistory.value = null
  statusHistory.value = []
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
    console.error('Fehler beim Senden der Antwort:', error)
    alert('Antwort konnte nicht gesendet werden')
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
    console.error('Fehler beim Laden des Feedbacks:', error)
    alert('Feedback-Details konnten nicht geladen werden')
  }
}

// Map selected feedback to FeedbackModal's expected prop shape
const selectedLeadForModal = computed(() => {
  if (!selectedFeedback.value) return null
  const leadSaleId = selectedFeedback.value.leadSale?.id || selectedFeedback.value.leadSaleId
    const leadTitle = selectedFeedback.value.leadSale?.lead?.title || selectedFeedback.value.subject || 'Feedback'
  return {
    id: leadSaleId,
    feedbackId: selectedFeedback.value.id,
    lead: { title: leadTitle }
  }
})

// Format date
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', {
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
    'OPEN': 'Offen',
    'IN_PROGRESS': 'In Bearbeitung',
    'RESOLVED': 'Gelöst',
    'CLOSED': 'Geschlossen'
  }
  return labels[status] || status
}

// Get priority label
function getPriorityLabel(priority) {
  const labels = {
    'LOW': 'Niedrig',
    'MEDIUM': 'Mittel',
    'HIGH': 'Hoch',
    'URGENT': 'Dringend'
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

// Open feedback by ID (from notification click or direct link)
async function openFeedbackById(feedbackId) {
  try {
    const response = await axios.get(`/api/feedback/${feedbackId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    selectedFeedback.value = response.data
  } catch (error) {
    console.error('Fehler beim Laden des Feedbacks:', error)
  }
}

onMounted(async () => {
  await fetchAdminUsers()
  await fetchFeedbacks()

  // Check if feedback ID is in query params (from notification click)
  if (route.query.id) {
    await openFeedbackById(route.query.id)
  }
})

// Watch for query param changes
watch(() => route.query.id, (newId) => {
  if (newId) {
    openFeedbackById(newId)
  }
})
</script>

<style scoped>
.admin-feedback-page {
  min-height: 100vh;
  background: #f8fafc;
  width: 100%;
  margin: 0;
  padding: 0;
}

.page-content {
  max-width: 100%;
  margin: 0;
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
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.list-header {
  display: grid;
  grid-template-columns: 2fr 1.2fr 0.9fr 0.9fr 0.7fr 0.7fr 2fr;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 2px solid #e5e7eb;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.feedback-list-item {
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s ease;
}

.feedback-list-item:last-child {
  border-bottom: none;
}

.feedback-list-item:hover {
  background: #f8fafc;
}

.feedback-list-item.status-open {
  border-left: 3px solid #3b82f6;
}

.feedback-list-item.status-in_progress {
  border-left: 3px solid #f59e0b;
}

.feedback-list-item.status-resolved {
  border-left: 3px solid #10b981;
}

.feedback-list-item.status-closed {
  border-left: 3px solid #9ca3af;
}

.list-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 0.9fr 0.9fr 0.7fr 0.7fr 2fr;
  gap: 12px;
  padding: 12px 16px;
  align-items: center;
}

.list-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.col-subject {
  min-width: 0;
}

.subject-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.subject-title {
  font-weight: 600;
  color: #0f172a;
  font-size: 14px;
}

.subject-comment {
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.subject-lead {
  color: #94a3b8;
  font-size: 11px;
}

.col-user {
  min-width: 0;
}

.user-content {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #475569;
  font-size: 13px;
}

.user-content svg {
  color: #94a3b8;
  flex-shrink: 0;
}

.assigned-user {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.col-status {
  align-items: flex-start;
}

.col-priority,
.col-rating,
.col-replies {
  align-items: flex-start;
}

.no-rating,
.no-replies {
  color: #cbd5e1;
  font-size: 12px;
}

.col-actions {
  align-items: flex-start;
}

.action-buttons {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.status-badge,
.priority-badge,
.rating-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.closed-time {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 4px;
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

.assign-select-small,
.status-select-small {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 11px;
  background: white;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
}

.assign-select-small:hover,
.status-select-small:hover {
  border-color: #94a3b8;
}

.assign-select-small:focus,
.status-select-small:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.btn-action-small {
  padding: 6px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: white;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
}

.btn-action-small:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #1e293b;
}

.btn-action-small.btn-details {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.btn-action-small.btn-details:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-action-small.btn-history {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #475569;
}

.btn-action-small.btn-history:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
}

.replies-count {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
  font-size: 12px;
  display: inline-block;
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

.modal-header h2,
.modal-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.modal-header h3 {
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  border-radius: 4px;
}

.close-btn:hover {
  color: #1e293b;
  background: #f1f5f9;
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

  }

  .page-header h1 {
    font-size: 24px;
  }

  .filter-group {
    grid-template-columns: 1fr;
  }

  .list-header,
  .list-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .list-col {
    padding: 4px 0;
  }

  .action-buttons {
    flex-wrap: wrap;
    width: 100%;
  }

  .assign-select-small,
  .status-select-small {
    flex: 1;
    min-width: 120px;
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

/* Status Change Modal */
.status-modal,
.status-history-modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
}

.status-modal .modal-body,
.status-history-modal .modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-group .required {
  color: #ef4444;
}

.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s ease;
}

.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.help-text {
  font-size: 12px;
  color: #6b7280;
  margin-top: 6px;
  margin-bottom: 0;
}

.error-message {
  padding: 12px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  font-size: 14px;
  margin-top: 16px;
}

.status-modal .modal-footer,
.status-history-modal .modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

/* Status History Modal */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-item {
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
}

.history-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-status svg {
  color: #9ca3af;
}

.history-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
}

.history-date {
  font-weight: 500;
}

.history-user {
  color: #9ca3af;
}

.history-note {
  padding: 12px;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
}

.history-note strong {
  color: #1f2937;
}

.status-badge.initial {
  background: #f3f4f6;
  color: #6b7280;
}
</style>
