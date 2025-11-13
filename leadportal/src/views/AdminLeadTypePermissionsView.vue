<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { Icon } from '@iconify/vue'
import { useAlert } from '@/composables/useAlert.js'

const { showAlert } = useAlert()

const activeTab = ref('userTypes') // 'userTypes' veya 'users'
const loading = ref(false)
const saving = ref(false)

// Kullanıcı tipi bazlı yetkilendirmeler
const userTypePermissions = ref({})
const leadTypes = ref([])
const userTypes = ref([])

// Kullanıcı bazlı yetkilendirmeler
const users = ref([])
const selectedUser = ref(null)
const userPermissions = ref({})
const loadingUserPermissions = ref(false)

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadUserTypePermissions() {
  try {
    loading.value = true
    const response = await axios.get('/api/lead-type-permissions/user-types', { 
      headers: authHeaders() 
    })
    
    userTypePermissions.value = response.data.permissions
    leadTypes.value = response.data.leadTypes
    userTypes.value = response.data.userTypes
  } catch (error) {
    console.error('Lead tipi yetkileri yüklenemedi:', error)
    showAlert('Lead tipi yetkileri yüklenemedi', 'error')
  } finally {
    loading.value = false
  }
}

async function saveUserTypePermissions() {
  try {
    saving.value = true
    await axios.post('/api/lead-type-permissions/user-types', {
      permissions: userTypePermissions.value
    }, { headers: authHeaders() })
    
    showAlert('Kullanıcı tipi yetkileri başarıyla kaydedildi', 'success')
  } catch (error) {
    console.error('Yetkilendirmeler kaydedilemedi:', error)
    showAlert('Yetkilendirmeler kaydedilemedi', 'error')
  } finally {
    saving.value = false
  }
}

async function loadUsers() {
  try {
    const response = await axios.get('/api/users', { headers: authHeaders() })
    users.value = response.data
  } catch (error) {
    console.error('Kullanıcılar yüklenemedi:', error)
    showAlert('Kullanıcılar yüklenemedi', 'error')
  }
}

async function loadUserPermissions(userId) {
  try {
    loadingUserPermissions.value = true
    const response = await axios.get(`/api/lead-type-permissions/users/${userId}`, {
      headers: authHeaders()
    })
    
    userPermissions.value = response.data.permissions
    selectedUser.value = response.data.user
  } catch (error) {
    console.error('Kullanıcı yetkileri yüklenemedi:', error)
    showAlert('Kullanıcı yetkileri yüklenemedi', 'error')
  } finally {
    loadingUserPermissions.value = false
  }
}

async function saveUserPermissions() {
  if (!selectedUser.value) return
  
  try {
    saving.value = true
    await axios.post(`/api/lead-type-permissions/users/${selectedUser.value.id}`, {
      permissions: userPermissions.value
    }, { headers: authHeaders() })
    
    showAlert('Kullanıcı yetkileri başarıyla kaydedildi', 'success')
  } catch (error) {
    console.error('Kullanıcı yetkileri kaydedilemedi:', error)
    showAlert('Kullanıcı yetkileri kaydedilemedi', 'error')
  } finally {
    saving.value = false
  }
}

function leadKey(lt) {
  return typeof lt === 'object' ? (lt.name || '') : lt
}

function leadLabel(lt) {
  return typeof lt === 'object' ? (lt.name || '') : lt
}

function leadIcon(lt) {
  const icon = typeof lt === 'object' ? (lt.icon || '') : ''
  if (icon && icon.includes(':')) return icon
  if (icon) return `mdi:${icon}`
  return 'mdi:file'
}

function toggleAllForUserType(userTypeId, value) {
  leadTypes.value.forEach(lt => {
    if (!userTypePermissions.value[userTypeId]) {
      userTypePermissions.value[userTypeId] = {}
    }
    userTypePermissions.value[userTypeId][leadKey(lt)] = value
  })
}

function getPermissionCount(userTypeId) {
  if (!userTypePermissions.value[userTypeId]) return 0
  return Object.values(userTypePermissions.value[userTypeId]).filter(v => v === true).length
}

