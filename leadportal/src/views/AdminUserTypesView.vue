<template>
  <div class="user-types-page">
    <div class="page-content">
      <div class="page-header">
        <div class="header-content">
          <h1>Kullanıcı Tipleri</h1>
          <p class="page-subtitle">Kullanıcı tiplerini yönetin ve yetkilendirmeleri ayarlayın</p>
        </div>
        <div class="page-header-actions" v-if="activeTab === 'types'">
          <button class="btn btn-secondary" @click="showAddTypeModal = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Yeni Tip Ekle
          </button>
        </div>
      </div>

      <!-- Message -->
      <div v-if="message" :class="['message', messageType]">
        {{ message }}
      </div>

      <div class="tabs-container">
        <!-- Tab Navigation -->
        <div class="tabs-nav">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            :class="['tab-button', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path v-if="tab.id === 'types'" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <path v-if="tab.id === 'types'" d="M9 7a4 4 0 1 1 0 8 4 4 0 0 1 0-8"/>
              <path v-if="tab.id === 'types'" d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path v-if="tab.id === 'types'" d="M16 3.13a4 4 0 0 1 0 7.75"/>
              <path v-if="tab.id === 'permissions'" d="M9 12l2 2 4-4"/>
              <path v-if="tab.id === 'permissions'" d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.5 0 2.91.37 4.15 1.02"/>
            </svg>
            {{ tab.name }}
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Kullanıcı Tipleri Tab -->
          <div v-if="activeTab === 'types'" class="tab-panel">
            <div class="section-header">
              <h2>Kullanıcı Tipleri</h2>
            
            </div>

            <div class="user-types-grid">
              <div 
                v-for="userType in userTypes" 
                :key="userType.id" 
                class="user-type-card"
              >
                <div class="card-header">
                  <div class="user-type-info">
                    <h3>{{ userType.name }}</h3>
                    <p class="user-type-id">ID: {{ userType.id }}</p>
                  </div>
                  <button 
                    class="edit-btn"
                    @click="editUserType(userType)"
                    title="Düzenle"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
                
                <div class="card-stats">
                  <div class="stat">
                    <span class="stat-label">Kullanıcılar</span>
                    <span class="stat-value">{{ getUserCount(userType.id) }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Yetkiler</span>
                    <span class="stat-value">{{ getPermissionCount(userType.id) }}</span>
                  </div>
                </div>

                <div v-if="userType.description" class="card-description">
                  {{ userType.description }}
                </div>
              </div>
            </div>
          </div>

          <!-- Yetkilendirmeler Tab -->
          <div v-if="activeTab === 'permissions'" class="tab-panel">
            <div class="section-header">
              <h2>Sayfa Yetkilendirmeleri</h2>
            </div>

            <div class="permissions-container">
              <div 
                v-for="userType in userTypes" 
                :key="userType.id" 
                class="permission-group"
              >
                <div class="group-header" @click="toggleUserType(userType.id)">
                  <div class="group-title">
                    <button class="accordion-toggle">
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        stroke-width="2"
                        :class="{ 'rotated': isUserTypeExpanded(userType.id) }"
                      >
                        <polyline points="6,9 12,15 18,9"/>
                      </svg>
                    </button>
                    <h3>{{ userType.name }}</h3>
                    <span class="permission-count">{{ getPermissionCount(userType.id) }} yetki</span>
                  </div>
                  <div class="group-actions" @click.stop>
                    <button class="btn btn-outline btn-sm" @click="selectAllPermissionsForType(userType.id)">
                      Tümünü Seç
                    </button>
                    <button class="btn btn-outline btn-sm" @click="clearAllPermissionsForType(userType.id)">
                      Tümünü Temizle
                    </button>
                    <button 
                      class="btn btn-secondary btn-sm" 
                      @click="toggleAdminPermissions(userType.id)"
                      :title="hasAdminPermissions(userType.id) ? 'Admin izinlerini kapat' : 'Admin izinlerini aç'"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      {{ hasAdminPermissions(userType.id) ? 'Admin Kapat' : 'Admin Aç' }}
                    </button>
                    <button 
                      class="btn btn-primary btn-sm" 
                      @click="savePermissionsForType(userType.id)"
                      :disabled="saving"
                    >
                      <svg v-if="saving" class="spinner" width="14" height="14" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" fill="none">
                          <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 12 12;360 12 12" repeatCount="indefinite"/>
                        </path>
                      </svg>
                      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17,21 17,13 7,13 7,21"/>
                        <polyline points="7,3 7,8 15,8"/>
                      </svg>
                      {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
                    </button>
                  </div>
                </div>
                
                <div 
                  class="permission-list" 
                  :class="{ 'expanded': isUserTypeExpanded(userType.id) }"
                >
                  <div 
                    v-for="page in pages" 
                    :key="page.id" 
                    class="permission-item"
                  >
                    <div class="permission-info">
                      <span class="page-name">{{ page.name }}</span>
                      <span class="page-path">{{ page.id }}</span>
                    </div>
                    <label class="toggle-switch">
                      <input 
                        type="checkbox" 
                        :checked="getPermission(userType.id, page.id)"
                        @change="updatePermission(userType.id, page.id, $event.target.checked)"
                      >
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add User Type Modal -->
    <div v-if="showAddTypeModal" class="modal-overlay" @click="showAddTypeModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Yeni Kullanıcı Tipi Ekle</h3>
          <button class="modal-close" @click="showAddTypeModal = false">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <!-- Modal Message -->
          <div v-if="modalMessage" :class="['modal-message', modalMessageType]">
            {{ modalMessage }}
          </div>
          <div class="form-group">
            <label for="newTypeId">ID *</label>
            <input 
              id="newTypeId"
              v-model="newUserType.id" 
              type="text" 
              placeholder="Örn: PREMIUM"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label for="newTypeName">İsim *</label>
            <input 
              id="newTypeName"
              v-model="newUserType.name" 
              type="text" 
              placeholder="Örn: Premium Kullanıcı"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label for="newTypeDescription">Açıklama</label>
            <textarea 
              id="newTypeDescription"
              v-model="newUserType.description" 
              placeholder="Kullanıcı tipi açıklaması"
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showAddTypeModal = false">İptal</button>
          <button class="btn btn-primary" @click="addUserType">Ekle</button>
        </div>
      </div>
    </div>

    <!-- Edit User Type Modal -->
    <div v-if="showEditTypeModal" class="modal-overlay" @click="showEditTypeModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Kullanıcı Tipini Düzenle</h3>
          <button class="modal-close" @click="showEditTypeModal = false">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <!-- Modal Message -->
          <div v-if="modalMessage" :class="['modal-message', modalMessageType]">
            {{ modalMessage }}
          </div>
          <div class="form-group">
            <label>ID</label>
            <input 
              v-model="editingUserType.id" 
              type="text" 
              class="form-input"
              disabled
            >
          </div>
          <div class="form-group">
            <label for="editTypeName">İsim *</label>
            <input 
              id="editTypeName"
              v-model="editingUserType.name" 
              type="text" 
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label for="editTypeDescription">Açıklama</label>
            <textarea 
              id="editTypeDescription"
              v-model="editingUserType.description" 
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                v-model="editingUserType.isActive" 
                type="checkbox"
                class="form-checkbox"
              >
              Aktif
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showEditTypeModal = false">İptal</button>
          <button class="btn btn-danger" @click="showDeleteConfirmation(editingUserType)">Sil</button>
          <button class="btn btn-primary" @click="updateUserType">Güncelle</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirmModal" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content delete-modal" @click.stop>
        <div class="modal-header">
          <h3>Kullanıcı Tipini Sil</h3>
          <button class="modal-close" @click="cancelDelete">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="delete-warning">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="warning-icon">
              <path d="M12 9v4"/>
              <path d="M12 17h.01"/>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>
            <h4>Bu işlem geri alınamaz!</h4>
            <p>
              <strong>{{ userTypeToDelete?.name }}</strong> kullanıcı tipini silmek istediğinizden emin misiniz?
            </p>
            <p class="warning-text">
              Bu kullanıcı tipine ait tüm yetkilendirmeler de silinecektir.
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="cancelDelete">İptal</button>
          <button class="btn btn-danger" @click="deleteUserType">Sil</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/axios.js'

const router = useRouter()

// Reactive data
const userTypes = ref([])
const pages = ref([])
const permissions = ref({})
const users = ref([])
const saving = ref(false)
const message = ref('')
const messageType = ref('')
const activeTab = ref('types')
const showAddTypeModal = ref(false)
const showEditTypeModal = ref(false)
const editingUserType = ref({})
const newUserType = ref({
  id: '',
  name: '',
  description: ''
})
const showDeleteConfirmModal = ref(false)
const userTypeToDelete = ref(null)
const modalMessage = ref('')
const modalMessageType = ref('')
const expandedUserTypes = ref({})

// Tabs configuration
const tabs = [
  { id: 'types', name: 'Kullanıcı Tipleri' },
  { id: 'permissions', name: 'Yetkilendirmeler' }
]

// Auth headers
const authHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

// Load data
const loadData = async () => {
  try {
    // Load user types, pages, users, and permissions
    const [userTypesResponse, pagesResponse, usersResponse, permissionsResponse] = await Promise.all([
      api.get('/user-types', { headers: authHeaders() }),
      api.get('/pages', { headers: authHeaders() }),
      api.get('/users', { headers: authHeaders() }),
      api.get('/user-types/permissions', { headers: authHeaders() })
    ])
    
    userTypes.value = userTypesResponse.data || []
    pages.value = pagesResponse.data || []
    users.value = usersResponse.data || []
    permissions.value = permissionsResponse.data || {}
  } catch (error) {
    console.error('Error loading data:', error)
    showMessage('Veriler yüklenirken hata oluştu', 'error')
  }
}

// Not: Senkronizasyon işlevi kaldırıldı; sayfalar backend'de statik tutuluyor.

// Get user count for a user type
const getUserCount = (userTypeId) => {
  return users.value.filter(user => user.userTypeId === userTypeId).length
}

// Get permission for a user type and page
const getPermission = (userTypeId, pageId) => {
  return permissions.value[userTypeId]?.[pageId] || false
}

// Update permission
const updatePermission = (userTypeId, pageId, hasAccess) => {
  if (!permissions.value[userTypeId]) {
    permissions.value[userTypeId] = {}
  }
  permissions.value[userTypeId][pageId] = hasAccess
}

// Get permission count for a user type
const getPermissionCount = (userTypeId) => {
  const userPermissions = permissions.value[userTypeId] || {}
  return Object.values(userPermissions).filter(Boolean).length
}

// Select all permissions for all user types
const selectAllPermissions = () => {
  userTypes.value.forEach(userType => {
    pages.value.forEach(page => {
      updatePermission(userType.id, page.id, true)
    })
  })
}

// Clear all permissions for all user types
const clearAllPermissions = () => {
  userTypes.value.forEach(userType => {
    pages.value.forEach(page => {
      updatePermission(userType.id, page.id, false)
    })
  })
}

// Select all permissions for a specific user type
const selectAllPermissionsForType = (userTypeId) => {
  pages.value.forEach(page => {
    updatePermission(userTypeId, page.id, true)
  })
}

// Clear all permissions for a specific user type
const clearAllPermissionsForType = (userTypeId) => {
  pages.value.forEach(page => {
    updatePermission(userTypeId, page.id, false)
  })
}

// Save permissions for a specific user type
const savePermissionsForType = async (userTypeId) => {
  saving.value = true
  try {
    const userTypePermissions = {}
    userTypePermissions[userTypeId] = permissions.value[userTypeId] || {}
    
    await api.post('/user-types/permissions', 
      { permissions: userTypePermissions },
      { headers: authHeaders() }
    )
    showMessage(`${userTypes.value.find(ut => ut.id === userTypeId)?.name} yetkilendirmeleri başarıyla kaydedildi`, 'success')
  } catch (error) {
    console.error('Error saving permissions:', error)
    showMessage('Yetkilendirmeler kaydedilirken hata oluştu', 'error')
  } finally {
    saving.value = false
  }
}

// Edit user type
const editUserType = (userType) => {
  editingUserType.value = { ...userType }
  showEditTypeModal.value = true
}

// Save permissions
const savePermissions = async () => {
  saving.value = true
  try {
    await api.post('/user-types/permissions', 
      { permissions: permissions.value },
      { headers: authHeaders() }
    )
    showMessage('Yetkilendirmeler başarıyla kaydedildi', 'success')
  } catch (error) {
    console.error('Error saving permissions:', error)
    showMessage('Yetkilendirmeler kaydedilirken hata oluştu', 'error')
  } finally {
    saving.value = false
  }
}

// Add new user type
const addUserType = async () => {
  try {
    if (!newUserType.value.id || !newUserType.value.name) {
      showModalMessage('ID ve isim alanları zorunludur', 'error')
      return
    }

    await api.post('/user-types', newUserType.value, { headers: authHeaders() })
    
    showModalMessage('Kullanıcı tipi başarıyla eklendi', 'success')
    setTimeout(() => {
      showAddTypeModal.value = false
      newUserType.value = { id: '', name: '', description: '' }
      loadData()
    }, 1500)
  } catch (error) {
    console.error('Error adding user type:', error)
    showModalMessage(error.response?.data?.message || 'Kullanıcı tipi eklenirken hata oluştu', 'error')
  }
}

// Update user type
const updateUserType = async () => {
  try {
    if (!editingUserType.value.name) {
      showModalMessage('İsim alanı zorunludur', 'error')
      return
    }

    await api.put(`/user-types/${editingUserType.value.id}`, {
      name: editingUserType.value.name,
      description: editingUserType.value.description,
      isActive: editingUserType.value.isActive
    }, { headers: authHeaders() })
    
    showModalMessage('Kullanıcı tipi başarıyla güncellendi', 'success')
    setTimeout(() => {
      showEditTypeModal.value = false
      editingUserType.value = {}
      loadData()
    }, 1500)
  } catch (error) {
    console.error('Error updating user type:', error)
    showModalMessage(error.response?.data?.message || 'Kullanıcı tipi güncellenirken hata oluştu', 'error')
  }
}

// Show delete confirmation modal
const showDeleteConfirmation = (userType) => {
  userTypeToDelete.value = userType
  showDeleteConfirmModal.value = true
}

// Delete user type
const deleteUserType = async () => {
  if (!userTypeToDelete.value) return

  try {
    await api.delete(`/user-types/${userTypeToDelete.value.id}`, { headers: authHeaders() })
    showMessage('Kullanıcı tipi başarıyla silindi', 'success')
    showEditTypeModal.value = false
    showDeleteConfirmModal.value = false
    editingUserType.value = {}
    userTypeToDelete.value = null
    loadData()
  } catch (error) {
    console.error('Error deleting user type:', error)
    showMessage(error.response?.data?.message || 'Kullanıcı tipi silinirken hata oluştu', 'error')
  }
}

// Cancel delete
const cancelDelete = () => {
  showDeleteConfirmModal.value = false
  userTypeToDelete.value = null
}

// Show message
const showMessage = (msg, type) => {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    message.value = ''
    messageType.value = ''
  }, 3000)
}

