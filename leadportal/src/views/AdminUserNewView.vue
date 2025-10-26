<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useAlert } from '../composables/useAlert'

const { success, error } = useAlert()

const email = ref('')
const password = ref('')
const firstName = ref('')
const lastName = ref('')
const username = ref('')
const modalUserTypeId = ref('')
const ok = ref('')
const err = ref('')
const users = ref([])
const userTypes = ref([])
const query = ref('')
const filterUserType = ref('')
const sortKey = ref('lastActivity')
const sortDir = ref('desc')

function setSortKey(key) {
  if (sortKey.value === key) {
    // Aynı kolona tıklanırsa direction'ı değiştir
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    // Farklı kolona tıklanırsa o kolonu seç ve asc yap
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

// Online kullanıcı sayısı
const onlineCount = computed(() => users.value.filter(u => u.isOnline).length)

const filteredUsers = computed(() => {
  let list = users.value.slice()
  
  // Deaktif kullanıcıları filtrele (sadece aktif kullanıcıları göster)
  list = list.filter(u => u.isActive !== false)
  
  if (query.value) {
    const q = query.value.toLowerCase()
    list = list.filter(u =>
      u.email.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    )
  }
  if (filterUserType.value) list = list.filter(u => u.userType?.id === filterUserType.value)
  list.sort((a,b) => {
    const dir = sortDir.value === 'asc' ? 1 : -1

    if (sortKey.value === 'status') {
      // Online önce gelsin (true > false, 1 > 0)
      const aOnline = a.isOnline ? 1 : 0
      const bOnline = b.isOnline ? 1 : 0
      return (bOnline - aOnline) * dir
    }

    if (sortKey.value === 'email') {
      return a.email.localeCompare(b.email) * dir
    }

    if (sortKey.value === 'name') {
      const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email
      const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email
      return aName.localeCompare(bName) * dir
    }

    if (sortKey.value === 'username') {
      const aUsername = a.username || ''
      const bUsername = b.username || ''
      return aUsername.localeCompare(bUsername) * dir
    }

    if (sortKey.value === 'userType') {
      const aType = a.userType?.name || ''
      const bType = b.userType?.name || ''
      return aType.localeCompare(bType) * dir
    }

    if (sortKey.value === 'lastActivity') {
      const aDate = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
      const bDate = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
      return (aDate - bDate) * dir
    }

    // createdAt (default)
    return (new Date(a.createdAt) - new Date(b.createdAt)) * dir
  })
  return list
})

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

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function submitModal() {
  ok.value = ''
  err.value = ''
  
  // Frontend validation
  if (!email.value.trim()) {
    error('Email adresi gerekli')
    return
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    error('Geçerli bir email adresi giriniz')
    return
  }
  
  if (modalMode.value === 'create' && !password.value.trim()) {
    error('Şifre gerekli')
    return
  }
  
  if (modalMode.value === 'create' && password.value.length < 6) {
    error('Şifre en az 6 karakter olmalıdır')
    return
  }
  
  if (password.value && !modalPassValid.value.ok) {
    error('Şifre kurallara uygun değil')
    return
  }
  
  if (!modalUserTypeId.value) {
    error('Kullanıcı tipi seçilmelidir')
    return
  }
  
  try {
    const userData = { 
      email: email.value,
      firstName: firstName.value || null,
      lastName: lastName.value || null,
      username: username.value || null,
      userTypeId: modalUserTypeId.value
    }
    
    if (modalMode.value === 'create') {
      userData.password = password.value
      await axios.post('/api/users', userData, { headers: authHeaders() })
      success('Kullanıcı başarıyla oluşturuldu')
    } else {
      // Edit mode
      if (password.value) {
        await axios.put(`/api/users/${editUserId.value}/password`, { password: password.value }, { headers: authHeaders() })
      }
      await axios.put(`/api/users/${editUserId.value}`, userData, { headers: authHeaders() })
      success('Kullanıcı başarıyla güncellendi')
    }
    
    closeModal()
    loadUsers()
  } catch (e) {
    const status = e?.response?.status
    const serverError = e?.response?.data?.error
    
    if (serverError) {
      error(serverError)
    } else if (status === 409) {
      error('Bu email adresi zaten kullanılıyor')
    } else if (status === 403) {
      error('Bu işlem için yetkiniz yok')
    } else if (status === 400) {
      error('Girilen bilgilerde hata var')
    } else if (status === 404) {
      error('Kullanıcı bulunamadı')
    } else if (status === 500) {
      error('Sunucu hatası oluştu')
    } else if (status === 0 || !status) {
      error('Sunucuya bağlanılamıyor')
    } else {
      error('Beklenmeyen bir hata oluştu')
    }
  }
}

function openNewUser() {
  modalMode.value = 'create'
  showModal.value = true
  email.value = ''
  password.value = ''
  firstName.value = ''
  lastName.value = ''
  username.value = ''
  modalUserTypeId.value = ''
  editUserId.value = null
  ok.value = ''
  err.value = ''
  query.value = ''
  filterUserType.value = ''
}

function openEditUser(user) {
  modalMode.value = 'edit'
  showModal.value = true
  editUserId.value = user.id
  email.value = user.email
  firstName.value = user.firstName || ''
  lastName.value = user.lastName || ''
  username.value = user.username || ''
  modalUserTypeId.value = user.userType?.id || ''
  password.value = ''
  ok.value = ''
  err.value = ''
}

function closeModal() {
  showModal.value = false
  email.value = ''
  password.value = ''
  firstName.value = ''
  lastName.value = ''
  username.value = ''
  modalUserTypeId.value = ''
  editUserId.value = null
  ok.value = ''
  err.value = ''
}

async function loadUsers() {
  try {
    const { data } = await axios.get('/api/users', { headers: authHeaders() })
    users.value = data
  } catch (e) {
    // ignore
  }
}

async function loadUserTypes() {
  try {
    const { data } = await axios.get('/api/user-types', { headers: authHeaders() })
    userTypes.value = data
  } catch (e) {
    // ignore
  }
}

const showReset = ref(false)
const resetUserId = ref(null)
const resetPass = ref('')
const showModal = ref(false)
const modalMode = ref('create') // 'create' or 'edit'
const editUserId = ref(null)
const showDeleteConfirm = ref(false)
const deleteUserId = ref(null)
const deleteUserName = ref('')
const passValid = computed(() => {
  const p = resetPass.value
  const long = p.length >= 8
  const hasNum = /\d/.test(p)
  const hasUpper = /[A-Z]/.test(p)
  const hasLower = /[a-z]/.test(p)
  return { long, hasNum, hasUpper, hasLower, ok: long && hasNum && hasUpper && hasLower }
})

const modalPassValid = computed(() => {
  const p = password.value
  if (modalMode.value === 'edit' && !p) return { long: true, hasNum: true, hasUpper: true, hasLower: true, ok: true } // Edit modda şifre opsiyonel
  if (!p) return { long: false, hasNum: false, hasUpper: false, hasLower: false, ok: false }
  const long = p.length >= 8
  const hasNum = /\d/.test(p)
  const hasUpper = /[A-Z]/.test(p)
  const hasLower = /[a-z]/.test(p)
  return { long, hasNum, hasUpper, hasLower, ok: long && hasNum && hasUpper && hasLower }
})

function openReset(id) { resetUserId.value = id; resetPass.value=''; showReset.value = true }
function closeReset() { 
  showReset.value = false
  err.value = ''
}
async function confirmReset() {
  err.value = ''

  // Frontend validation
  if (!resetPass.value.trim()) {
    error('Şifre gerekli')
    return
  }

  if (!passValid.value.ok) {
    error('Şifre kurallara uygun değil')
    return
  }

  try {
    await axios.put(`/api/users/${resetUserId.value}/password`, { password: resetPass.value }, { headers: authHeaders() })
    showReset.value = false
    success('Şifre başarıyla sıfırlandı')
  } catch (e) {
    const status = e?.response?.status
    const serverError = e?.response?.data?.error

    if (serverError) {
      error(serverError)
    } else if (status === 403) {
      error('Bu işlem için yetkiniz yok')
    } else if (status === 400) {
      error('Şifre formatı hatalı')
    } else if (status === 404) {
      error('Kullanıcı bulunamadı')
    } else if (status === 500) {
      error('Sunucu hatası oluştu')
    } else if (status === 0 || !status) {
      error('Sunucuya bağlanılamıyor')
    } else {
      error('Şifre sıfırlanamadı')
    }
  }
}

function openDeleteConfirm(user) {
  deleteUserId.value = user.id
  deleteUserName.value = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email
  showDeleteConfirm.value = true
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false
  deleteUserId.value = null
  deleteUserName.value = ''
}

async function adminDisable2FA(userId) {
  if (!confirm('Bu kullanıcının 2FA korumasını devre dışı bırakmak istediğinize emin misiniz?')) {
    return
  }

  try {
    await axios.delete(`/api/2fa/admin/${userId}`, { headers: authHeaders() })
    success('Kullanıcının 2FA\'sı başarıyla devre dışı bırakıldı')
    loadUsers()
    // Modalı kapatıp tekrar aç, güncel veriyi görmek için
    const currentUserId = editUserId.value
    closeModal()
    setTimeout(() => {
      const user = users.value.find(u => u.id === currentUserId)
      if (user) openEditUser(user)
    }, 100)
  } catch (e) {
    const serverError = e?.response?.data?.error
    if (serverError) {
      error(serverError)
    } else {
      error('2FA devre dışı bırakılırken hata oluştu')
    }
  }
}

async function confirmDelete() {
  try {
    await axios.put(`/api/users/${deleteUserId.value}/deactivate`, {}, { headers: authHeaders() })
    success('Kullanıcı başarıyla silindi')
    closeDeleteConfirm()
    closeModal()
    loadUsers()
  } catch (e) {
    const status = e?.response?.status
    const serverError = e?.response?.data?.error

    if (serverError) {
      error(serverError)
    } else if (status === 403) {
      error('Bu işlem için yetkiniz yok')
    } else if (status === 400) {
      error('Kendinizi silemezsiniz')
    } else if (status === 404) {
      error('Kullanıcı bulunamadı')
    } else if (status === 500) {
      error('Sunucu hatası oluştu')
    } else if (status === 0 || !status) {
      error('Sunucuya bağlanılamıyor')
    } else {
      error('Kullanıcı silinemedi')
    }
  }
}

// Her 30 saniyede bir otomatik yenile (online durumları güncel tutmak için)
let refreshInterval
onMounted(() => {
  loadUsers()
  loadUserTypes()
  refreshInterval = setInterval(loadUsers, 30000)
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
  <div class="admin-user-new-view">
    <div class="page-content">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Kullanıcılar</h1>
          <div class="header-stats">
            <p class="page-subtitle">{{ filteredUsers.length }} kullanıcı</p>
            <div class="online-indicator-badge">
              <span class="online-dot"></span>
              <span>{{ onlineCount }} online</span>
            </div>
          </div>
        </div>
        <button class="btn btn-primary" @click="openNewUser">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Yeni Kullanıcı
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <input
            class="filter-input"
            v-model="query"
            placeholder="Email, ad veya kullanıcı adı ile ara..."
            type="text"
          />
        </div>
        <div class="filter-group">
          <select class="filter-select" v-model="filterUserType">
            <option value="">Tüm Kullanıcı Tipleri</option>
            <option v-for="userType in userTypes" :key="userType.id" :value="userType.id">
              {{ userType.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Users List -->
      <div v-if="!users.length" class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3>Henüz kullanıcı yok</h3>
        <p>İlk kullanıcınızı oluşturmak için "Yeni Kullanıcı" butonuna tıklayın</p>
      </div>
      
      <div v-else class="users-container">
        <!-- Desktop Table View -->
        <div class="users-table desktop-only">
          <div class="table-header">
            <div class="header-cell status-col sortable" @click="setSortKey('status')">
              <span>Durum</span>
              <svg v-if="sortKey === 'status'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'rotate-180': sortDir === 'desc' }">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </div>
            <div class="header-cell sortable" @click="setSortKey('name')">
              <span>Kullanıcı</span>
              <svg v-if="sortKey === 'name'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'rotate-180': sortDir === 'desc' }">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </div>
            <div class="header-cell sortable" @click="setSortKey('email')">
              <span>Email</span>
              <svg v-if="sortKey === 'email'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'rotate-180': sortDir === 'desc' }">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </div>
            <div class="header-cell sortable" @click="setSortKey('username')">
              <span>Kullanıcı Adı</span>
              <svg v-if="sortKey === 'username'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'rotate-180': sortDir === 'desc' }">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </div>
            <div class="header-cell sortable" @click="setSortKey('userType')">
              <span>Tip</span>
              <svg v-if="sortKey === 'userType'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'rotate-180': sortDir === 'desc' }">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </div>
            <div class="header-cell sortable" @click="setSortKey('lastActivity')">
              <span>Son Aktivite</span>
              <svg v-if="sortKey === 'lastActivity'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'rotate-180': sortDir === 'desc' }">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </div>
            <div class="header-cell">2FA</div>
            <div class="header-cell actions">İşlemler</div>
          </div>

          <div class="table-body">
            <div class="table-row" v-for="u in filteredUsers" :key="u.id">
              <div class="table-cell status-col">
                <span
                  class="status-indicator"
                  :class="{ 'online': u.isOnline, 'offline': !u.isOnline }"
                  :title="u.isOnline ? 'Online' : 'Offline'"
                ></span>
              </div>
              <div class="table-cell user-info">
                <div class="user-avatar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div class="user-details">
                  <div class="user-name" v-if="u.firstName || u.lastName">
                    {{ u.firstName }} {{ u.lastName }}
                  </div>
                  <div class="user-name-placeholder" v-else>
                    İsim belirtilmemiş
                  </div>
                </div>
              </div>

              <div class="table-cell">
                <div class="email-cell">{{ u.email }}</div>
              </div>

              <div class="table-cell">
                <div class="username-cell" v-if="u.username">
                  <span class="username-badge">@{{ u.username }}</span>
                </div>
                <div class="username-cell" v-else>
                  <span class="no-username">-</span>
                </div>
              </div>

              <div class="table-cell">
                <span class="user-type-badge" :class="'type-' + (u.userType?.id || 'none')">
                  {{ u.userType?.name || 'Tip Yok' }}
                </span>
              </div>

              <div class="table-cell">
                <div class="activity-cell">
                  <span class="activity-time">{{ formatTimeAgo(u.lastActivity) }}</span>
                </div>
              </div>

              <div class="table-cell">
                <div class="twofa-cell">
                  <span v-if="u.twoFactorEnabled" class="twofa-badge enabled" title="2FA Aktif">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    Aktif
                  </span>
                  <span v-else class="twofa-badge disabled" title="2FA Kapalı">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Kapalı
                  </span>
                </div>
              </div>

              <div class="table-cell actions">
                <div class="action-buttons">
                  <button class="action-btn edit-btn" @click="openEditUser(u)" title="Düzenle">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Card View -->
        <div class="users-cards mobile-only">
          <div class="user-card" v-for="u in filteredUsers" :key="u.id">
            <div class="card-header">
              <div class="card-user-info">
                <div class="user-avatar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div class="card-user-details">
                  <div class="card-user-name" v-if="u.firstName || u.lastName">
                    {{ u.firstName }} {{ u.lastName }}
                  </div>
                  <div class="card-user-name-placeholder" v-else>
                    İsim belirtilmemiş
                  </div>
                  <div class="card-user-email">{{ u.email }}</div>
                </div>
              </div>
              <div class="card-header-actions">
                <span
                  class="status-indicator"
                  :class="{ 'online': u.isOnline, 'offline': !u.isOnline }"
                  :title="u.isOnline ? 'Online' : 'Offline'"
                ></span>
                <button class="card-edit-btn" @click="openEditUser(u)" title="Düzenle">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="card-body">
              <div class="card-info-row" v-if="u.username">
                <span class="card-label">Kullanıcı Adı:</span>
                <span class="username-badge">@{{ u.username }}</span>
              </div>

              <div class="card-info-row">
                <span class="card-label">Tip:</span>
                <span class="user-type-badge" :class="'type-' + (u.userType?.id || 'none')">
                  {{ u.userType?.name || 'Tip Yok' }}
                </span>
              </div>

              <div class="card-info-row">
                <span class="card-label">Son Aktivite:</span>
                <span class="card-value">{{ formatTimeAgo(u.lastActivity) }}</span>
              </div>

              <div class="card-info-row">
                <span class="card-label">2FA:</span>
                <span v-if="u.twoFactorEnabled" class="twofa-badge enabled">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Aktif
                </span>
                <span v-else class="twofa-badge disabled">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Kapalı
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Kullanıcı Modal -->
    <div v-if="showModal" class="modal-backdrop">
      <div class="modal edit-modal">
        <h3>{{ modalMode === 'create' ? 'Kullanıcı Ekle' : 'Kullanıcı Düzenle' }}</h3>
        <div v-if="ok" style="color:#16a34a; margin-top:8px">{{ ok }}</div>
        <div v-if="err" style="color:#ef4444; margin-top:8px">{{ err }}</div>
        <form @submit.prevent="submitModal" style="margin-top:20px">
          <div class="form-container">
            <!-- Ad - Soyad -->
            <div class="form-row">
              <div class="form-group">
                <label>Ad</label>
                <input class="input" v-model="firstName" type="text" autocomplete="given-name" />
              </div>
              <div class="form-group">
                <label>Soyad</label>
                <input class="input" v-model="lastName" type="text" autocomplete="family-name" />
              </div>
            </div>
            
            <!-- Kullanıcı Adı - Email -->
            <div class="form-row">
              <div class="form-group">
                <label>Kullanıcı Adı</label>
                <input class="input" v-model="username" type="text" autocomplete="username" />
              </div>
              <div class="form-group">
                <label>Email *</label>
                <input class="input" v-model="email" type="email" required autocomplete="email" />
              </div>
            </div>
            
            <!-- Kullanıcı Tipi - Şifre -->
            <div class="form-row">
              <div class="form-group">
                <label>Kullanıcı Tipi *</label>
                <select class="input" v-model="modalUserTypeId" required>
                  <option value="">Kullanıcı Tipi Seçin</option>
                  <option v-for="userType in userTypes" :key="userType.id" :value="userType.id">
                    {{ userType.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>
                  {{ modalMode === 'create' ? 'Şifre *' : 'Yeni Şifre' }}
                  <span v-if="modalMode === 'edit'" class="muted">(boş bırakılırsa değişmez)</span>
                </label>
                <input 
                  class="input" 
                  v-model="password" 
                  type="password" 
                  :required="modalMode === 'create'" 
                  autocomplete="new-password" 
                  :placeholder="modalMode === 'edit' ? 'Şifre değiştirmek için doldurun' : ''"
                />
              </div>
            </div>
            
            <!-- Şifre Kuralları -->
            <div v-if="password" class="password-rules">
              <div class="row" style="flex-wrap:wrap; gap:6px; margin-top:8px">
                <span class="badge" :style="{color: modalPassValid.long? '#16a34a':'#ef4444'}">En az 8 karakter</span>
                <span class="badge" :style="{color: modalPassValid.hasNum? '#16a34a':'#ef4444'}">Rakam</span>
                <span class="badge" :style="{color: modalPassValid.hasUpper? '#16a34a':'#ef4444'}">Büyük harf</span>
                <span class="badge" :style="{color: modalPassValid.hasLower? '#16a34a':'#ef4444'}">Küçük harf</span>
              </div>
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeModal">İptal</button>
            <button type="submit" class="btn btn-primary">{{ modalMode === 'create' ? 'Oluştur' : 'Güncelle' }}</button>
          </div>
        </form>

        <!-- Danger Zone - Sadece edit modunda göster -->
        <div v-if="modalMode === 'edit'" class="danger-zone">
          <div class="danger-zone-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <h4>Tehlikeli Bölge</h4>
          </div>

          <!-- 2FA Disable -->
          <div v-if="users.find(u => u.id === editUserId)?.twoFactorEnabled" class="danger-zone-section">
            <p class="danger-zone-description">Kullanıcının 2FA korumasını devre dışı bırakabilirsiniz (cihaz kaybı durumunda).</p>
            <button type="button" class="btn btn-warning" @click="adminDisable2FA(editUserId)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                <line x1="9" y1="16" x2="15" y2="16"/>
              </svg>
              2FA'yı Devre Dışı Bırak
            </button>
          </div>

          <!-- Delete User -->
          <div class="danger-zone-section">
            <p class="danger-zone-description">Bu kullanıcıyı kalıcı olarak silebilirsiniz. Bu işlem geri alınamaz.</p>
            <button type="button" class="btn btn-danger" @click="openDeleteConfirm(users.find(u => u.id === editUserId))">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              Kullanıcıyı Sil
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Kullanıcı Silme Onay Modal -->
    <div v-if="showDeleteConfirm" class="modal-backdrop">
      <div class="modal delete-modal">
        <div class="delete-modal-header">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h3>Kullanıcıyı Sil</h3>
        <p class="delete-warning">
          <strong>{{ deleteUserName }}</strong> kullanıcısını silmek üzeresiniz.
          Bu işlem geri alınamaz ve kullanıcının tüm verileri silinecektir.
        </p>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="closeDeleteConfirm">İptal</button>
          <button type="button" class="btn btn-danger" @click="confirmDelete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            Evet, Sil
          </button>
        </div>
      </div>
    </div>

    <!-- Şifre Sıfırla Modal -->
    <div v-if="showReset" class="modal-backdrop">
      <div class="modal">
        <h3>Şifre Sıfırla</h3>
        <div v-if="err" style="color:#ef4444; margin-top:8px">{{ err }}</div>
        <form @submit.prevent="confirmReset" class="stack" style="margin-top:8px">
          <input class="input" v-model="resetPass" type="password" placeholder="Yeni şifre" required autocomplete="new-password" />
          <div class="muted">Kurallar:</div>
          <div class="row" style="flex-wrap:wrap; gap:6px">
            <span class="badge" :style="{color: passValid.long? '#16a34a':'#ef4444'}">En az 8 karakter</span>
            <span class="badge" :style="{color: passValid.hasNum? '#16a34a':'#ef4444'}">Rakam</span>
            <span class="badge" :style="{color: passValid.hasUpper? '#16a34a':'#ef4444'}">Büyük harf</span>
            <span class="badge" :style="{color: passValid.hasLower? '#16a34a':'#ef4444'}">Küçük harf</span>
          </div>
          <div class="row" style="justify-content:flex-end; gap:8px">
            <button type="button" class="btn" @click="closeReset">İptal</button>
            <button type="submit" class="btn" :disabled="!passValid.ok">Onayla</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-user-new-view {
  min-height: 100vh;
  background: var(--bg);
}

.page-content {
  max-width: 85%;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 24px;
}

.header-content {
  flex: 1;
}

.header-content h1 {
  margin: 0 0 8px;
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
}

.page-subtitle {
  margin: 0;
  font-size: 1.125rem;
  color: var(--muted);
  font-weight: 400;
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  border: none;
}

.btn-primary {
  background: #374151;
  color: white;
}

.btn-primary:hover {
  background: #1f2937;
}

.filters-section {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-group {
  flex: 1;
  min-width: 150px;
}

.filter-input, .filter-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  color: #374151;
  transition: border-color 0.2s ease;
}

.filter-input:focus, .filter-select:focus {
  outline: none;
  border-color: var(--primary);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.empty-icon {
  margin-bottom: 1.5rem;
  color: #9ca3af;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #374151;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
}

.users-container {
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
}

.users-table {
  width: 100%;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 50px 2fr 2fr 1.5fr 1.5fr 1.5fr 100px 120px;
  gap: 1rem;
  padding: 20px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  color: var(--text);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.header-cell.sortable {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.header-cell.sortable:hover {
  color: var(--primary);
}

.header-cell.sortable svg {
  transition: transform 0.2s;
  flex-shrink: 0;
}

.header-cell.sortable svg.rotate-180 {
  transform: rotate(180deg);
}

.table-body {
  background: var(--panel);
}

.table-row {
  display: grid;
  grid-template-columns: 50px 2fr 2fr 1.5fr 1.5fr 1.5fr 100px 120px;
  gap: 1rem;
  padding: 20px;
  border-bottom: 1px solid var(--border);
  transition: background-color 0.2s;
  align-items: center;
}

.table-row:hover {
  background: var(--bg);
}

.table-cell {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: var(--text);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.user-details {
  min-width: 0;
}

.user-name {
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
}

.user-name-placeholder {
  font-style: italic;
  color: var(--muted);
  font-size: 0.8rem;
}

.email-cell {
  color: var(--muted);
  font-size: 0.875rem;
}

.username-cell {
  display: flex;
  align-items: center;
}

.username-badge {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.no-username {
  color: var(--muted);
  font-style: italic;
}

.user-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.type-ADMIN {
  background: var(--bg);
  color: var(--warning);
  border: 1px solid var(--border);
}

.type-SUPERADMIN {
  background: var(--bg);
  color: var(--danger);
  border: 1px solid var(--border);
}

.type-USER {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}

.type-none {
  background: var(--bg);
  color: var(--muted);
  border: 1px solid var(--border);
}

.date-cell {
  color: var(--muted);
  font-size: 0.875rem;
}

.activity-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.activity-time {
  font-weight: 600;
  color: var(--text);
  font-size: 0.875rem;
}

.status-col {
  display: flex;
  justify-content: center;
  align-items: center;
}

.status-col.sortable {
  justify-content: flex-start;
}

.status-indicator {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.online {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
  animation: pulse 2s infinite;
}

.status-indicator.offline {
  background: #94a3b8;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

.header-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.online-indicator-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: #dcfce7;
  border: 1px solid #86efac;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #047857;
}

.online-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.edit-btn {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}

.edit-btn:hover {
  background: var(--panel);
  border-color: var(--text);
  transform: translateY(-1px);
}

.reset-btn {
  background: var(--bg);
  color: var(--danger);
  border: 1px solid var(--border);
}

.reset-btn:hover {
  background: var(--panel);
  border-color: var(--danger);
  transform: translateY(-1px);
}

.modal-backdrop {
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
  overflow-y: auto;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.edit-modal {
  max-width: 700px;
}

.modal h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stack label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.input {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.row {
  display: flex;
  gap: 0.75rem;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.muted {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: var(--text);
  font-size: 0.875rem;
}

.password-rules {
  margin-top: 0.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.danger-zone {
  margin-top: 2rem;
  padding: 1.5rem;
  border: 2px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
}

.danger-zone-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  color: #dc2626;
}

.danger-zone-header svg {
  flex-shrink: 0;
}

.danger-zone-header h4 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.danger-zone-section {
  margin-bottom: 1.5rem;
}

.danger-zone-section:last-child {
  margin-bottom: 0;
}

.danger-zone-description {
  margin: 0 0 1rem 0;
  color: #7f1d1d;
  font-size: 0.875rem;
  line-height: 1.5;
}

.btn-danger {
  background: #dc2626;
  color: white;
  border: 1px solid #dc2626;
}

.btn-danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}

.btn-warning {
  background: #f59e0b;
  color: white;
  border: 1px solid #f59e0b;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-warning:hover {
  background: #d97706;
  border-color: #d97706;
}

.delete-modal {
  text-align: center;
}

.delete-modal-header {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
  color: #dc2626;
}

.delete-modal h3 {
  color: #1f2937;
}

.delete-warning {
  margin: 1rem 0 2rem 0;
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #7f1d1d;
  font-size: 0.9375rem;
  line-height: 1.6;
  text-align: left;
}

.delete-warning strong {
  color: #dc2626;
  font-weight: 600;
}

/* Desktop/Mobile Toggle */
.desktop-only {
  display: block;
}

.mobile-only {
  display: none;
}

/* Mobile Card View */
.users-cards {
  display: none;
  flex-direction: column;
  gap: 12px;
  padding: 0;
}

.user-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.card-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.card-edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text);
}

.card-edit-btn:hover {
  background: var(--panel);
  border-color: var(--text);
  transform: translateY(-1px);
}

.card-user-info {
  display: flex;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.card-user-details {
  flex: 1;
  min-width: 0;
}

.card-user-name {
  font-weight: 600;
  color: var(--text);
  font-size: 1rem;
  margin-bottom: 4px;
}

.card-user-name-placeholder {
  font-style: italic;
  color: var(--muted);
  font-size: 0.875rem;
  margin-bottom: 4px;
}

.card-user-email {
  color: var(--muted);
  font-size: 0.875rem;
  word-break: break-word;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-info-row {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.card-label {
  font-size: 0.875rem;
  color: var(--muted);
  font-weight: 500;
}

.card-value {
  font-size: 0.875rem;
  color: var(--text);
  font-weight: 500;
}

/* 2FA Badge Styles */
.twofa-cell {
  display: flex;
  align-items: center;
}

.twofa-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.twofa-badge.enabled {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

.twofa-badge.enabled svg {
  color: #10b981;
}

.twofa-badge.disabled {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.twofa-badge.disabled svg {
  color: #9ca3af;
}

@media (max-width: 768px) {
  .admin-user-new-view {
    padding: 0;
  }

  .page-content {
    padding: 12px;
    margin: 0;
    max-width: 100%;
    width: 100%;
    box-sizing: border-box;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    text-align: left;
    margin-bottom: 16px;
  }

  .page-header .btn {
    width: 100%;
    justify-content: center;
  }

  .filters-section {
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .filter-group {
    min-width: auto;
  }

  /* Toggle desktop/mobile views */
  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: block !important;
  }

  .users-cards {
    display: flex !important;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .user-card {
    padding: 12px;
    margin: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .card-header {
    margin-bottom: 10px;
    padding-bottom: 10px;
  }

  .card-body {
    gap: 8px;
  }

  .users-container {
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .card-edit-btn {
    width: 32px;
    height: 32px;
  }

  .card-edit-btn svg {
    width: 16px;
    height: 16px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .edit-modal {
    max-width: 100vw;
    width: 100vw;
    max-height: 100vh;
    height: 100vh;
    margin: 0;
    padding: 1rem;
    border-radius: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  
  .edit-modal h3 {
    margin-bottom: 1rem;
    position: sticky;
    top: 0;
    background: white;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }
  
  .edit-modal form {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .edit-modal .form-container {
    flex: 1;
  }
  
  .edit-modal .modal-actions {
    position: sticky;
    bottom: 0;
    background: white;
    margin-top: auto;
    padding-top: 16px;
    flex-direction: column;
    gap: 12px;
  }
  
  .edit-modal .modal-actions .btn {
    width: 100%;
    padding: 12px;
    font-size: 1rem;
  }
  
  .modal-backdrop {
    padding: 5%;
    align-items: stretch;
    justify-content: stretch;
  }
}
</style>

