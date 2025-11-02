<script setup>
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import api from '@/utils/axios.js'

const preferences = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const message = ref({ type: '', text: '' })

// Kategoriye göre grupla
const groupedPreferences = ref({
  BID: [],
  LEAD: [],
  PAYMENT: [],
  ADMIN: []
})

const categoryLabels = {
  BID: {
    name: 'Teklif Bildirimleri',
    description: 'Teklif verme ve alma ile ilgili bildirimler',
    icon: 'mdi:gavel'
  },
  LEAD: {
    name: 'Lead Bildirimleri',
    description: 'Lead durumu ve satış bildirimleri',
    icon: 'mdi:briefcase-outline'
  },
  PAYMENT: {
    name: 'Ödeme Bildirimleri',
    description: 'Bakiye ve ödeme işlemleri hakkında bildirimler',
    icon: 'mdi:wallet-outline'
  },
  ADMIN: {
    name: 'Admin Bildirimleri',
    description: 'Yönetim ve sistem bildirimleri',
    icon: 'mdi:shield-account-outline'
  }
}

// Tercihleri yükle
async function loadPreferences() {
  try {
    isLoading.value = true
    const response = await api.get('/notifications/preferences')

    if (response.data.success) {
      preferences.value = response.data.preferences

      // Kategorilere göre grupla
      groupedPreferences.value = {
        BID: [],
        LEAD: [],
        PAYMENT: [],
        ADMIN: []
      }

      preferences.value.forEach(pref => {
        const category = pref.notificationType.category
        if (groupedPreferences.value[category]) {
          groupedPreferences.value[category].push(pref)
        }
      })
    }
  } catch (error) {
    console.error('Tercihler yüklenirken hata:', error)
    showMessage('error', 'Tercihler yüklenirken bir hata oluştu')
  } finally {
    isLoading.value = false
  }
}

// Tercihi güncelle
async function updatePreference(notificationTypeId, emailEnabled, inAppEnabled) {
  try {
    isSaving.value = true
    const response = await api.put(`/notifications/preferences/${notificationTypeId}`, {
      emailEnabled,
      inAppEnabled
    })

    if (response.data.success) {
      showMessage('success', 'Tercihler güncellendi')
    }
  } catch (error) {
    console.error('Tercih güncellenirken hata:', error)
    showMessage('error', 'Tercih güncellenirken bir hata oluştu')
  } finally {
    isSaving.value = false
  }
}

// Email/InApp toggle
function toggleEmail(preference) {
  preference.emailEnabled = !preference.emailEnabled
  updatePreference(
    preference.notificationType.id,
    preference.emailEnabled,
    preference.inAppEnabled
  )
}

function toggleInApp(preference) {
  preference.inAppEnabled = !preference.inAppEnabled
  updatePreference(
    preference.notificationType.id,
    preference.emailEnabled,
    preference.inAppEnabled
  )
}

// Mesaj göster
function showMessage(type, text) {
  message.value = { type, text }
  setTimeout(() => {
    message.value = { type: '', text: '' }
  }, 3000)
}

// Kategorideki tüm bildirimleri aç/kapat
function toggleAllInCategory(category, type, value) {
  groupedPreferences.value[category].forEach(pref => {
    if (!pref.canReceive) return // Rol izni yoksa atla

    if (type === 'email') {
      pref.emailEnabled = value
    } else if (type === 'inApp') {
      pref.inAppEnabled = value
    }

    updatePreference(
      pref.notificationType.id,
      pref.emailEnabled,
      pref.inAppEnabled
    )
  })
}

onMounted(() => {
  loadPreferences()
})
</script>

