<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/utils/axios.js'
import { useRouter } from 'vue-router'

const router = useRouter()
const users = ref([])
const isLoading = ref(true)
const error = ref('')
const pendingCount = ref(0)

// Arama ve filtreleme
const searchQuery = ref('')
const selectedUserType = ref('')
const onlineFilter = ref('all') // 'all', 'online', 'offline'

const userTypes = computed(() => {
  const types = new Set()
  users.value.forEach(user => {
    if (user.userType?.name) {
      types.add(user.userType.name)
    }
  })
  return Array.from(types).sort()
})

const filteredUsers = computed(() => {
  let result = users.value

  // Arama filtresi
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(user =>
      user.email?.toLowerCase().includes(query) ||
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query)
    )
  }

  // Kullanıcı tipi filtresi
  if (selectedUserType.value) {
    result = result.filter(user => user.userType?.name === selectedUserType.value)
  }

  // Online durum filtresi
  if (onlineFilter.value === 'online') {
    result = result.filter(user => user.isOnline)
  } else if (onlineFilter.value === 'offline') {
    result = result.filter(user => !user.isOnline)
  }

  return result
})

const onlineCount = computed(() => users.value.filter(u => u.isOnline).length)

async function loadUsers() {
  isLoading.value = true
  error.value = ''

  try {
    const response = await api.get('/users')
    users.value = response.data
  } catch (err) {
    console.error('Kullanıcılar yüklenemedi:', err)
    error.value = 'Kullanıcılar yüklenirken bir hata oluştu.'
  } finally {
    isLoading.value = false
  }
}

async function loadPendingCount() {
  try {
    const response = await api.get('/users/pending-registrations/list')
    pendingCount.value = response.data.length
  } catch (err) {
    console.error('Onay bekleyen kullanıcı sayısı yüklenemedi:', err)
    pendingCount.value = 0
  }
}

function formatDate(date) {
  if (!date) return 'Hiç'
  return new Date(date).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTimeAgo(date) {
  if (!date) return 'Hiç'

  const now = new Date()
  const diff = now - new Date(date)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Şimdi'
  if (minutes < 60) return `${minutes} dk önce`
  if (hours < 24) return `${hours} saat önce`
  return `${days} gün önce`
}

function createUser() {
  router.push('/admin/users/new')
}

function goToPendingUsers() {
  router.push('/admin/pending-users')
}

// Her 30 saniyede bir otomatik yenile (online durumları güncel tutmak için)
let refreshInterval
onMounted(() => {
  loadUsers()
  loadPendingCount()
  refreshInterval = setInterval(() => {
    loadUsers()
    loadPendingCount()
  }, 30000)
})

// Component unmount olduğunda interval'i temizle
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<template>
  <div class="admin-users-list">
    <div class="page-header">
      <div class="header-left">
        <h1>Kullanıcı Yönetimi</h1>
        <p class="subtitle">Tüm kullanıcıları görüntüle ve yönet</p>
      </div>
      <div class="header-buttons">
        <button class="pending-btn" @click="goToPendingUsers">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          Onay Bekleyen
          <span v-if="pendingCount > 0" class="pending-badge">{{ pendingCount }}</span>
        </button>
        <button class="create-btn" @click="createUser">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Yeni Kullanıcı
        </button>
      </div>
    </div>

    <div class="filters-section">
      <div class="filter-row">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Kullanıcı ara (isim, email, kullanıcı adı)..."
          />
        </div>

        <select v-model="selectedUserType" class="filter-select">
          <option value="">Tüm Tipler</option>
          <option v-for="type in userTypes" :key="type" :value="type">{{ type }}</option>
        </select>

        <select v-model="onlineFilter" class="filter-select">
          <option value="all">Tüm Kullanıcılar</option>
          <option value="online">Sadece Online</option>
          <option value="offline">Sadece Offline</option>
        </select>

        <button class="refresh-btn-small" @click="loadUsers" :disabled="isLoading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
        </button>
      </div>

      <div class="stats-row">
        <div class="stat-badge">
          <span class="stat-label">Toplam Kullanıcı:</span>
          <span class="stat-value">{{ users.length }}</span>
        </div>
        <div class="stat-badge online">
          <span class="online-dot"></span>
          <span class="stat-label">Online:</span>
          <span class="stat-value">{{ onlineCount }}</span>
        </div>
        <div class="stat-badge">
          <span class="stat-label">Filtrelenmiş:</span>
          <span class="stat-value">{{ filteredUsers.length }}</span>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Kullanıcılar yükleniyor...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
      <button @click="loadUsers" class="retry-btn">Tekrar Dene</button>
    </div>

    <div v-else class="users-content">
      <div v-if="filteredUsers.length === 0" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p>{{ searchQuery || selectedUserType || onlineFilter !== 'all' ? 'Filtreye uygun kullanıcı bulunamadı.' : 'Henüz kullanıcı bulunmuyor.' }}</p>
      </div>

      <div v-else class="users-table">
        <table>
          <thead>
            <tr>
              <th>Durum</th>
              <th>Kullanıcı</th>
              <th>Email</th>
              <th>Kullanıcı Tipi</th>
              <th>Son Aktivite</th>
              <th>Kayıt Tarihi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td>
                <span
                  class="status-indicator"
                  :class="{ 'online': user.isOnline, 'offline': !user.isOnline }"
                  :title="user.isOnline ? 'Online' : 'Offline'"
                ></span>
              </td>
              <td>
                <div class="user-info">
                  <span class="user-name">
                    {{ user.firstName || user.username || 'İsimsiz' }}
                    {{ user.lastName || '' }}
                  </span>
                  <span v-if="user.username" class="username">@{{ user.username }}</span>
                </div>
              </td>
              <td>
                <span class="email">{{ user.email }}</span>
              </td>
              <td>
                <span class="user-type-badge" :class="`type-${user.userType?.id?.toLowerCase() || 'default'}`">
                  {{ user.userType?.name || 'Bilinmeyen' }}
                </span>
              </td>
              <td>
                <div class="activity-cell">
                  <span class="activity-time">{{ formatTimeAgo(user.lastActivity) }}</span>
                  <span v-if="user.lastActivity" class="activity-date">{{ formatDate(user.lastActivity) }}</span>
                </div>
              </td>
              <td>
                <span class="date">{{ formatDate(user.createdAt) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-users-list {
  width: 100%;
  margin: 0;
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;
}

.header-buttons {
  display: flex;
  gap: 1rem;
  align-items: center;
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

.pending-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.pending-btn:hover {
  background: var(--bg);
  transform: translateY(-1px);
}

.pending-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  margin-left: 0.25rem;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Filters Section */
.filters-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.filter-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
}

.search-box svg {
  color: var(--muted);
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  color: var(--text);
  font-size: 0.95rem;
}

.filter-select {
  padding: 0.75rem 1rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--text);
  font-size: 0.95rem;
  cursor: pointer;
  min-width: 150px;
}

.refresh-btn-small {
  padding: 0.75rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn-small:hover:not(:disabled) {
  background: var(--border);
}

.refresh-btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg);
  border-radius: 999px;
  font-size: 0.875rem;
}

.stat-badge.online {
  background: #dcfce7;
}

.online-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

.stat-label {
  color: var(--muted);
}

.stat-value {
  font-weight: 700;
  color: var(--text);
}

.stat-badge.online .stat-label,
.stat-badge.online .stat-value {
  color: #047857;
}

/* Loading & Error States */
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
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--muted);
  text-align: center;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
}

