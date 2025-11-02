<script setup>
import { ref, onMounted, computed } from 'vue'
import { Icon } from '@iconify/vue'
import api from '@/utils/axios.js'

const notificationTypes = ref([])
const userTypes = ref([])
const permissions = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const message = ref({ type: '', text: '' })
const selectedCategory = ref('ALL')

const categories = [
  { value: 'ALL', label: 'Tümü', icon: 'mdi:view-grid' },
  { value: 'BID', label: 'Teklif', icon: 'mdi:gavel' },
  { value: 'LEAD', label: 'Lead', icon: 'mdi:briefcase-outline' },
  { value: 'PAYMENT', label: 'Ödeme', icon: 'mdi:wallet-outline' }
]

// Kategoriye göre filtrele
const filteredNotificationTypes = computed(() => {
  if (selectedCategory.value === 'ALL') {
    return notificationTypes.value
  }
  return notificationTypes.value.filter(
    nt => nt.category === selectedCategory.value
  )
})

// Verileri yükle
async function loadData() {
  try {
    isLoading.value = true

    // Bildirim tiplerini yükle
    const notifTypesResponse = await api.get('/notifications/admin/notification-types')
    notificationTypes.value = notifTypesResponse.data

    // Kullanıcı tiplerini yükle
    const userTypesResponse = await api.get('/user-types')
    userTypes.value = userTypesResponse.data

    // İzinleri yükle
    const permissionsResponse = await api.get('/notifications/admin/notification-permissions')
    permissions.value = permissionsResponse.data

  } catch (error) {
    console.error('Veriler yüklenirken hata:', error)
    showMessage('error', 'Veriler yüklenirken bir hata oluştu')
  } finally {
    isLoading.value = false
  }
}

// İzni kontrol et
function hasPermission(userTypeId, notificationTypeId) {
  const permission = permissions.value.find(
    p => p.userTypeId === userTypeId && p.notificationTypeId === notificationTypeId
  )
  return permission?.canReceive ?? true
}

// İzni toggle et
async function togglePermission(userTypeId, notificationTypeId) {
  try {
    isSaving.value = true
    const currentPermission = hasPermission(userTypeId, notificationTypeId)

    await api.put('/notifications/admin/notification-permissions', {
      userTypeId,
      notificationTypeId,
      canReceive: !currentPermission
    })

    // Local state'i güncelle
    const permissionIndex = permissions.value.findIndex(
      p => p.userTypeId === userTypeId && p.notificationTypeId === notificationTypeId
    )

    if (permissionIndex !== -1) {
      permissions.value[permissionIndex].canReceive = !currentPermission
    } else {
      permissions.value.push({
        userTypeId,
        notificationTypeId,
        canReceive: !currentPermission
      })
    }

    showMessage('success', 'İzin güncellendi')
  } catch (error) {
    console.error('İzin güncellenirken hata:', error)
    showMessage('error', 'İzin güncellenirken bir hata oluştu')
  } finally {
    isSaving.value = false
  }
}

// Tüm izinleri aç/kapat (bir rol için tüm bildirimler)
async function toggleAllForUserType(userTypeId, enable) {
  try {
    isSaving.value = true
    const updates = filteredNotificationTypes.value.map(nt =>
      api.put('/notifications/admin/notification-permissions', {
        userTypeId,
        notificationTypeId: nt.id,
        canReceive: enable
      })
    )

    await Promise.all(updates)

    // Local state'i güncelle
    filteredNotificationTypes.value.forEach(nt => {
      const permissionIndex = permissions.value.findIndex(
        p => p.userTypeId === userTypeId && p.notificationTypeId === nt.id
      )

      if (permissionIndex !== -1) {
        permissions.value[permissionIndex].canReceive = enable
      } else {
        permissions.value.push({
          userTypeId,
          notificationTypeId: nt.id,
          canReceive: enable
        })
      }
    })

    showMessage('success', 'Tüm izinler güncellendi')
  } catch (error) {
    console.error('İzinler güncellenirken hata:', error)
    showMessage('error', 'İzinler güncellenirken bir hata oluştu')
  } finally {
    isSaving.value = false
  }
}

