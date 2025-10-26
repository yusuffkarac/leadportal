<template>
  <div class="balance-management">
    <div class="page-header">
      <h1>Bakiye Yönetimi</h1>
      <p>Kullanıcı bakiyelerini yönetin ve işlemleri görüntüleyin</p>
    </div>

    <div class="content-wrapper">
      <div class="users-list">
        <div class="search-box">
          <Icon icon="mdi:magnify" width="20" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Kullanıcı ara..."
            class="search-input"
          />
        </div>

        <div v-if="isLoading" class="loading-state">Yükleniyor...</div>
        <div v-else-if="filteredUsers.length === 0" class="empty-state">
          <Icon icon="mdi:account-search" width="48" />
          <p>Kullanıcı bulunamadı</p>
        </div>
        <div v-else class="user-cards">
          <div
            v-for="user in filteredUsers"
            :key="user.id"
            class="user-card"
            :class="{ selected: selectedUser?.id === user.id }"
            @click="selectUser(user)"
          >
            <div class="user-info">
              <div class="user-name">
                {{ user.firstName || user.username || user.email }}
                <span v-if="user.lastName">{{ user.lastName }}</span>
              </div>
              <div class="user-email">{{ user.email }}</div>
              <div class="user-type">{{ user.userType?.name || 'Kullanıcı' }}</div>
            </div>
            <div class="balance-info">
              <div class="balance-amount">{{ formatCurrency(user.balance) }}</div>
              <div class="balance-status" :class="{ disabled: !user.balanceEnabled }">
                <Icon
                  :icon="user.balanceEnabled ? 'mdi:check-circle' : 'mdi:close-circle'"
                  width="16"
                />
                {{ user.balanceEnabled ? 'Aktif' : 'Pasif' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="user-details" v-if="selectedUser">
        <div class="details-header">
          <div>
            <h2>{{ selectedUser.firstName || selectedUser.username || selectedUser.email }}</h2>
            <p>{{ selectedUser.email }}</p>
          </div>
          <button
            class="btn-toggle"
            :class="{ active: selectedUser.balanceEnabled }"
            @click="toggleBalanceEnabled"
            :disabled="isProcessing"
          >
            <Icon
              :icon="selectedUser.balanceEnabled ? 'mdi:toggle-switch' : 'mdi:toggle-switch-off'"
              width="24"
            />
            {{ selectedUser.balanceEnabled ? 'Bakiye Aktif' : 'Bakiye Pasif' }}
          </button>
        </div>

        <div class="balance-summary">
          <div class="summary-card">
            <Icon icon="mdi:wallet" width="24" />
            <div>
              <div class="summary-label">Mevcut Bakiye</div>
              <div class="summary-value">{{ formatCurrency(selectedUser.balance) }}</div>
            </div>
          </div>
          <div class="summary-card">
            <Icon icon="mdi:credit-card" width="24" />
            <div>
              <div class="summary-label">Ödeme Yöntemi</div>
              <div class="summary-value">
                {{ selectedUser.paymentMethod === 'balance' ? 'Bakiye' : 'IBAN' }}
              </div>
            </div>
          </div>
        </div>

        <div class="add-balance-form">
          <h3>Bakiye Ekle</h3>
          <form @submit.prevent="addBalance">
            <div class="form-group">
              <label>Miktar (€)</label>
              <input
                type="number"
                v-model.number="balanceAmount"
                placeholder="Örn: 100"
                min="0.01"
                step="0.01"
                required
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Açıklama (Opsiyonel)</label>
              <input
                type="text"
                v-model="balanceDescription"
                placeholder="Örn: Aylık bakiye yüklemesi"
                class="form-input"
              />
            </div>
            <button type="submit" class="btn-primary" :disabled="isProcessing || !balanceAmount">
              <Icon icon="mdi:plus-circle" width="20" />
              {{ isProcessing ? 'Ekleniyor...' : 'Bakiye Ekle' }}
            </button>
          </form>
        </div>

        <div class="transaction-history">
          <h3>İşlem Geçmişi</h3>
          <div v-if="isLoadingHistory" class="loading-state">Geçmiş yükleniyor...</div>
          <div v-else-if="transactions.length === 0" class="empty-state">
            <Icon icon="mdi:history" width="48" />
            <p>Henüz işlem yapılmamış</p>
          </div>
          <div v-else class="transactions">
            <div
              v-for="transaction in transactions"
              :key="transaction.id"
              class="transaction-item"
              :class="transaction.amount > 0 ? 'credit' : 'debit'"
            >
              <Icon
                :icon="transaction.amount > 0 ? 'mdi:plus-circle' : 'mdi:minus-circle'"
                width="20"
              />
              <div class="transaction-details">
                <div class="transaction-desc">{{ transaction.description || transaction.type }}</div>
                <div class="transaction-date">{{ formatDate(transaction.createdAt) }}</div>
              </div>
              <div class="transaction-amount">
                {{ transaction.amount > 0 ? '+' : '' }}{{ formatCurrency(transaction.amount) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="no-selection">
        <Icon icon="mdi:account-arrow-left" width="64" />
        <p>Kullanıcı seçin</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import api from '@/utils/axios.js'
import { useAlert } from '../composables/useAlert'

const { success, error } = useAlert()

const users = ref([])
const selectedUser = ref(null)
const transactions = ref([])
const searchQuery = ref('')
const balanceAmount = ref(null)
const balanceDescription = ref('')
const isLoading = ref(false)
const isLoadingHistory = ref(false)
const isProcessing = ref(false)

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value

  const query = searchQuery.value.toLowerCase()
  return users.value.filter(user => {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase()
    const email = user.email.toLowerCase()
    const username = (user.username || '').toLowerCase()
    return name.includes(query) || email.includes(query) || username.includes(query)
  })
})

async function loadUsers() {
  isLoading.value = true
  try {
    const response = await api.get('/balance/admin/all')
    users.value = response.data
  } catch (err) {
    console.error('Kullanıcılar yüklenemedi:', err)
    error('Kullanıcı listesi yüklenirken hata oluştu')
  } finally {
    isLoading.value = false
  }
}

async function selectUser(user) {
  selectedUser.value = user
  balanceAmount.value = null
  balanceDescription.value = ''
  await loadTransactionHistory(user.id)
}

async function loadTransactionHistory(userId) {
  isLoadingHistory.value = true
  try {
    const response = await api.get(`/balance/admin/history/${userId}`)
    transactions.value = response.data
  } catch (err) {
    console.error('İşlem geçmişi yüklenemedi:', err)
    error('İşlem geçmişi yüklenirken hata oluştu')
  } finally {
    isLoadingHistory.value = false
  }
}

async function addBalance() {
  if (!balanceAmount.value || balanceAmount.value <= 0) {
    error('Geçerli bir miktar girin')
    return
  }

  isProcessing.value = true
  try {
    const response = await api.post('/balance/admin/add', {
      userId: selectedUser.value.id,
      amount: balanceAmount.value,
      description: balanceDescription.value || undefined
    })

    // Kullanıcının bakiyesini güncelle
    const userIndex = users.value.findIndex(u => u.id === selectedUser.value.id)
    if (userIndex !== -1) {
      users.value[userIndex].balance = response.data.newBalance
      selectedUser.value.balance = response.data.newBalance
    }

    // İşlem geçmişini yenile
    await loadTransactionHistory(selectedUser.value.id)

    // Formu temizle
    balanceAmount.value = null
    balanceDescription.value = ''

    success(`${formatCurrency(response.data.transaction.amount)} bakiye eklendi`)
  } catch (err) {
    console.error('Bakiye eklenemedi:', err)
    error(err.response?.data?.error || 'Bakiye eklenirken hata oluştu')
  } finally {
    isProcessing.value = false
  }
}

async function toggleBalanceEnabled() {
  if (!selectedUser.value) return

  isProcessing.value = true
  try {
    const newStatus = !selectedUser.value.balanceEnabled
    const response = await api.put('/balance/admin/toggle-enabled', {
      userId: selectedUser.value.id,
      enabled: newStatus
    })

    // Kullanıcının durumunu güncelle
    const userIndex = users.value.findIndex(u => u.id === selectedUser.value.id)
    if (userIndex !== -1) {
      users.value[userIndex].balanceEnabled = response.data.balanceEnabled
      selectedUser.value.balanceEnabled = response.data.balanceEnabled
    }

    success(
      newStatus ? 'Bakiye özelliği etkinleştirildi' : 'Bakiye özelliği devre dışı bırakıldı'
    )
  } catch (err) {
    console.error('Bakiye durumu güncellenemedi:', err)
    error(err.response?.data?.error || 'Bakiye durumu güncellenirken hata oluştu')
  } finally {
    isProcessing.value = false
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount || 0)
}

function formatDate(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.balance-management {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.page-header p {
  color: #6b7280;
  margin: 0;
}

.content-wrapper {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 1.5rem;
  align-items: start;
}

.users-list {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.search-box svg {
  color: #6b7280;
  flex-shrink: 0;
}

.search-input {
  border: none;
  background: transparent;
  outline: none;
  flex: 1;
  font-size: 0.875rem;
  color: #1f2937;
}

.user-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-card {
  padding: 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.user-card:hover {
  border-color: #3b82f6;
  background: #f9fafb;
}

.user-card.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9375rem;
  margin-bottom: 0.25rem;
}

.user-email {
  font-size: 0.8125rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-type {
  font-size: 0.75rem;
  color: #3b82f6;
  font-weight: 500;
}

.balance-info {
  text-align: right;
  flex-shrink: 0;
}

.balance-amount {
  font-weight: 700;
  color: #1f2937;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.balance-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #10b981;
  font-weight: 500;
}

.balance-status.disabled {
  color: #ef4444;
}

.user-details {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.details-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.25rem 0;
}

.details-header p {
  color: #6b7280;
  margin: 0;
  font-size: 0.875rem;
}

.btn-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-toggle:hover:not(:disabled) {
  border-color: #3b82f6;
  color: #3b82f6;
}

.btn-toggle.active {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.btn-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.balance-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.summary-card svg {
  color: #3b82f6;
  flex-shrink: 0;
}

.summary-label {
  font-size: 0.8125rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
}

.add-balance-form {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.add-balance-form h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group:last-of-type {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9375rem;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 0.9375rem;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.transaction-history h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
}

.transactions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.transaction-item.credit {
  border-left: 3px solid #10b981;
}

.transaction-item.credit svg {
  color: #10b981;
}

.transaction-item.debit {
  border-left: 3px solid #ef4444;
}

.transaction-item.debit svg {
  color: #ef4444;
}

.transaction-details {
  flex: 1;
  min-width: 0;
}

.transaction-desc {
  font-weight: 500;
  color: #1f2937;
  font-size: 0.9375rem;
  margin-bottom: 0.25rem;
}

.transaction-date {
  font-size: 0.8125rem;
  color: #6b7280;
}

.transaction-amount {
  font-weight: 700;
  font-size: 1rem;
}

.transaction-item.credit .transaction-amount {
  color: #10b981;
}

.transaction-item.debit .transaction-amount {
  color: #ef4444;
}

.no-selection {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 4rem 2rem;
  text-align: center;
  color: #9ca3af;
}

.no-selection svg {
  margin-bottom: 1rem;
}

.no-selection p {
  font-size: 1.125rem;
  margin: 0;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.empty-state svg {
  color: #9ca3af;
  margin-bottom: 0.75rem;
}

@media (max-width: 1024px) {
  .content-wrapper {
    grid-template-columns: 1fr;
  }

  .users-list {
    max-height: 400px;
  }
}

@media (max-width: 768px) {
  .balance-management {
    padding: 1rem;
  }

  .page-header h1 {
    font-size: 1.5rem;
  }

  .balance-summary {
    grid-template-columns: 1fr;
  }

  .details-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .btn-toggle {
    width: 100%;
    justify-content: center;
  }
}
</style>