// Show modal message
const showModalMessage = (msg, type) => {
  modalMessage.value = msg
  modalMessageType.value = type
  setTimeout(() => {
    modalMessage.value = ''
    modalMessageType.value = ''
  }, 3000)
}

// Toggle user type accordion
const toggleUserType = (userTypeId) => {
  expandedUserTypes.value[userTypeId] = !expandedUserTypes.value[userTypeId]
}

// Check if user type is expanded
const isUserTypeExpanded = (userTypeId) => {
  return expandedUserTypes.value[userTypeId] || false
}

// Check if user type has admin permissions
const hasAdminPermissions = (userTypeId) => {
  const userPermissions = permissions.value[userTypeId] || {}
  const adminPages = pages.value.filter(page => page.id.startsWith('/admin'))
  return adminPages.some(page => userPermissions[page.id])
}

// Toggle admin permissions for a user type
const toggleAdminPermissions = (userTypeId) => {
  const adminPages = pages.value.filter(page => page.id.startsWith('/admin'))
  const hasAdmin = hasAdminPermissions(userTypeId)
  
  adminPages.forEach(page => {
    updatePermission(userTypeId, page.id, !hasAdmin)
  })
}

// Initialize
onMounted(() => {
  loadData()
  // Auto-sync pages on first load (commented out to prevent errors)
  // syncPages()
})
</script>

