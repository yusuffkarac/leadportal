<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

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
const sortKey = ref('createdAt')
const sortDir = ref('desc')

const filteredUsers = computed(() => {
  let list = users.value.slice()
  if (query.value) {
    const q = query.value.toLowerCase()
    list = list.filter(u => u.email.toLowerCase().includes(q))
  }
  if (filterUserType.value) list = list.filter(u => u.userType?.id === filterUserType.value)
  list.sort((a,b) => {
    const dir = sortDir.value === 'asc' ? 1 : -1
    if (sortKey.value === 'email') return a.email.localeCompare(b.email) * dir
    return (new Date(a.createdAt) - new Date(b.createdAt)) * dir
  })
  return list
})

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function submit() {
  ok.value = ''
  err.value = ''
  
  // Frontend validation
  if (!email.value.trim()) {
    err.value = 'Email adresi gerekli'
    return
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    err.value = 'Geçerli bir email adresi giriniz'
    return
  }
  
  if (!password.value.trim()) {
    err.value = 'Şifre gerekli'
    return
  }
  
  if (password.value.length < 6) {
    err.value = 'Şifre en az 6 karakter olmalıdır'
    return
  }
  
  if (!modalUserTypeId.value) {
    err.value = 'Kullanıcı tipi seçilmelidir'
    return
  }
  
  try {
    const userData = { 
      email: email.value, 
      password: password.value,
      firstName: firstName.value || null,
      lastName: lastName.value || null,
      username: username.value || null,
      userTypeId: modalUserTypeId.value
    }
    await axios.post('/api/users', userData, { headers: authHeaders() })
    ok.value = 'Kullanıcı oluşturuldu'
    email.value = ''
    password.value = ''
    firstName.value = ''
    lastName.value = ''
    username.value = ''
    modalUserTypeId.value = ''
    showNewUser.value = false
    loadUsers()
  } catch (e) {
    const status = e?.response?.status
    const serverError = e?.response?.data?.error
    
    if (serverError) {
      err.value = serverError
    } else if (status === 409) {
      err.value = 'Bu email adresi zaten kullanılıyor'
    } else if (status === 403) {
      err.value = 'Bu işlem için yetkiniz yok'
    } else if (status === 400) {
      err.value = 'Girilen bilgilerde hata var'
    } else if (status === 500) {
      err.value = 'Sunucu hatası oluştu'
    } else if (status === 0 || !status) {
      err.value = 'Sunucuya bağlanılamıyor'
    } else {
      err.value = 'Beklenmeyen bir hata oluştu'
    }
  }
}

function openNewUser() {
  showNewUser.value = true
  ok.value = ''
  err.value = ''
  query.value = ''
  filterUserType.value = ''
}


function closeNewUser() {
  showNewUser.value = false
  email.value = ''
  password.value = ''
  firstName.value = ''
  lastName.value = ''
  username.value = ''
  modalUserTypeId.value = ''
  ok.value = ''
  err.value = ''
}

function openEditUser(user) {
  showEditUser.value = true
  editUserId.value = user.id
  editEmail.value = user.email
  editFirstName.value = user.firstName || ''
  editLastName.value = user.lastName || ''
  editUsername.value = user.username || ''
  editUserTypeId.value = user.userType?.id || ''
  editPassword.value = ''
  ok.value = ''
  err.value = ''
}

function closeEditUser() {
  showEditUser.value = false
  editUserId.value = null
  editEmail.value = ''
  editFirstName.value = ''
  editLastName.value = ''
  editUsername.value = ''
  editUserTypeId.value = ''
  editPassword.value = ''
  ok.value = ''
  err.value = ''
}

