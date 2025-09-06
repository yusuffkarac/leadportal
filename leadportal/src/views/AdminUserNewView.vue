<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const email = ref('')
const password = ref('')
const modalRole = ref('USER')
const modalLevel = ref('S1')
const ok = ref('')
const err = ref('')
const users = ref([])
const query = ref('')
const filterRole = ref('')
const filterLevel = ref('')
const sortKey = ref('createdAt')
const sortDir = ref('desc')

const filteredUsers = computed(() => {
  let list = users.value.slice()
  if (query.value) {
    const q = query.value.toLowerCase()
    list = list.filter(u => u.email.toLowerCase().includes(q))
  }
  if (filterRole.value) list = list.filter(u => u.role === filterRole.value)
  if (filterLevel.value) list = list.filter(u => u.level === filterLevel.value)
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
  
  try {
    await axios.post('/api/users', { email: email.value, password: password.value, role: modalRole.value, level: modalLevel.value }, { headers: authHeaders() })
    ok.value = 'Kullanıcı oluşturuldu'
    email.value = ''
    password.value = ''
    modalRole.value = 'USER'
    modalLevel.value = 'S1'
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
  filterRole.value = ''
  filterLevel.value = ''
}


function closeNewUser() {
  showNewUser.value = false
  email.value = ''
  password.value = ''
  modalRole.value = 'USER'
  modalLevel.value = 'S1'
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

const showReset = ref(false)
const resetUserId = ref(null)
const resetPass = ref('')
const showNewUser = ref(false)
const passValid = computed(() => {
  const p = resetPass.value
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

onMounted(loadUsers)
</script>
<template>
  <div class="admin-user-new-view">
    <div class="page-content">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Kullanıcı Yönetimi</h1>
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
          <select class="filter-select" v-model="filterRole">
            <option value="">Tüm Roller</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <div class="filter-group">
          <select class="filter-select" v-model="filterLevel">
            <option value="">Tüm Seviyeler</option>
            <option value="S1">S1</option>
            <option value="S2">S2</option>
            <option value="S3">S3</option>
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
        <div class="empty-icon">👥</div>
        <h3>Henüz kullanıcı yok</h3>
        <p>İlk kullanıcınızı oluşturmak için "Yeni Kullanıcı" butonuna tıklayın</p>
      </div>
      
      <div v-else class="users-grid">
        <div class="user-card" v-for="u in filteredUsers" :key="u.id">
          <div class="user-info">
            <div class="user-email">{{ u.email }}</div>
            <div class="user-meta">
              <span class="user-role">{{ u.role }}</span>
              <span class="user-level">{{ u.level }}</span>
            </div>
          </div>
          <div class="user-actions">
            <button class="btn btn-secondary" @click="openReset(u.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
              Şifre Sıfırla
            </button>
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
          <label>Email</label>
          <input class="input" v-model="email" type="email" required autocomplete="off" />
          <label>Şifre</label>
          <input class="input" v-model="password" type="password" required autocomplete="new-password" />
          <label>Rol</label>
          <select class="input" v-model="modalRole">
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <label>Seviye</label>
          <select class="input" v-model="modalLevel">
            <option value="S1">S1</option>
            <option value="S2">S2</option>
            <option value="S3">S3</option>
          </select>
          <div class="row" style="justify-content:flex-end; gap:8px; margin-top:16px">
            <button type="button" class="btn" @click="closeNewUser">İptal</button>
            <button type="submit" class="btn">Oluştur</button>
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