function getUserPermissionStatus(leadType) {
  const value = userPermissions.value[leadType]
  if (value === null || value === undefined) {
    return 'default' // Kullanıcı tipi varsayılanı
  }
  return value ? 'allowed' : 'denied'
}

function setUserPermission(leadType, status) {
  if (status === 'default') {
    userPermissions.value[leadType] = null
  } else if (status === 'allowed') {
    userPermissions.value[leadType] = true
  } else {
    userPermissions.value[leadType] = false
  }
}

function onUserSelect(event) {
  const userId = event.target.value
  if (userId) {
    loadUserPermissions(userId)
  } else {
    selectedUser.value = null
    userPermissions.value = {}
  }
}

const filteredUsers = computed(() => {
  return users.value.filter(u => u.userTypeId !== 'SUPERADMIN')
})

onMounted(async () => {
  await loadUserTypePermissions()
  await loadUsers()
})
</script>

<template>
  <section>
    <div class="page-content">
      <div class="page-header">
        <div class="section-header">
          <h1>Lead Tipi Yetkilendirmeleri</h1>
          <p class="page-subtitle">Kullanıcı ve kullanıcı tipi bazında lead tipi görünürlüğünü ayarlayın</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-container">
        <div class="tabs-nav">
          <button 
            class="tab-button" 
            :class="{ active: activeTab === 'userTypes' }"
            @click="activeTab = 'userTypes'"
          >
            <Icon icon="mdi:account-group" width="20" height="20" />
            Kullanıcı Tipi Bazlı
          </button>
          <button 
            class="tab-button" 
            :class="{ active: activeTab === 'users' }"
            @click="activeTab = 'users'"
          >
            <Icon icon="mdi:account" width="20" height="20" />
            Kullanıcı Bazlı
          </button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Kullanıcı Tipi Bazlı Yetkilendirmeler -->
        <div v-if="activeTab === 'userTypes'" class="tab-panel">
        <div class="info-box">
          <Icon icon="mdi:information" width="20" height="20" />
          <div>
            <strong>Varsayılan Davranış:</strong> Tüm lead tipleri tüm kullanıcı tiplerine açıktır.
            <br>
            Sadece erişimi kısıtlamak istediğiniz lead tiplerini kapatın.
          </div>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Yükleniyor...</p>
        </div>

        <div v-else-if="leadTypes.length === 0" class="empty-state">
          <Icon icon="mdi:file-document-outline" width="48" height="48" />
          <h3>Henüz lead tipi tanımlanmamış</h3>
          <p>Ayarlar bölümünden lead tipleri (sigorta türleri) ekleyin</p>
        </div>

        <div v-else class="permissions-grid">
          <div 
            v-for="userType in userTypes" 
            :key="userType.id"
            class="permission-card"
          >
            <div class="card-header">
              <div class="user-type-info">
                <h3>{{ userType.name }}</h3>
                <p v-if="userType.description">{{ userType.description }}</p>
                <span class="permission-count">
                  {{ getPermissionCount(userType.id) }} / {{ leadTypes.length }} erişilebilir
                </span>
              </div>
              <div class="quick-actions">
                <button 
                  class="btn-quick" 
                  @click="toggleAllForUserType(userType.id, true)"
                  title="Tümünü aç"
                >
                  <Icon icon="mdi:check" width="16" height="16" />
                </button>
                <button 
                  class="btn-quick" 
                  @click="toggleAllForUserType(userType.id, false)"
                  title="Tümünü kapat"
                >
                  <Icon icon="mdi:close" width="16" height="16" />
                </button>
              </div>
            </div>
            
            <div class="lead-types-list">
              <div 
                v-for="lt in leadTypes" 
                :key="leadKey(lt)"
                class="lead-type-item"
              >
                <label class="checkbox-label">
                  <input 
                    type="checkbox"
                    v-model="userTypePermissions[userType.id][leadKey(lt)]"
                    class="checkbox-input"
                  />
                  <span class="checkbox-custom"></span>
                  <span class="lead-type-name with-icon">
                    <Icon :icon="leadIcon(lt)" width="16" height="16" />
                    {{ leadLabel(lt) }}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!loading && leadTypes.length > 0" class="actions">
          <button 
            class="btn btn-primary btn-large" 
            @click="saveUserTypePermissions"
            :disabled="saving"
          >
            <Icon v-if="!saving" icon="mdi:content-save" width="20" height="20" />
            <div v-else class="spinner-small"></div>
            {{ saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet' }}
          </button>
        </div>
      </div>

        <!-- Kullanıcı Bazlı Yetkilendirmeler -->
        <div v-if="activeTab === 'users'" class="tab-panel">
        <div class="info-box">
          <Icon icon="mdi:information" width="20" height="20" />
          <div>
            <strong>Kullanıcı Özel İzinler:</strong> Bu izinler, kullanıcı tipi izinlerini geçersiz kılar.
            <br>
            Varsayılan kullan seçeneği, kullanıcı tipinin iznini kullanır.
          </div>
        </div>

        <div class="user-select-section">
          <label for="userSelect">Kullanıcı Seçin:</label>
          <select 
            id="userSelect"
            @change="onUserSelect"
            class="user-select"
          >
            <option value="">Kullanıcı Seçin</option>
            <option 
              v-for="user in filteredUsers" 
              :key="user.id"
              :value="user.id"
            >
              {{ user.email }} ({{ user.userType?.name || user.userTypeId }})
            </option>
          </select>
        </div>

        <div v-if="loadingUserPermissions" class="loading-state">
          <div class="spinner"></div>
          <p>Yükleniyor...</p>
        </div>

        <div v-else-if="selectedUser" class="user-permissions-section">
          <div class="selected-user-info">
            <h3>{{ selectedUser.email }}</h3>
            <span class="user-type-badge">{{ selectedUser.userType?.name || selectedUser.userTypeId }}</span>
          </div>

          <div class="permissions-list">
            <div 
              v-for="lt in leadTypes" 
              :key="leadKey(lt)"
              class="permission-item"
            >
              <span class="lead-type-label">
                <Icon :icon="leadIcon(lt)" width="18" height="18" style="margin-right:6px;" />
                {{ leadLabel(lt) }}
              </span>
              <div class="permission-options">
                <label class="radio-label">
                  <input 
                    type="radio"
                    :name="`perm-${leadKey(lt)}`"
                    :checked="getUserPermissionStatus(leadKey(lt)) === 'default'"
                    @change="setUserPermission(leadKey(lt), 'default')"
                    class="radio-input"
                  />
                  <span class="radio-custom"></span>
                  <span>Varsayılan Kullan</span>
                </label>
                <label class="radio-label">
                  <input 
                    type="radio"
                    :name="`perm-${leadKey(lt)}`"
                    :checked="getUserPermissionStatus(leadKey(lt)) === 'allowed'"
                    @change="setUserPermission(leadKey(lt), 'allowed')"
                    class="radio-input"
                  />
                  <span class="radio-custom"></span>
                  <span>İzin Ver</span>
                </label>
                <label class="radio-label">
                  <input 
                    type="radio"
                    :name="`perm-${leadKey(lt)}`"
                    :checked="getUserPermissionStatus(leadKey(lt)) === 'denied'"
                    @change="setUserPermission(leadKey(lt), 'denied')"
                    class="radio-input"
                  />
                  <span class="radio-custom"></span>
                  <span>Reddet</span>
                </label>
              </div>
            </div>
          </div>

          <div class="actions">
            <button 
              class="btn btn-primary btn-large" 
              @click="saveUserPermissions"
              :disabled="saving"
            >
              <Icon v-if="!saving" icon="mdi:content-save" width="20" height="20" />
              <div v-else class="spinner-small"></div>
              {{ saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet' }}
            </button>
          </div>
        </div>

        <div v-else class="empty-state">
          <Icon icon="mdi:account" width="48" height="48" />
          <h3>Kullanıcı seçilmedi</h3>
          <p>Yukarıdan bir kullanıcı seçerek başlayın</p>
        </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lead-type-name.with-icon{
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-content {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 2rem;
  overflow-x: hidden;
}

.page-header {
  margin-bottom: 2rem;
}

.header-content h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: #64748b;
  font-size: 1rem;
  margin: 0;
}

/* Tabs */
.tabs-container {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
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
}

.tab-button:hover {
  color: #475569;
  background: #f1f5f9;
}

.tab-button.active {
  color: var(--text);
  border-bottom-color: var(--text);
  background: white;
}

.tab-content {
  padding: 0rem!important;

}

/* Info Box */
.info-box {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  margin-bottom: 2rem;
  color: #1e40af;
}

.info-box svg {
  flex-shrink: 0;
  margin-top: 2px;
}

/* Loading & Empty States */
.loading-state {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: var(--text);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.empty-state svg {
  color: #cbd5e1;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  color: #334155;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: #64748b;
  margin: 0;
}

/* Permissions Grid */
.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.permission-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  padding: 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.user-type-info h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.user-type-info p {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 0.5rem 0;
}

.permission-count {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #dbeafe;
  color: #1e40af;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 12px;
}

.quick-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-quick {
  padding: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-quick:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.lead-types-list {
  padding: 1rem;
}

.lead-type-item {
  padding: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}

.lead-type-item:last-child {
  border-bottom: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  transition: all 0.2s ease;
  position: relative;
  flex-shrink: 0;
}

.checkbox-input:checked + .checkbox-custom {
  background: var(--text);
  border-color: var(--text);
}

.checkbox-input:checked + .checkbox-custom::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.lead-type-name {
  font-size: 0.9375rem;
  color: #334155;
  font-weight: 500;
}

/* User Select Section */
.user-select-section {
  margin-bottom: 2rem;
}

.user-select-section label {
  display: block;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.5rem;
}

.user-select {
  width: 100%;
  max-width: 500px;
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 1rem;
  color: #1e293b;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-select:focus {
  outline: none;
  border-color: var(--text);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* User Permissions Section */
.user-permissions-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
}

.selected-user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.selected-user-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.user-type-badge {
  padding: 0.25rem 0.75rem;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 12px;
}

.permissions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.permission-item {
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.lead-type-label {
  display: block;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.75rem;
}

.permission-options {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.radio-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.radio-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
  transition: all 0.2s ease;
  position: relative;
  flex-shrink: 0;
}

.radio-input:checked + .radio-custom {
  border-color: var(--text);
}

.radio-input:checked + .radio-custom::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: var(--text);
  border-radius: 50%;
}

.radio-label span:last-child {
  font-size: 0.9375rem;
  color: #334155;
}

/* Actions */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--text);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.0625rem;
}

/* Responsive */
@media (max-width: 768px) {
  .page-content {
    padding: var(--page-padding-mobile);
    padding-bottom: calc(var(--page-padding-mobile) + 2rem);
    max-width: 100%;
  }

  .permissions-grid {
    grid-template-columns: 1fr;
    margin-bottom: 1.5rem;
  }

  .tabs-nav {
    flex-direction: row;
    gap: 0;
  }

  .tab-button {
    border-bottom: 1px solid #e2e8f0;
    border-left: 2px solid transparent;
    justify-content: flex-start;
    padding: 0.75rem 1rem;
  }

  .tab-button.active {
    border-bottom-color: #e2e8f0;
    border-left-color: var(--text);
  }

  .tab-content {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .permission-options {
    flex-direction: column;
    gap: 0.75rem;
  }

  .actions {
    margin-top: 1.5rem;
    margin-bottom: 1rem;
  }

  .info-box {
    margin-bottom: 1.5rem;
  }

  .user-select-section {
    margin-bottom: 1.5rem;
  }

  .permissions-list {
    margin-bottom: 1.5rem;
  }
}
</style>

