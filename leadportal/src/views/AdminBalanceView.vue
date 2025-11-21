<template>
  <div class="balance-management">
    <div class="page-header">
      <h1>Guthabenverwaltung</h1>
      <p>Benutzerguthaben verwalten und Transaktionen anzeigen</p>
    </div>

    <div class="content-wrapper">
      <div class="users-list">
        <div class="search-box">
          <Icon icon="mdi:magnify" width="20" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Benutzer suchen..."
            class="search-input"
          />
        </div>

        <div v-if="isLoading" class="loading-state">Wird geladen...</div>
        <div v-else-if="filteredUsers.length === 0" class="empty-state">
          <Icon icon="mdi:account-search" width="48" />
          <p>Kein Benutzer gefunden</p>
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
              <div class="user-type">{{ user.userType?.name || 'Benutzer' }}</div>
            </div>
            <div class="balance-info">
              <div class="balance-amount">{{ formatCurrency(user.balance) }}</div>
              <div class="balance-status" :class="{ disabled: !user.balanceEnabled }">
                <Icon
                  :icon="user.balanceEnabled ? 'mdi:check-circle' : 'mdi:close-circle'"
                  width="16"
                />
                {{ user.balanceEnabled ? 'Aktiv' : 'Inaktiv' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="user-details" v-if="selectedUser">
        <div class="details-header">
          <button
            class="btn-back"
            @click="selectedUser = null"
            :disabled="isProcessing"
          >
            <Icon icon="mdi:arrow-left" width="20" />
            <span>Zurück</span>
          </button>
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
            {{ selectedUser.balanceEnabled ? 'Guthaben aktiv' : 'Guthaben inaktiv' }}
          </button>
        </div>

        <div class="balance-summary">
          <div class="summary-card">
            <Icon icon="mdi:wallet" width="24" />
            <div>
              <div class="summary-label">Aktuelles Guthaben</div>
              <div class="summary-value">{{ formatCurrency(selectedUser.balance) }}</div>
            </div>
          </div>
          <div class="summary-card">
            <Icon icon="mdi:credit-card" width="24" />
            <div>
              <div class="summary-label">Zahlungsmethode</div>
              <div class="summary-value">
                {{ selectedUser.paymentMethod === 'balance' ? 'Guthaben' : 'IBAN' }}
              </div>
            </div>
          </div>
        </div>

        <div class="balance-operations">
          <div class="operation-form">
            <h3>Guthaben hinzufügen</h3>
            <form @submit.prevent="addBalance">
              <div class="form-group">
                <label>Betrag (€)</label>
                <input
                  type="number"
                  v-model.number="balanceAmount"
                  placeholder="z.B.: 100"
                  min="0.01"
                  step="0.01"
                  required
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>Beschreibung *</label>
                <input
                  type="text"
                  v-model="balanceDescription"
                  placeholder="z.B.: Monatliche Guthabenaufladung"
                  required
                  class="form-input"
                />
              </div>
              <button type="submit" class="btn-primary" :disabled="isProcessing || !balanceAmount || !balanceDescription">
                <Icon icon="mdi:plus-circle" width="20" />
                {{ isProcessing ? 'Wird hinzugefügt...' : 'Guthaben hinzufügen' }}
              </button>
            </form>
          </div>

          <div class="operation-form deduct">
            <h3>Guthaben abziehen</h3>
            <form @submit.prevent="deductBalance">
              <div class="form-group">
                <label>Miktar (€)</label>
                <input
                  type="number"
                  v-model.number="deductAmount"
                  placeholder="z.B.: 50"
                  min="0.01"
                  step="0.01"
                  required
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>Açıklama *</label>
                <input
                  type="text"
                  v-model="deductDescription"
                  placeholder="z.B.: Korrekturvorgang"
                  required
                  class="form-input"
                />
              </div>
              <button type="submit" class="btn-danger" :disabled="isProcessing || !deductAmount || !deductDescription">
                <Icon icon="mdi:minus-circle" width="20" />
                {{ isProcessing ? 'Wird abgezogen...' : 'Guthaben abziehen' }}
              </button>
            </form>
          </div>
        </div>

        <div class="transaction-history">
          <h3>Transaktionsverlauf</h3>
          <div v-if="isLoadingHistory" class="loading-state">Verlauf wird geladen...</div>
          <div v-else-if="transactions.length === 0" class="empty-state">
            <Icon icon="mdi:history" width="48" />
            <p>Noch keine Transaktionen</p>
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
        <p>Benutzer auswählen</p>
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
const deductAmount = ref(null)
const deductDescription = ref('')
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
    console.error('Benutzer konnten nicht geladen werden:', err)
    error('Fehler beim Laden der Benutzerliste')
  } finally {
    isLoading.value = false
  }
}

async function selectUser(user) {
  selectedUser.value = user
  balanceAmount.value = null
  balanceDescription.value = ''
  deductAmount.value = null
  deductDescription.value = ''
  await loadTransactionHistory(user.id)
}