<template>
  <div class="preferences-container">
    <div class="preferences-header">
      <div class="header-content">
        <h1>
          <Icon icon="mdi:bell-cog-outline" width="32" height="32" />
          Bildirim Tercihleri
        </h1>
        <p>Hangi bildirimleri almak istediğinizi seçin</p>
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
      <p>Tercihler yükleniyor...</p>
    </div>

    <!-- Preferences Content -->
    <div v-else class="preferences-content">
      <div class="info-box">
        <Icon icon="mdi:information-outline" width="20" height="20" />
        <div>
          <strong>Bildirim kanalları:</strong>
          <p>
            <strong>In-App:</strong> Platform içinde göreceğiniz bildirimler<br>
            <strong>Email:</strong> E-posta adresinize gönderilecek bildirimler
          </p>
        </div>
      </div>

      <!-- Her kategori için -->
      <div
        v-for="(categoryPrefs, category) in groupedPreferences"
        :key="category"
        class="category-section"
        v-show="categoryPrefs.length > 0"
      >
        <div class="category-header">
          <div class="category-info">
            <Icon :icon="categoryLabels[category].icon" width="24" height="24" />
            <div>
              <h2>{{ categoryLabels[category].name }}</h2>
              <p>{{ categoryLabels[category].description }}</p>
            </div>
          </div>

          <div class="category-actions">
            <button
              @click="toggleAllInCategory(category, 'email', true)"
              class="btn-small"
              title="Tüm email bildirimlerini aç"
            >
              <Icon icon="mdi:email-check" width="16" height="16" />
              Tümünü Aç (Email)
            </button>
            <button
              @click="toggleAllInCategory(category, 'email', false)"
              class="btn-small"
              title="Tüm email bildirimlerini kapat"
            >
              <Icon icon="mdi:email-off" width="16" height="16" />
              Tümünü Kapat (Email)
            </button>
          </div>
        </div>

        <div class="preferences-list">
          <div
            v-for="preference in categoryPrefs"
            :key="preference.notificationType.id"
            class="preference-item"
            :class="{ disabled: !preference.canReceive }"
          >
            <div class="preference-icon">
              <Icon :icon="preference.notificationType.icon" width="24" height="24" />
            </div>

            <div class="preference-info">
              <h3>{{ preference.notificationType.name }}</h3>
              <p>{{ preference.notificationType.description }}</p>
              <span v-if="!preference.canReceive" class="permission-warning">
                <Icon icon="mdi:lock" width="14" height="14" />
                Rol izniniz bu bildirimi almaya yetmiyor
              </span>
            </div>

            <div class="preference-toggles">
              <label class="toggle-wrapper">
                <span class="toggle-label">
                  <Icon icon="mdi:bell-outline" width="16" height="16" />
                  In-App
                </span>
                <input
                  type="checkbox"
                  class="toggle-checkbox"
                  :checked="preference.inAppEnabled"
                  :disabled="!preference.canReceive || !preference.notificationType.inAppEnabled || isSaving"
                  @change="toggleInApp(preference)"
                />
                <div class="toggle-switch"></div>
              </label>

              <label class="toggle-wrapper">
                <span class="toggle-label">
                  <Icon icon="mdi:email-outline" width="16" height="16" />
                  Email
                </span>
                <input
                  type="checkbox"
                  class="toggle-checkbox"
                  :checked="preference.emailEnabled"
                  :disabled="!preference.canReceive || !preference.notificationType.emailEnabled || isSaving"
                  @change="toggleEmail(preference)"
                />
                <div class="toggle-switch"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preferences-container {
  max-width: 80%;
  margin: 0 auto;
  padding: 24px;
}

.preferences-header {
  margin-bottom: 32px;
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

.loading-state p {
  color: #6b7280;
  font-size: 16px;
}

.info-box {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  margin-bottom: 32px;
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

.category-section {
  margin-bottom: 40px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.category-info {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
}

.category-info > :deep(svg) {
  color: #667eea;
  flex-shrink: 0;
  margin-top: 4px;
}

.category-info h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.category-info p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.category-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-small {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #667eea;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small:hover {
  background: #f9fafb;
  border-color: #667eea;
}

.preferences-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preference-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;
}

.preference-item:hover:not(.disabled) {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.preference-item.disabled {
  opacity: 0.5;
  background: #f9fafb;
}

.preference-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.preference-info {
  flex: 1;
  min-width: 0;
}

.preference-info h3 {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.preference-info p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.permission-warning {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 4px 8px;
  background: #fef3c7;
  color: #92400e;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
}

.preference-toggles {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
}

.toggle-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  position: relative;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}

.toggle-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  background: #d1d5db;
  border-radius: 12px;
  transition: background 0.3s;
}

.toggle-switch::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
}

.toggle-checkbox:checked + .toggle-switch {
  background: #667eea;
}

.toggle-checkbox:checked + .toggle-switch::before {
  transform: translateX(20px);
}

.toggle-checkbox:disabled + .toggle-switch {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-wrapper:has(.toggle-checkbox:disabled) {
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
  .preferences-container {
    padding: 16px;
  }

  .header-content h1 {
    font-size: 24px;
  }

  .category-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .category-actions {
    width: 100%;
    flex-direction: column;
  }

  .btn-small {
    width: 100%;
    justify-content: center;
  }

  .preference-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .preference-toggles {
    width: 100%;
    justify-content: space-around;
  }
}
</style>