<style scoped>
.user-types-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 2rem;
  overflow-x: hidden;
}

.page-content {
  max-width: 80%;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

.message {
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  font-weight: 500;
}

.message.success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.message.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.tabs-container {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
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
  padding: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
}

.btn-primary {
  background: var(--text);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #3b82f6;
  color: white;
}

.btn-secondary:hover {
  background: #2563eb;
}

.btn-outline {
  background: white;
  color: var(--primary);
  border: 1px solid #d1d5db;
}

.btn-outline:hover {
  background: #f9fafb;
  color: #374151;
}

.user-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.user-type-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s;
}

.user-type-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.user-type-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.user-type-id {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

.edit-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: #f1f5f9;
  color: #475569;
}

.card-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.card-description {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.5;
}

.permissions-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.permission-group {
  background: #f8fafc;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
  padding: 1rem;
  border-radius: 0.5rem;
}

.group-header:hover {
  background: #f1f5f9;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.accordion-toggle {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.accordion-toggle:hover {
  background: #e2e8f0;
  color: #475569;
}

.accordion-toggle svg {
  transition: transform 0.2s;
}

.accordion-toggle svg.rotated {
  transform: rotate(180deg);
}

.group-title h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.permission-count {
  background: var(--text);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.permission-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
}

.permission-list.expanded {
  max-height: 2000px;
  transition: max-height 0.3s ease-in;
}