async function loadTransactionHistory(userId) {
  isLoadingHistory.value = true
  try {
    const response = await api.get(`/balance/admin/history/${userId}`)
    transactions.value = response.data
  } catch (err) {
    console.error('Transaktionsverlauf konnte nicht geladen werden:', err)
    error('Fehler beim Laden des Transaktionsverlaufs')
  } finally {
    isLoadingHistory.value = false
  }
}

async function addBalance() {
  if (!balanceAmount.value || balanceAmount.value <= 0) {
    error('Bitte geben Sie einen gültigen Betrag ein')
    return
  }

  if (!balanceDescription.value || balanceDescription.value.trim() === '') {
    error('Beschreibung ist erforderlich')
    return
  }

  isProcessing.value = true
  try {
    const response = await api.post('/balance/admin/add', {
      userId: selectedUser.value.id,
      amount: balanceAmount.value,
      description: balanceDescription.value
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

    success(`${formatCurrency(response.data.transaction.amount)} Guthaben hinzugefügt`)
  } catch (err) {
    console.error('Guthaben konnte nicht hinzugefügt werden:', err)
    error(err.response?.data?.error || 'Fehler beim Hinzufügen des Guthabens')
  } finally {
    isProcessing.value = false
  }
}

async function deductBalance() {
  if (!deductAmount.value || deductAmount.value <= 0) {
    error('Bitte geben Sie einen gültigen Betrag ein')
    return
  }

  if (!deductDescription.value || deductDescription.value.trim() === '') {
    error('Beschreibung ist erforderlich')
    return
  }

  if (deductAmount.value > selectedUser.value.balance) {
    error('Der zu löschende Betrag übersteigt das Guthaben des Benutzers')
    return
  }

  isProcessing.value = true
  try {
    const response = await api.post('/balance/admin/deduct', {
      userId: selectedUser.value.id,
      amount: deductAmount.value,
      description: deductDescription.value
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
    deductAmount.value = null
    deductDescription.value = ''

    success(`${formatCurrency(deductAmount.value)} Guthaben abgezogen`)
  } catch (err) {
    console.error('Guthaben konnte nicht abgezogen werden:', err)
    error(err.response?.data?.error || 'Fehler beim Abziehen des Guthabens')
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
      newStatus ? 'Guthaben-Funktion aktiviert' : 'Guthaben-Funktion deaktiviert'
    )
  } catch (err) {
    console.error('Guthabenstatus konnte nicht aktualisiert werden:', err)
    error(err.response?.data?.error || 'Fehler beim Aktualisieren des Guthabenstatus')
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
  return date.toLocaleString('de-DE', {
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
  width: 100%;
  margin: 0;
  padding: 0;
}

.page-header {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  
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

.btn-back {
  display: none;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #6b7280;
  font-weight: 500;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover:not(:disabled) {
  border-color: #3b82f6;
  color: #3b82f6;
}

.btn-back:disabled {
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

.balance-operations {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.operation-form {
  padding: 1.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.operation-form.deduct {
  background: #fef2f2;
  border-color: #fecaca;
}

.operation-form h3 {
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

.btn-danger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 0.9375rem;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger:disabled {
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
  .balance-management {
    max-width: 100%;
    padding: 0;
  }

  .content-wrapper {
    grid-template-columns: 1fr;
  }

  .users-list {
    max-height: 500px;
  }
}

@media (max-width: 768px) {
  .balance-management {
    padding: 0;
    max-width: 100%;
  }

  .page-header {
    margin-bottom: 0.75rem;
  }

  .page-header h1 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.25rem 0;
  }

  .page-header p {
    font-size: 0.75rem;
    margin: 0;
  }

  .content-wrapper {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .users-list {
    padding: 0.75rem;
    max-height: 400px;
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }

  .search-box {
    padding: 0.625rem;
    margin-bottom: 0.75rem;
    gap: 0.375rem;
  }

  .search-input {
    font-size: 0.8125rem;
  }

  .user-card {
    padding: 0.625rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .user-name {
    font-size: 0.8125rem;
    margin-bottom: 0.125rem;
  }

  .user-email {
    font-size: 0.875rem;
    margin-bottom: 0.125rem;
  }

  .user-type {
    font-size: 0.65rem;
  }

  .balance-info {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: left;
    padding-top: 0.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .balance-amount {
    font-size: 0.875rem;
    font-weight: 700;
  }

  .balance-status {
    font-size: 0.65rem;
  }

  .user-details {
    padding: 0.75rem;
    border-radius: 8px;
  }

  .details-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .details-header > div {
    width: 100%;
  }

  .details-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.125rem 0;
  }

  .details-header p {
    font-size: 0.75rem;
  }

  .btn-back {
    display: flex;
    width: 100%;
    justify-content: flex-start;
    padding: 0.625rem 0.75rem;
    font-size: 0.8125rem;
  }

  .btn-toggle {
    width: 100%;
    justify-content: center;
    font-size: 0.8125rem;
    padding: 0.625rem 0.75rem;
  }

  .balance-summary {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .summary-card {
    padding: 0.75rem;
    gap: 0.5rem;
  }

  .summary-label {
    font-size: 0.875rem;
  }

  .summary-value {
    font-size: 0.9375rem;
  }

  .balance-operations {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .operation-form {
    padding: 0.75rem;
  }

  .operation-form h3 {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0 0 0.625rem 0;
  }

  .form-group {
    margin-bottom: 0.625rem;
  }

  .form-group:last-of-type {
    margin-bottom: 0.75rem;
  }

  .form-group label {
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .form-input {
    padding: 0.625rem;
    font-size: 0.9rem;
    border-radius: 6px;
  }

  .btn-primary,
  .btn-danger {
    width: 100%!important;
    padding: 0.625rem 0.75rem !important;
    font-size: 0.875rem;
    border-radius: 6px;
    justify-content: center;
  }

  .transaction-history {
    padding-top: 0.75rem;
  }

  .transaction-history h3 {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0 0 0.625rem 0;
  }

  .transaction-item {
    padding: 0.625rem;
    gap: 0.5rem;
  }

  .transaction-details {
    gap: 0.125rem;
  }

  .transaction-desc {
    font-size: 0.8125rem;
    margin-bottom: 0.125rem;
  }

  .transaction-date {
    font-size: 0.875rem;
  }

  .transaction-amount {
    font-size: 0.8125rem;
  }

  .no-selection {
    padding: 1.5rem 0.75rem;
  }

  .no-selection svg {
    width: 48px;
    height: 48px;
  }

  .no-selection p {
    font-size: 0.9375rem;
  }

  .loading-state,
  .empty-state {
    padding: 1rem 0.75rem;
  }
}

@media (max-width: 480px) {
  .balance-management {
    padding: 0;
  }

  .page-header {
    margin-bottom: 0.5rem;
  }

  .page-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.125rem 0;
  }

  .page-header p {
    font-size: 0.875rem;
  }

  .content-wrapper {
    gap: 0.5rem;
  }

  .search-box {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    gap: 0.375rem;
  }

  .search-box svg {
    width: 16px;
  }

  .search-input {
    font-size: 0.75rem;
  }

  .users-list {
    padding: 0.5rem;
    max-height: 320px;
    margin-bottom: 0.375rem;
  }

  .user-card {
    padding: 0.5rem;
    gap: 0.375rem;
  }

  .user-name {
    font-size: 0.75rem;
    margin-bottom: 0.0625rem;
  }

  .user-email {
    font-size: 0.65rem;
    margin-bottom: 0.0625rem;
  }

  .user-type {
    font-size: 0.6rem;
  }

  .balance-amount {
    font-size: 0.8rem;
  }

  .balance-status {
    font-size: 0.6rem;
  }

  .user-details {
    padding: 0.5rem;
  }

  .details-header {
    gap: 0.375rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .details-header h2 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 0.0625rem 0;
  }

  .details-header p {
    font-size: 0.65rem;
  }

  .btn-back {
    padding: 0.5rem 0.625rem;
    font-size: 0.75rem;
  }

  .btn-back svg {
    width: 16px;
  }

  .btn-toggle {
    font-size: 0.75rem;
    padding: 0.5rem 0.625rem;
  }

  .btn-toggle svg {
    width: 18px;
  }

  .balance-summary {
    gap: 0.375rem;
    margin-bottom: 0.5rem;
  }

  .summary-card {
    padding: 0.625rem;
    gap: 0.375rem;
  }

  .summary-card svg {
    width: 18px;
  }

  .summary-label {
    font-size: 0.65rem;
    margin-bottom: 0.125rem;
  }

  .summary-value {
    font-size: 0.85rem;
    font-weight: 700;
  }

  .balance-operations {
    gap: 0.375rem;
    margin-bottom: 0.5rem;
  }

  .operation-form {
    padding: 0.625rem;
  }

  .operation-form h3 {
    font-size: 0.8rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  .form-group {
    margin-bottom: 0.5rem;
  }

  .form-group:last-of-type {
    margin-bottom: 0.625rem;
  }

  .form-group label {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.125rem;
  }

  .form-input {
    padding: 0.5rem;
    font-size: 0.85rem;
  }

  .btn-primary,
  .btn-danger {
    font-size: 0.8rem;
    padding: 0.5rem 0.625rem !important;
  }

  .btn-primary svg,
  .btn-danger svg {
    width: 16px;
  }

  .transaction-history {
    padding-top: 0.5rem;
  }

  .transaction-history h3 {
    font-size: 0.8rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  .transaction-item {
    padding: 0.5rem;
    gap: 0.375rem;
  }

  .transaction-item svg {
    width: 16px;
  }

  .transaction-desc {
    font-size: 0.75rem;
    margin-bottom: 0.0625rem;
  }

  .transaction-date {
    font-size: 0.65rem;
  }

  .transaction-amount {
    font-size: 0.75rem;
  }

  .no-selection {
    padding: 1rem 0.5rem;
  }

  .no-selection svg {
    width: 40px;
    height: 40px;
  }

  .no-selection p {
    font-size: 0.875rem;
  }

  .loading-state,
  .empty-state {
    padding: 0.75rem 0.5rem;
  }

  .empty-state svg {
    width: 40px;
  }
}
</style>
