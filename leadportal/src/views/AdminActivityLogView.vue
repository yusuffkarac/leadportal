<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '@/utils/axios.js'

const logs = ref([])
const stats = ref(null)
const actions = ref([])
const isLoading = ref(true)
const error = ref('')

// Filtreleme
const searchQuery = ref('')
const selectedAction = ref('')
const selectedUser = ref('')
const startDate = ref('')
const endDate = ref('')

// Pagination
const currentPage = ref(1)
const totalPages = ref(1)
const totalLogs = ref(0)
const pageSize = ref(50)

// Aktivite tip çevirileri
const actionTranslations = {
  LOGIN: 'Giriş Yaptı',
  LOGOUT: 'Çıkış Yaptı',
  VIEW_LEAD: 'Lead Görüntüledi',
  CREATE_LEAD: 'Lead Oluşturdu',
  EDIT_LEAD: 'Lead Düzenledi',
  DELETE_LEAD: 'Lead Sildi',
  PUBLISH_LEAD: 'Lead Yayınladı',
  UNPUBLISH_LEAD: 'Lead Yayından Kaldırdı',
  CREATE_BID: 'Teklif Verdi',
  UPDATE_BID: 'Teklif Güncelledi',
  DELETE_BID: 'Teklif Sildi',
  PURCHASE_LEAD: 'Lead Satın Aldı',
  INSTANT_BUY: 'Hemen Al ile Satın Aldı',
  ADD_WATCH: 'İzlemeye Ekledi',
  REMOVE_WATCH: 'İzlemeden Çıkardı',
  CREATE_USER: 'Kullanıcı Oluşturdu',
  EDIT_USER: 'Kullanıcı Düzenledi',
  DELETE_USER: 'Kullanıcı Sildi',
  RESET_PASSWORD: 'Şifre Sıfırladı',
  CHANGE_SETTINGS: 'Ayarları Değiştirdi',
  CHANGE_DESIGN: 'Tasarım Değiştirdi',
  CHANGE_BRANDING: 'Firma Ayarlarını Değiştirdi',
  CHANGE_EMAIL_SETTINGS: 'Email Ayarlarını Değiştirdi',
  VIEW_STATISTICS: 'İstatistikleri Görüntüledi',
  VIEW_USERS: 'Kullanıcıları Görüntüledi',
  VIEW_ACTIVITY_LOG: 'Aktivite Loglarını Görüntüledi',
  CHANGE_PERMISSIONS: 'İzinleri Değiştirdi',
  CREATE_FAQ: 'SSS Oluşturdu',
  EDIT_FAQ: 'SSS Düzenledi',
  DELETE_FAQ: 'SSS Sildi',
  EDIT_ABOUT: 'Hakkında Düzenledi'
}

function translateAction(action) {
  return actionTranslations[action] || action
}

function getActionColor(action) {
  if (action.includes('LOGIN')) return 'success'
  if (action.includes('LOGOUT')) return 'muted'
  if (action.includes('CREATE')) return 'primary'
  if (action.includes('EDIT') || action.includes('UPDATE')) return 'warning'
  if (action.includes('DELETE')) return 'danger'
  if (action.includes('VIEW')) return 'info'
  if (action.includes('PURCHASE') || action.includes('BID')) return 'purple'
  return 'default'
}

async function loadLogs() {
  isLoading.value = true
  error.value = ''

  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }

    if (searchQuery.value) params.search = searchQuery.value
    if (selectedAction.value) params.action = selectedAction.value
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value

    const response = await api.get('/activity-log', { params })
    logs.value = response.data.logs
    totalPages.value = response.data.pagination.totalPages
    totalLogs.value = response.data.pagination.total
  } catch (err) {
    console.error('Loglar yüklenemedi:', err)
    error.value = 'Aktivite logları yüklenirken bir hata oluştu.'
  } finally {
    isLoading.value = false
  }
}

async function loadStats() {
  try {
    const response = await api.get('/activity-log/stats')
    stats.value = response.data
  } catch (err) {
    console.error('İstatistikler yüklenemedi:', err)
  }
}

async function loadActions() {
  try {
    const response = await api.get('/activity-log/actions')
    actions.value = response.data
  } catch (err) {
    console.error('Aktivite tipleri yüklenemedi:', err)
  }
}