.permission-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.permission-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.page-name {
  font-weight: 500;
  color: #1e293b;
}

.page-path {
  font-size: 0.875rem;
  color: #64748b;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 3rem;
  height: 1.5rem;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.2s;
  border-radius: 1.5rem;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 1.125rem;
  width: 1.125rem;
  left: 0.1875rem;
  bottom: 0.1875rem;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--text);
}

input:checked + .toggle-slider:before {
  transform: translateX(1.5rem);
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 0 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  min-height: 2.5rem;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #475569;
}

.modal-body {
  padding: 0 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
  margin-top: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--text);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input:disabled {
  background: #f9fafb;
  color: var(--primary);
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.form-checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: var(--text);
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

/* Delete Confirmation Modal Styles */
.delete-modal {
  max-width: 400px;
}

.delete-warning {
  text-align: center;
  padding: 1rem 0;
}

.warning-icon {
  color: #f59e0b;
  margin-bottom: 1rem;
}

.delete-warning h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.delete-warning p {
  color: #64748b;
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

.warning-text {
  font-size: 0.875rem;
  color: #dc2626;
  font-weight: 500;
}

/* Modal Message Styles */
.modal-message {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.modal-message.success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.modal-message.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

@media (max-width: 768px) {
  .user-types-page {
    padding: 1rem;
  }
  
  .section-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .header-actions {
    flex-wrap: wrap;
  }
  
  .user-types-grid {
    grid-template-columns: 1fr;
  }
  
  .permission-item {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
  
  .permission-info {
    text-align: center;
  }
}
</style>