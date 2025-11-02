<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/utils/axios'

const activeTab = ref('pending') // 'pending', 'approved', 'rejected'
const pendingUsers = ref([])
const approvedUsers = ref([])
const rejectedUsers = ref([])
const loading = ref(true)
const error = ref('')
const selectedUser = ref(null)
const showRejectModal = ref(false)
const showApproveModal = ref(false)
const rejectReason = ref('')
const processingId = ref(null)
const searchQuery = ref('')

onMounted(() => {
  fetchAllUsers()
})

async function fetchAllUsers() {
  try {
    loading.value = true
    error.value = ''

    const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
      api.get('/users/pending-registrations/list'),
      api.get('/users/approved-registrations/list'),
      api.get('/users/rejected-registrations/list')
    ])

    pendingUsers.value = pendingRes.data
    approvedUsers.value = approvedRes.data
    rejectedUsers.value = rejectedRes.data
  } catch (e) {
    error.value = 'Kullanıcı verileri yüklenemedi'
    console.error('Error fetching users:', e)
  } finally {
    loading.value = false
  }
}

const users = computed(() => {
  if (activeTab.value === 'pending') return pendingUsers.value
  if (activeTab.value === 'approved') return approvedUsers.value
  if (activeTab.value === 'rejected') return rejectedUsers.value
  return []
})

const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) {
    return users.value
  }

  const query = searchQuery.value.toLowerCase().trim()
  
  return users.value.filter(user => {
    const firstName = (user.firstName || '').toLowerCase()
    const lastName = (user.lastName || '').toLowerCase()
    const username = (user.username || '').toLowerCase()
    const email = (user.email || '').toLowerCase()
    const fullName = `${firstName} ${lastName}`.trim()

    return (
      firstName.includes(query) ||
      lastName.includes(query) ||
      username.includes(query) ||
      email.includes(query) ||
      fullName.includes(query)
    )
  })
})

const pendingCount = computed(() => pendingUsers.value.length)
const approvedCount = computed(() => approvedUsers.value.length)
const rejectedCount = computed(() => rejectedUsers.value.length)

function clearSearch() {
  searchQuery.value = ''
}

function startReject(user) {
  selectedUser.value = user
  rejectReason.value = ''
  showRejectModal.value = true
}

function closeRejectModal() {
  showRejectModal.value = false
  selectedUser.value = null
  rejectReason.value = ''
}

function startApprove(user) {
  selectedUser.value = user
  showApproveModal.value = true
}

function closeApproveModal() {
  showApproveModal.value = false
  selectedUser.value = null
}

async function confirmApprove() {
  if (!selectedUser.value) return

  try {
    processingId.value = selectedUser.value.id
    await api.put(`/users/${selectedUser.value.id}/approve`, {})
    closeApproveModal()
    // Refresh all lists to show updated data in all tabs
    await fetchAllUsers()
  } catch (e) {
    error.value = e.response?.data?.error || 'Kullanıcı onaylanırken hata oluştu'
  } finally {
    processingId.value = null
  }
}