async function submitEdit() {
  ok.value = ''
  err.value = ''
  
  // Frontend validation
  if (!editEmail.value.trim()) {
    err.value = 'Email adresi gerekli'
    return
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(editEmail.value)) {
    err.value = 'Geçerli bir email adresi giriniz'
    return
  }
  
  if (!editUserTypeId.value) {
    err.value = 'Kullanıcı tipi seçilmelidir'
    return
  }
  
  if (editPassword.value && !editPassValid.value.ok) {
    err.value = 'Şifre kurallara uygun değil'
    return
  }
  
  try {
    const userData = { 
      email: editEmail.value,
      firstName: editFirstName.value || null,
      lastName: editLastName.value || null,
      username: editUsername.value || null,
      userTypeId: editUserTypeId.value
    }
    
    // Şifre varsa güncelle
    if (editPassword.value) {
      await axios.put(`/api/users/${editUserId.value}/password`, { password: editPassword.value }, { headers: authHeaders() })
    }
    
    await axios.put(`/api/users/${editUserId.value}`, userData, { headers: authHeaders() })
    ok.value = 'Kullanıcı güncellendi'
    closeEditUser()
    loadUsers()
  } catch (e) {
    const status = e?.response?.status
    const serverError = e?.response?.data?.error
    
    if (serverError) {
      err.value = serverError
    } else if (status === 409) {
      err.value = 'Bu email adresi zaten kullanılıyor'
    } else if (status === 403) {
      err.value = 'Bu işlem için yetkiniz yok'
    } else if (status === 400) {
      err.value = 'Girilen bilgilerde hata var'
    } else if (status === 404) {
      err.value = 'Kullanıcı bulunamadı'
    } else if (status === 500) {
      err.value = 'Sunucu hatası oluştu'
    } else if (status === 0 || !status) {
      err.value = 'Sunucuya bağlanılamıyor'
    } else {
      err.value = 'Beklenmeyen bir hata oluştu'
    }
  }
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
const showNewUser = ref(false)
const showEditUser = ref(false)
const editUserId = ref(null)
const editEmail = ref('')
const editFirstName = ref('')
const editLastName = ref('')
const editUsername = ref('')
const editUserTypeId = ref('')
const editPassword = ref('')
const passValid = computed(() => {
  const p = resetPass.value
  const long = p.length >= 8
  const hasNum = /\d/.test(p)
  const hasUpper = /[A-Z]/.test(p)
  const hasLower = /[a-z]/.test(p)
  return { long, hasNum, hasUpper, hasLower, ok: long && hasNum && hasUpper && hasLower }
})

const editPassValid = computed(() => {
  const p = editPassword.value
  if (!p) return { long: true, hasNum: true, hasUpper: true, hasLower: true, ok: true } // Şifre opsiyonel
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
    err.value = 'Şifre gerekli'
    return
  }
  
  if (!passValid.value.ok) {
    err.value = 'Şifre kurallara uygun değil'
    return
  }
  
  try {
    await axios.put(`/api/users/${resetUserId.value}/password`, { password: resetPass.value }, { headers: authHeaders() })
    showReset.value = false
    // Başarı mesajı göstermek için
    ok.value = 'Şifre başarıyla sıfırlandı'
    setTimeout(() => ok.value = '', 3000)
  } catch (e) {
    const status = e?.response?.status
    const serverError = e?.response?.data?.error
    
    if (serverError) {
      err.value = serverError
    } else if (status === 403) {
      err.value = 'Bu işlem için yetkiniz yok'
    } else if (status === 400) {
      err.value = 'Şifre formatı hatalı'
    } else if (status === 404) {
      err.value = 'Kullanıcı bulunamadı'
    } else if (status === 500) {
      err.value = 'Sunucu hatası oluştu'
    } else if (status === 0 || !status) {
      err.value = 'Sunucuya bağlanılamıyor'
    } else {
      err.value = 'Şifre sıfırlanamadı'
    }
  }
}

onMounted(() => {
  loadUsers()
  loadUserTypes()
})
</script>
<template>
  <div class="admin-user-new-view">
    <div class="page-content">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Kullanıcılar</h1>
          <p class="page-subtitle">{{ filteredUsers.length }} kullanıcı</p>
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
            placeholder="Email ile ara..." 
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
        <div class="filter-group">
          <select class="filter-select" v-model="sortKey">
            <option value="createdAt">Tarihe Göre</option>
            <option value="email">Email'e Göre</option>
          </select>
        </div>
        <div class="filter-group">
          <select class="filter-select" v-model="sortDir">
            <option value="desc">Azalan</option>
            <option value="asc">Artan</option>
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
        <div class="users-table">
          <div class="table-header">
            <div class="header-cell">Kullanıcı</div>
            <div class="header-cell">Email</div>
            <div class="header-cell">Kullanıcı Adı</div>
            <div class="header-cell">Tip</div>
            <div class="header-cell">Kayıt Tarihi</div>
            <div class="header-cell actions">İşlemler</div>
          </div>
          
          <div class="table-body">
            <div class="table-row" v-for="u in filteredUsers" :key="u.id">
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
                <div class="date-cell">
                  {{ new Date(u.createdAt).toLocaleDateString('tr-TR') }}
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
      </div>
    </div>

    <!-- Yeni Kullanıcı Modal -->
    <div v-if="showNewUser" class="modal-backdrop">
      <div class="modal">
        <h3>Yeni Kullanıcı</h3>
        <div v-if="ok" style="color:#16a34a; margin-top:8px">{{ ok }}</div>
        <div v-if="err" style="color:#ef4444; margin-top:8px">{{ err }}</div>
        <form @submit.prevent="submit" class="stack" style="margin-top:10px">
          <label>Ad</label>
          <input class="input" v-model="firstName" type="text" autocomplete="given-name" />
          <label>Soyad</label>
          <input class="input" v-model="lastName" type="text" autocomplete="family-name" />
          <label>Kullanıcı Adı</label>
          <input class="input" v-model="username" type="text" autocomplete="username" />
          <label>Email *</label>
          <input class="input" v-model="email" type="email" required autocomplete="email" />
          <label>Şifre *</label>
          <input class="input" v-model="password" type="password" required autocomplete="new-password" />
          <label>Kullanıcı Tipi *</label>
          <select class="input" v-model="modalUserTypeId" required>
            <option value="">Kullanıcı Tipi Seçin</option>
            <option v-for="userType in userTypes" :key="userType.id" :value="userType.id">
              {{ userType.name }}
            </option>
          </select>
          <div class="row" style="justify-content:flex-end; gap:8px; margin-top:16px">
            <button type="button" class="btn" @click="closeNewUser">İptal</button>
            <button type="submit" class="btn">Oluştur</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Kullanıcı Düzenleme Modal -->
    <div v-if="showEditUser" class="modal-backdrop">
      <div class="modal edit-modal">
        <h3>Kullanıcı Düzenle</h3>
        <div v-if="ok" style="color:#16a34a; margin-top:8px">{{ ok }}</div>
        <div v-if="err" style="color:#ef4444; margin-top:8px">{{ err }}</div>
        <form @submit.prevent="submitEdit" style="margin-top:20px">
          <div class="form-grid">
            <div class="form-column">
              <div class="form-group">
                <label>Ad</label>
                <input class="input" v-model="editFirstName" type="text" autocomplete="given-name" />
              </div>
              <div class="form-group">
                <label>Soyad</label>
                <input class="input" v-model="editLastName" type="text" autocomplete="family-name" />
              </div>
              <div class="form-group">
                <label>Kullanıcı Adı</label>
                <input class="input" v-model="editUsername" type="text" autocomplete="username" />
              </div>
            </div>
            <div class="form-column">
              <div class="form-group">
                <label>Email *</label>
                <input class="input" v-model="editEmail" type="email" required autocomplete="email" />
              </div>
              <div class="form-group">
                <label>Kullanıcı Tipi *</label>
                <select class="input" v-model="editUserTypeId" required>
                  <option value="">Kullanıcı Tipi Seçin</option>
                  <option v-for="userType in userTypes" :key="userType.id" :value="userType.id">
                    {{ userType.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Yeni Şifre <span class="muted">(boş bırakılırsa değişmez)</span></label>
                <input class="input" v-model="editPassword" type="password" autocomplete="new-password" placeholder="Şifre değiştirmek için doldurun" />
                <div v-if="editPassword" class="password-rules">
                  <div class="row" style="flex-wrap:wrap; gap:6px; margin-top:8px">
                    <span class="badge" :style="{color: editPassValid.long? '#16a34a':'#ef4444'}">En az 8 karakter</span>
                    <span class="badge" :style="{color: editPassValid.hasNum? '#16a34a':'#ef4444'}">Rakam</span>
                    <span class="badge" :style="{color: editPassValid.hasUpper? '#16a34a':'#ef4444'}">Büyük harf</span>
                    <span class="badge" :style="{color: editPassValid.hasLower? '#16a34a':'#ef4444'}">Küçük harf</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeEditUser">İptal</button>
            <button type="submit" class="btn btn-primary">Güncelle</button>
          </div>
        </form>
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
  max-width: 75%;
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
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.users-table {
  width: 100%;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 2fr 1.5fr 1.5fr 1.5fr 120px;
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

.table-body {
  background: var(--panel);
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1.5fr 1.5fr 1.5fr 120px;
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

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.form-column {
  display: flex;
  flex-direction: column;
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

@media (max-width: 1024px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr 1fr 1fr 100px;
  }
  
  .table-header .header-cell:nth-child(3),
  .table-header .header-cell:nth-child(5),
  .table-row .table-cell:nth-child(3),
  .table-row .table-cell:nth-child(5) {
    display: none;
  }
}

@media (max-width: 768px) {
  .admin-user-new-view {
    padding: 0;
  }
  
  .page-content {
    padding: 16px;
    margin: 0;
    max-width: 100%;
    width: 100%;
    box-sizing: border-box;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
    text-align: left;
  }
  
  .page-header .btn {
    width: 100%;
    justify-content: center;
  }
  
  .filters-section {
    flex-direction: column;
    gap: 8px;
  }
  
  .filter-group {
    min-width: auto;
  }
  
  .users-container {
    margin: 0 -16px;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 1fr 80px;
    padding: 16px;
    gap: 16px;
  }
  
  .table-header .header-cell:nth-child(2),
  .table-header .header-cell:nth-child(3),
  .table-header .header-cell:nth-child(4),
  .table-header .header-cell:nth-child(5),
  .table-row .table-cell:nth-child(2),
  .table-row .table-cell:nth-child(3),
  .table-row .table-cell:nth-child(4),
  .table-row .table-cell:nth-child(5) {
    display: none;
  }
  
  .user-info {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
  
  .user-avatar {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }
  
  .user-details {
    flex: 1;
    min-width: 0;
  }
  
  .user-name {
    font-size: 0.875rem;
    margin-bottom: 2px;
  }
  
  .user-name-placeholder {
    font-size: 0.875rem;
    margin-bottom: 2px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
    width: 80px;
    align-items: stretch;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
    padding: 8px 4px;
    font-size: 0.75rem;
  }
  
  .form-grid {
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
  
  .edit-modal .form-grid {
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
    padding: 0;
    align-items: stretch;
    justify-content: stretch;
  }
}
</style>