function formatDate(date) {
  return new Date(date).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatTimeAgo(date) {
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

function getUserName(log) {
  const user = log.user
  if (!user) return 'Bilinmeyen Kullanıcı'
  if (user.firstName) return `${user.firstName} ${user.lastName || ''}`.trim()
  if (user.username) return user.username
  return user.email
}

function resetFilters() {
  searchQuery.value = ''
  selectedAction.value = ''
  startDate.value = ''
  endDate.value = ''
  currentPage.value = 1
  loadLogs()
}

function changePage(page) {
  currentPage.value = page
  loadLogs()
}

// Filter değiştiğinde sayfa 1'e dön
watch([searchQuery, selectedAction, startDate, endDate], () => {
  currentPage.value = 1
  loadLogs()
})

onMounted(() => {
  loadLogs()
  loadStats()
  loadActions()
})
</script>

<template>
  <div class="admin-activity-log">
    <div class="page-header">
      <div class="header-left">
        <h1>Aktivite Geçmişi</h1>
        <p class="subtitle">Tüm kullanıcı aktivitelerini izleyin</p>
      </div>
      <button class="refresh-btn" @click="loadLogs" :disabled="isLoading">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
        Yenile
      </button>
    </div>

    <!-- İstatistikler -->
    <div v-if="stats" class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon total">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">Toplam Aktivite</span>
          <span class="stat-value">{{ stats.total.toLocaleString() }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon success">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">Son 24 Saat</span>
          <span class="stat-value">{{ stats.last24h.toLocaleString() }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">Son 7 Gün</span>
          <span class="stat-value">{{ stats.last7Days.toLocaleString() }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon warning">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">Son 30 Gün</span>
          <span class="stat-value">{{ stats.last30Days.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- Filtreler -->
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
            placeholder="Kullanıcı ara (isim, email)..."
          />
        </div>

        <div class="filter-group">
          <select v-model="selectedAction" class="filter-select">
            <option value="">Tüm Aktiviteler</option>
            <option v-for="action in actions" :key="action.action" :value="action.action">
              {{ translateAction(action.action) }} ({{ action._count.action }})
            </option>
          </select>
        </div>

        <div class="date-group">
          <div class="date-input-wrapper">
            <label class="date-label">Başlangıç</label>
            <input v-model="startDate" type="date" class="filter-input date-input">
          </div>
          <div class="date-input-wrapper">
            <label class="date-label">Bitiş</label>
            <input v-model="endDate" type="date" class="filter-input date-input">
          </div>
        </div>

        <button class="reset-btn" @click="resetFilters">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
          Sıfırla
        </button>
      </div>

      
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Aktivite logları yükleniyor...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
      <button @click="loadLogs" class="retry-btn">Tekrar Dene</button>
    </div>

    <div v-else class="logs-content">
      <div v-if="logs.length === 0" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <p>Aktivite bulunamadı</p>
      </div>

      <div v-else class="logs-table">
        <table>
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Kullanıcı</th>
              <th>Aktivite</th>
              <th>Detaylar</th>
              <th>IP Adresi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>
                <div class="time-cell">
                  <span class="time-ago">{{ formatTimeAgo(log.createdAt) }}</span>
                  <span class="time-full">{{ formatDate(log.createdAt) }}</span>
                </div>
              </td>
              <td>
                <div class="user-cell">
                  <span class="user-name">{{ getUserName(log) }}</span>
                  <span class="user-email">{{ log.user?.email || '-' }}</span>
                </div>
              </td>
              <td>
                <span class="action-badge" :class="`action-${getActionColor(log.action)}`">
                  {{ translateAction(log.action) }}
                </span>
              </td>
              <td>
                <div class="details-cell">
                  <span v-if="log.entityType" class="entity-type">{{ log.entityType }}</span>
                  <span v-if="log.details" class="details-text">{{ JSON.stringify(log.details) }}</span>
                  <span v-else class="no-details">-</span>
                </div>
              </td>
              <td>
                <span class="ip-address">{{ log.ipAddress || '-' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Önceki
        </button>

        <div class="page-numbers">
          <button
            v-for="page in Math.min(totalPages, 5)"
            :key="page"
            class="page-number"
            :class="{ active: page === currentPage }"
            @click="changePage(page)"
          >
            {{ page }}
          </button>
          <span v-if="totalPages > 5">...</span>
          <button
            v-if="totalPages > 5"
            class="page-number"
            :class="{ active: totalPages === currentPage }"
            @click="changePage(totalPages)"
          >
            {{ totalPages }}
          </button>
        </div>

        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >
          Sonraki
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-activity-log {
  max-width: 1600px;
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.total {
  background: #f3f4f6;
  color: #374151;
}

.stat-icon.success {
  background: #dcfce7;
  color: #047857;
}

.stat-icon.primary {
  background: #dbeafe;
  color: #1e40af;
}

.stat-icon.warning {
  background: #fef3c7;
  color: #b45309;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--muted);
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text);
}

/* Filters */
.filters-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  justify-content: center;
}

.filter-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
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
  min-width: 280px;
  transition: all 0.2s;
}

.search-box:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

.search-box input::placeholder {
  color: var(--muted);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-select {
  padding: 0.75rem 1rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--text);
  font-size: 0.95rem;
  cursor: pointer;
  min-width: 200px;
  transition: all 0.2s;
}

.filter-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  outline: none;
}

.date-group {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

.date-input-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.date-label {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;

}

.date-input {
  padding: 0.75rem 1rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--text);
  font-size: 0.95rem;
  cursor: pointer;
  min-width: 140px;
  transition: all 0.2s;
}

.date-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  outline: none;
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
  font-weight: 500;
  white-space: nowrap;
}

.reset-btn:hover {
  background: var(--border);
  transform: translateY(-1px);
}

.result-info {
  color: var(--muted);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 0;
}

/* Loading & Error */
.loading-state,
.error-state,
.empty-state {
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

.empty-state svg {
  opacity: 0.5;
  margin-bottom: 1rem;
}

/* Logs Table */
.logs-table {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  overflow: hidden;
}

.logs-table table {
  width: 100%;
  border-collapse: collapse;
}

.logs-table th {
  text-align: left;
  padding: 1rem;
  background: var(--bg);
  color: var(--muted);
  font-size: 0.875rem;
  font-weight: 600;
  border-bottom: 2px solid var(--border);
}

.logs-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

.logs-table tr:hover {
  background: var(--bg);
}

.logs-table tr:last-child td {
  border-bottom: none;
}

.time-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.time-ago {
  font-weight: 600;
  color: var(--text);
  font-size: 0.95rem;
}

.time-full {
  font-size: 0.75rem;
  color: var(--muted);
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

.action-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.action-success {
  background: #dcfce7;
  color: #047857;
}

.action-danger {
  background: #fee2e2;
  color: #991b1b;
}

.action-warning {
  background: #fef3c7;
  color: #b45309;
}

.action-primary {
  background: #dbeafe;
  color: #1e40af;
}

.action-info {
  background: #f0f9ff;
  color: #0369a1;
}

.action-purple {
  background: #f3e8ff;
  color: #7c3aed;
}

.action-muted {
  background: #f3f4f6;
  color: #6b7280;
}

.action-default {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}

.details-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-width: 300px;
}

.entity-type {
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 600;
}

.details-text {
  font-size: 0.75rem;
  color: var(--muted);
  font-family: monospace;
  word-break: break-all;
}

.no-details {
  color: var(--muted);
  font-style: italic;
}

.ip-address {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--muted);
  background: var(--bg);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
}

.page-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: var(--border);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-number {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.page-number:hover {
  background: var(--border);
}

.page-number.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

@media (max-width: 1024px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: auto;
    width: 100%;
  }

  .date-group {
    justify-content: space-between;
  }

  .date-input {
    flex: 1;
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .admin-activity-log {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-left {
    text-align: center;
  }

  .refresh-btn {
    align-self: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .filter-row {
    flex-direction: column;
    gap: 1rem;
  }

  .search-box,
  .filter-select,
  .date-input {
    min-width: auto;
    width: 100%;
  }

  .date-group {
    flex-direction: column;
    gap: 1rem;
  }

  .date-input-wrapper {
    width: 100%;
  }

  .reset-btn {
    width: 100%;
    justify-content: center;
  }

  .logs-table {
    overflow-x: auto;
  }

  .logs-table table {
    min-width: 900px;
  }

  .pagination {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .page-numbers {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .admin-activity-log {
    padding: 0.5rem;
  }

  .filters-section {
    padding: 1rem;
  }

  .page-header h1 {
    font-size: 1.5rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }
}
</style>