async function rejectUser() {
  if (!selectedUser.value) return

  try {
    processingId.value = selectedUser.value.id
    await api.put(`/users/${selectedUser.value.id}/reject`,
      { rejectReason: rejectReason.value }
    )
    closeRejectModal()
    // Refresh all lists to show updated data in all tabs
    await fetchAllUsers()
  } catch (e) {
    error.value = e.response?.data?.error || 'Kullanıcı reddedilirken hata oluştu'
  } finally {
    processingId.value = null
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="pending-users-container">
    <div class="header">
      <h1>Kullanıcı Onay Yönetimi</h1>
      <p>Kayıt taleplerini yönetin ve geçmiş onay işlemlerini görüntüleyin</p>
    </div>

    <!-- Tabs -->
    <div class="tabs-container">
      <div class="tabs-nav">
        <button
          class="tab-button"
          :class="{ active: activeTab === 'pending' }"
          @click="activeTab = 'pending'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v6m0 6v6M4.93 4.93l4.24 4.24m6.66 6.66l4.24 4.24M2 12h6m6 0h6M4.93 19.07l4.24-4.24m6.66-6.66l4.24-4.24"/>
          </svg>
          Onay Bekleyen
          <span v-if="!loading" class="tab-count">{{ pendingCount }}</span>
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'approved' }"
          @click="activeTab = 'approved'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          Onaylananlar
          <span v-if="!loading" class="tab-count">{{ approvedCount }}</span>
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'rejected' }"
          @click="activeTab = 'rejected'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          Reddedilenler
          <span v-if="!loading" class="tab-count">{{ rejectedCount }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Yükleniyor...</p>
    </div>

    <div v-if="error && !loading" class="alert error">
      <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
      <span>{{ error }}</span>
    </div>

    <!-- Search Bar -->
    <div v-if="!loading" class="search-container">
      <div class="search-box">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Ad, soyad, kullanıcı adı veya email ile ara..."
        />
        <button
          v-if="searchQuery"
          @click="clearSearch"
          class="search-clear"
          title="Temizle"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div v-if="searchQuery" class="search-results">
        <span>{{ filteredUsers.length }}</span> sonuç bulundu
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && filteredUsers.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 12l2 2 4-4M7 20H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/>
      </svg>
      <h3>
        <span v-if="searchQuery && filteredUsers.length === 0">Arama sonucu bulunamadı</span>
        <span v-else-if="activeTab === 'pending'">Onay Bekleyen Kullanıcı Yok</span>
        <span v-else-if="activeTab === 'approved'">Onaylanan Kullanıcı Yok</span>
        <span v-else>Reddedilen Kullanıcı Yok</span>
      </h3>
      <p>
        <span v-if="searchQuery && filteredUsers.length === 0">Arama kriterlerinize uygun kullanıcı bulunamadı.</span>
        <span v-else-if="activeTab === 'pending'">Tüm kayıt istekleri işlenmiştir.</span>
        <span v-else-if="activeTab === 'approved'">Henüz onaylanmış kullanıcı bulunmamaktadır.</span>
        <span v-else>Henüz reddedilmiş kullanıcı bulunmamaktadır.</span>
      </p>
    </div>

    <!-- Users List -->
    <div v-if="!loading && filteredUsers.length > 0" class="users-list">
      <div v-for="user in filteredUsers" :key="user.id" class="user-card">
        <div class="user-info">
          <div class="user-details">
            <p class="email">{{ user.email }}</p>

            <div class="details-table">
              <div class="table-row">
                <span class="table-label">Ad Soyad:</span>
                <span class="table-value">{{ user.firstName }} {{ user.lastName }}</span>
              </div>
              <div class="table-row">
                <span class="table-label">Kullanıcı Adı:</span>
                <span class="table-value">{{ user.username || '-' }}</span>
              </div>
              <div class="table-row">
                <span class="table-label">Kullanıcı Tipi:</span>
                <span class="table-value">{{ user.userType?.name || '-' }}</span>
              </div>
              <div class="table-row">
                <span class="table-label">Kayıt Tarihi:</span>
                <span class="table-value">{{ formatDate(user.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions for Pending -->
        <div v-if="activeTab === 'pending'" class="actions">
          <button
            class="btn approve"
            @click="startApprove(user)"
            :disabled="processingId === user.id || showApproveModal"
          >
            <svg v-if="processingId === user.id" class="btn-spinner" viewBox="0 0 24 24" width="14" height="14">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
            <svg v-else class="btn-icon" viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            <span>Onayla</span>
          </button>
          <button
            class="btn reject"
            @click="startReject(user)"
            :disabled="processingId === user.id || showRejectModal"
          >
            <svg class="btn-icon" viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            <span>Reddet</span>
          </button>
        </div>

        <!-- Info for Approved -->
        <div v-else-if="activeTab === 'approved'" class="approval-info">
          <div class="info-item">
            <span class="label">Onayan:</span>
            <span class="value">{{ user.approvedBy?.firstName }} {{ user.approvedBy?.lastName }} ({{ user.approvedBy?.email }})</span>
          </div>
          <div class="info-item">
            <span class="label">Onay Tarihi:</span>
            <span class="value">{{ formatDate(user.approvedAt) }}</span>
          </div>
        </div>

        <!-- Info for Rejected -->
        <div v-else-if="activeTab === 'rejected'" class="approval-info">
          <div class="info-item">
            <span class="label">Reddeden:</span>
            <span class="value">{{ user.approvedBy?.firstName }} {{ user.approvedBy?.lastName }} ({{ user.approvedBy?.email }})</span>
          </div>
          <div class="info-item">
            <span class="label">Red Tarihi:</span>
            <span class="value">{{ formatDate(user.approvedAt) }}</span>
          </div>
          <div v-if="user.registrationRejectionReason" class="info-item full-width">
            <span class="label">Red Sebebi:</span>
            <span class="value rejection-reason">{{ user.registrationRejectionReason }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Approve Modal -->
    <div v-if="showApproveModal" class="modal-overlay" @click="closeApproveModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Kayıt Talebini Onayla</h2>
          <button class="close-btn" @click="closeApproveModal">×</button>
        </div>

        <div class="modal-content">
          <div class="approve-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <p>
            <strong>{{ selectedUser?.firstName || '' }} {{ selectedUser?.lastName || '' }}</strong>
            <span v-if="selectedUser?.firstName || selectedUser?.lastName"> (</span>{{ selectedUser?.email }}<span v-if="selectedUser?.firstName || selectedUser?.lastName">)</span>
            kullanıcısını onaylamak istediğinize emin misiniz?
          </p>
          <div v-if="selectedUser" class="user-info-summary">
            <div class="info-row">
              <span class="info-label">Kullanıcı Tipi:</span>
              <span class="info-value">{{ selectedUser.userType?.name || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Kayıt Tarihi:</span>
              <span class="info-value">{{ formatDate(selectedUser.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn secondary" @click="closeApproveModal">İptal</button>
          <button class="btn approve" @click="confirmApprove" :disabled="processingId === selectedUser?.id">
            <svg v-if="processingId === selectedUser?.id" class="btn-spinner" viewBox="0 0 24 24" width="14" height="14">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
            <svg v-else class="btn-icon" viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>{{ processingId === selectedUser?.id ? 'Onaylanıyor...' : 'Onayla' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="modal-overlay" @click="closeRejectModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Kayıt Talebini Reddet</h2>
          <button class="close-btn" @click="closeRejectModal">×</button>
        </div>

        <div class="modal-content">
          <p>
            <strong>{{ selectedUser?.firstName }} {{ selectedUser?.lastName }}</strong>
            ({{ selectedUser?.email }}) kullanıcısının kaydını reddetmek üzeresiniz.
          </p>

          <label class="field">
            <span class="label">Red Sebebi (Admin Notu)</span>
            <textarea
              v-model="rejectReason"
              class="textarea"
              placeholder="Örn: Şüpheli aktivite, Geçersiz bilgiler vb."
              rows="4"
            ></textarea>
            <p class="hint">Bu sebep sadece admin panelinde görülebilir.</p>
          </label>
        </div>

        <div class="modal-footer">
          <button class="btn secondary" @click="closeRejectModal">İptal</button>
          <button class="btn danger" @click="rejectUser" :disabled="processingId === selectedUser?.id">
            <svg v-if="processingId === selectedUser?.id" class="btn-spinner" viewBox="0 0 24 24" width="14" height="14">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
            <span>{{ processingId === selectedUser?.id ? 'Reddediliyor...' : 'Reddet' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pending-users-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  margin-bottom: 32px;
}

.header h1 {
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
}

.header p {
  margin: 0;
  color: #64748b;
}

.search-container {
  margin-bottom: 24px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
  transition: all 0.2s;
}

.search-box:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.search-icon {
  color: #64748b;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #1f2937;
  background: transparent;
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-clear {
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.search-clear:hover {
  background: #f3f4f6;
  color: #374151;
}

.search-results {
  margin-top: 8px;
  font-size: 13px;
  color: #64748b;
  padding-left: 4px;
}

.search-results span {
  font-weight: 600;
  color: #2563eb;
}

.tabs-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 24px;
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
  font-size: 14px;
}

.tab-button:hover {
  color: #475569;
  background: #f1f5f9;
}

.tab-button.active {
  color: #1e293b;
  border-bottom-color: #1e293b;
  background: white;
}

.tab-button svg {
  flex-shrink: 0;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #e2e8f0;
  color: #64748b;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 4px;
}

.tab-button.active .tab-count {
  background: #1e293b;
  color: white;
}

.loading {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 3px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 24px;
  color: #b91c1c;
  background: #fee2e2;
  border: 1px solid #fecaca;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-state svg {
  color: #cbd5e1;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #334155;
  font-size: 18px;
}

.empty-state p {
  margin: 0;
}

.users-list {
  display: grid;
  gap: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  gap: 20px;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-info h3 {
  margin: 0 0 4px 0;
  color: #1f2937;
  font-size: 16px;
}

.user-info .email {
  margin: 0 0 8px 0;
  color: #2563eb;
  font-size: 14px;
}

.user-details {
  width: 100%;
}

.details-table {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px 20px;
  margin-top: 16px;
  align-items: start;
}

.table-row {
  display: contents;
}

.table-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
  padding-right: 8px;
}

.table-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
  white-space: nowrap;
  word-break: keep-all;
}

.detail-item .value.code {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #7c3aed;
  background: #f3e8ff;
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
}

.actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.2s;
  white-space: nowrap;
  min-width: fit-content;
  height: 36px;
  position: relative;
}

.btn-icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}

.btn-spinner {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  animation: spin 0.8s linear infinite;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.approve {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}

.btn.approve:hover:not(:disabled) {
  background: #bbf7d0;
}

.btn.reject {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}

.btn.reject:hover:not(:disabled) {
  background: #fecaca;
}

.btn.secondary {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

.btn.danger {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}

.btn.danger:hover:not(:disabled) {
  background: #fecaca;
}

.approval-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  flex-shrink: 0;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-item .label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.info-item .value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.info-item .rejection-reason {
  padding: 8px;
  background: white;
  border: 1px solid #fecaca;
  border-radius: 4px;
  color: #b91c1c;
  white-space: pre-wrap;
  word-break: break-word;
}

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
  padding: 16px;
}

.modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #64748b;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  padding: 20px;
}

.modal-content p {
  margin: 0 0 16px 0;
  color: #334155;
}

.field {
  display: block;
  margin-bottom: 16px;
}

.field .label {
  display: block;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 8px;
}

.textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

.textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.hint {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #64748b;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e2e8f0;
}

.modal-footer .btn {
  flex: 1;
  justify-content: center;
}

.approve-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.approve-icon svg {
  color: #166534;
}

.user-info-summary {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid #e2e8f0;
}

.info-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

@media (max-width: 768px) {
  .user-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .actions {
    width: 100%;
  }

  .approval-info {
    width: 100%;
  }

  .btn {
    flex: 1;
    justify-content: center;
  }

  .tabs-nav {
    flex-wrap: wrap;
  }

  .tab-button {
    padding: 0.75rem 1rem;
    font-size: 13px;
  }

  .details-table {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .table-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