.empty-state svg {
  opacity: 0.5;
  margin-bottom: 1rem;
}

/* Users Table */
.users-table {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  overflow: hidden;
}

.users-table table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  text-align: left;
  padding: 1rem;
  background: var(--bg);
  color: var(--muted);
  font-size: 0.875rem;
  font-weight: 600;
  border-bottom: 2px solid var(--border);
}

.users-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

.users-table tr:hover {
  background: var(--bg);
}

.users-table tr:last-child td {
  border-bottom: none;
}

.status-indicator {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-indicator.online {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
  animation: pulse 2s infinite;
}

.status-indicator.offline {
  background: #94a3b8;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-name {
  font-weight: 600;
  color: var(--text);
}

.username {
  font-size: 0.75rem;
  color: var(--muted);
}

.email {
  color: var(--text);
  font-size: 0.95rem;
}

.user-type-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.user-type-badge.type-superadmin {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #854d0e;
}

.user-type-badge.type-admin {
  background: #dbeafe;
  color: #1e40af;
}

.user-type-badge.type-broker {
  background: #dcfce7;
  color: #047857;
}

.user-type-badge.type-default {
  background: var(--border);
  color: var(--muted);
}

.activity-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.activity-time {
  font-weight: 600;
  color: var(--text);
  font-size: 0.95rem;
}

.activity-date {
  font-size: 0.75rem;
  color: var(--muted);
}

.date {
  color: var(--muted);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .admin-users-list {
    padding: 0;
    max-width: 100%;
  }

  .page-header {
    flex-direction: column;
  }

  .header-buttons {
    width: 100%;
    flex-direction: column;
  }

  .pending-btn,
  .create-btn {
    width: 100%;
    justify-content: center;
  }

  .filter-row {
    flex-direction: column;
  }

  .users-table {
    overflow-x: auto;
  }

  .users-table table {
    min-width: 800px;
  }
}
</style>