// Tüm izinleri aç/kapat (bir bildirim için tüm roller)
async function toggleAllForNotificationType(notificationTypeId, enable) {
  try {
    isSaving.value = true
    const updates = userTypes.value.map(ut =>
      api.put('/notifications/admin/notification-permissions', {
        userTypeId: ut.id,
        notificationTypeId,
        canReceive: enable
      })
    )

    await Promise.all(updates)

    // Local state'i güncelle
    userTypes.value.forEach(ut => {
      const permissionIndex = permissions.value.findIndex(
        p => p.userTypeId === ut.id && p.notificationTypeId === notificationTypeId
      )

      if (permissionIndex !== -1) {
        permissions.value[permissionIndex].canReceive = enable
      } else {
        permissions.value.push({
          userTypeId: ut.id,
          notificationTypeId,
          canReceive: enable
        })
      }
    })

    showMessage('success', 'Tüm izinler güncellendi')
  } catch (error) {
    console.error('İzinler güncellenirken hata:', error)
    showMessage('error', 'İzinler güncellenirken bir hata oluştu')
  } finally {
    isSaving.value = false
  }
}

// Mesaj göster
function showMessage(type, text) {
  message.value = { type, text }
  setTimeout(() => {
    message.value = { type: '', text: '' }
  }, 3000)
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="admin-notification-settings">
    <div class="header">
      <div class="section-header">
        <h1>
          <Icon icon="mdi:bell-cog" width="32" height="32" />
          Bildirim Yönetimi
        </h1>
        <p>Kullanıcı rollerine göre bildirim izinlerini yönetin</p>
      </div>
    </div>

    <!-- Alert Message -->
    <transition name="fade">
      <div v-if="message.text" :class="['alert', `alert-${message.type}`]">
        <Icon
          :icon="message.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'"
          width="20"
          height="20"
        />
        <span>{{ message.text }}</span>
      </div>
    </transition>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Yükleniyor...</p>
    </div>

    <!-- Content -->
    <div v-else class="content">
      <!-- Category Filter -->
      <div class="category-filter">
        <button
          v-for="cat in categories"
          :key="cat.value"
          @click="selectedCategory = cat.value"
          :class="['filter-btn', { active: selectedCategory === cat.value }]"
        >
          <Icon :icon="cat.icon" width="18" height="18" />
          <span>{{ cat.label }}</span>
        </button>
      </div>

      <!-- Info Box -->
      <div class="info-box">
        <Icon icon="mdi:information-outline" width="20" height="20" />
        <div>
          <strong>Bildirim İzinleri Nasıl Çalışır?</strong>
          <p>
            Bu sayfada her kullanıcı rolü için hangi bildirimlerin gönderileceğini belirleyebilirsiniz.
            Kullanıcılar kendi tercihlerinden bildirimleri kapatabilir, ancak burada kapalı olan bildirimleri alamazlar.
          </p>
        </div>
      </div>

      <!-- Permissions Table -->
      <div class="permissions-table-wrapper">
        <table class="permissions-table">
          <thead>
            <tr>
              <th class="notification-column">
                <span>Bildirim Tipi</span>
              </th>
              <th v-for="userType in userTypes" :key="userType.id" class="user-type-column">
                <div class="user-type-header">
                  <span>{{ userType.name }}</span>
                  <div class="header-actions">
                    <button
                      @click="toggleAllForUserType(userType.id, true)"
                      class="mini-btn"
                      title="Tümünü aç"
                      :disabled="isSaving"
                    >
                      <Icon icon="mdi:check-all" width="14" height="14" />
                    </button>
                    <button
                      @click="toggleAllForUserType(userType.id, false)"
                      class="mini-btn"
                      title="Tümünü kapat"
                      :disabled="isSaving"
                    >
                      <Icon icon="mdi:close" width="14" height="14" />
                    </button>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="notifType in filteredNotificationTypes" :key="notifType.id">
              <td class="notification-info">
                <div class="notification-cell">
                  <Icon :icon="notifType.icon || 'mdi:bell'" width="20" height="20" />
                  <div class="notification-details">
                    <strong>{{ notifType.name }}</strong>
                    <span class="category-badge" :data-category="notifType.category">
                      {{ notifType.category }}
                    </span>
                    <p>{{ notifType.description }}</p>
                  </div>
                  <div class="row-actions">
                    <button
                      @click="toggleAllForNotificationType(notifType.id, true)"
                      class="mini-btn"
                      title="Tüm roller için aç"
                      :disabled="isSaving"
                    >
                      <Icon icon="mdi:check-all" width="14" height="14" />
                    </button>
                    <button
                      @click="toggleAllForNotificationType(notifType.id, false)"
                      class="mini-btn"
                      title="Tüm roller için kapat"
                      :disabled="isSaving"
                    >
                      <Icon icon="mdi:close" width="14" height="14" />
                    </button>
                  </div>
                </div>
              </td>
              <td v-for="userType in userTypes" :key="userType.id" class="permission-cell">
                <label class="checkbox-wrapper">
                  <input
                    type="checkbox"
                    :checked="hasPermission(userType.id, notifType.id)"
                    @change="togglePermission(userType.id, notifType.id)"
                    :disabled="isSaving"
                  />
                  <span class="checkmark"></span>
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-notification-settings {
  padding: 24px;
  max-width: 80%;
  margin: 0 auto;
}

.header {
  margin-bottom: 24px;
}

.header-content h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  color: #111827;
}

.header-content p {
  margin: 0;
  font-size: 16px;
  color: #6b7280;
}

.alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 24px;
  font-size: 14px;
  font-weight: 500;
}

.alert-success {
  background: #d1fae5;
  color: #065f46;
}

.alert-error {
  background: #fee2e2;
  color: #991b1b;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 20px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.category-filter {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.filter-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
}

.info-box {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  margin-bottom: 24px;
  color: #1e40af;
}

.info-box strong {
  display: block;
  margin-bottom: 8px;
  font-size: 15px;
}

.info-box p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #1e3a8a;
}

.permissions-table-wrapper {
  overflow-x: auto;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.permissions-table {
  width: 100%;
  border-collapse: collapse;
}

.permissions-table thead {
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.permissions-table th {
  padding: 16px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.notification-column {
  min-width: 300px;
  max-width: 500px;
}

.user-type-column {
  min-width: 120px;
  text-align: center !important;
}

.user-type-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.mini-btn {
  padding: 4px 8px;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #667eea;
  color: #667eea;
}

.mini-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.permissions-table tbody tr {
  border-bottom: 1px solid #f3f4f6;
}

.permissions-table tbody tr:hover {
  background: #f9fafb;
}

.notification-info {
  padding: 16px;
}

.notification-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-cell > :deep(svg) {
  color: #667eea;
  flex-shrink: 0;
}

.notification-details {
  flex: 1;
  min-width: 0;
}

.notification-details strong {
  display: block;
  font-size: 14px;
  color: #111827;
  margin-bottom: 4px;
}

.category-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  margin-bottom: 4px;
}

.category-badge[data-category="BID"] {
  background: #ede9fe;
  color: #6d28d9;
}

.category-badge[data-category="LEAD"] {
  background: #d1fae5;
  color: #065f46;
}

.category-badge[data-category="PAYMENT"] {
  background: #fef3c7;
  color: #92400e;
}

.category-badge[data-category="ADMIN"] {
  background: #fee2e2;
  color: #991b1b;
}

.notification-details p {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
}

.row-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.permission-cell {
  padding: 16px;
  text-align: center;
}

.checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
}

.checkbox-wrapper input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkmark {
  width: 24px;
  height: 24px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background: white;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkmark::after {
  content: '';
  display: none;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-wrapper input:checked + .checkmark {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
}

.checkbox-wrapper input:checked + .checkmark::after {
  display: block;
}

.checkbox-wrapper input:disabled + .checkmark {
  opacity: 0.5;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Mobil responsive */
@media (max-width: 768px) {
  .admin-notification-settings {
    padding: 16px;
  }

  .header-content h1 {
    font-size: 24px;
  }

  .permissions-table-wrapper {
    border-radius: 8px;
  }

  .notification-column {
    min-width: 250px;
  }

  .user-type-column {
    min-width: 100px;
  }
}
</style>
