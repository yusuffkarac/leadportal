<template>
  <div class="profile-page">
    <div class="profile-container">
      <div class="profile-header">
        <h1>Profil Ayarları</h1>
        <p>Kişisel bilgilerinizi ve hesap ayarlarınızı yönetin</p>
      </div>

      <div class="profile-content">
        <!-- Profil Fotoğrafı Bölümü -->
        <div class="profile-section">
          <div class="section-header">
            <h2>Profil Fotoğrafı</h2>
          </div>
          <div class="profile-photo-section">
            <div class="current-photo">
              <img 
                v-if="user.profileImage" 
                :src="user.profileImage" 
                :alt="displayName"
                class="profile-photo"
              />
              <div v-else class="photo-placeholder">
                {{ initials }}
              </div>
            </div>
            <div class="photo-actions">
              <input 
                type="file" 
                ref="fileInput" 
                @change="handleFileSelect" 
                accept="image/*" 
                style="display: none"
              />
              <button class="btn btn-secondary" @click="$refs.fileInput.click()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                  <circle cx="12" cy="13" r="3"/>
                </svg>
                Fotoğraf Değiştir
              </button>
              <button 
                v-if="user.profileImage" 
                class="btn btn-danger" 
                @click="removePhoto"
                :disabled="isLoading"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                </svg>
                Kaldır
              </button>
            </div>
          </div>
        </div>

        <!-- Kişisel Bilgiler -->
        <div class="profile-section">
          <div class="section-header">
            <h2>Kişisel Bilgiler</h2>
          </div>
          <form @submit.prevent="updateProfile" class="profile-form">
            <div class="form-row">
              <div class="form-group">
                <label for="firstName">Ad</label>
                <input 
                  type="text" 
                  id="firstName" 
                  v-model="form.firstName" 
                  class="form-input"
                  placeholder="Adınızı girin"
                />
              </div>
              <div class="form-group">
                <label for="lastName">Soyad</label>
                <input 
                  type="text" 
                  id="lastName" 
                  v-model="form.lastName" 
                  class="form-input"
                  placeholder="Soyadınızı girin"
                />
              </div>
            </div>
            
            <div class="form-group">
              <label for="username">Kullanıcı Adı</label>
              <input 
                type="text" 
                id="username" 
                v-model="form.username" 
                class="form-input"
                placeholder="Kullanıcı adınızı girin"
              />
            </div>
            
            <div class="form-group">
              <label for="email">E-posta</label>
              <input 
                type="email" 
                id="email" 
                v-model="form.email" 
                class="form-input"
                placeholder="E-posta adresinizi girin"
                required
              />
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" :disabled="isLoading">
                <span v-if="isLoading">Kaydediliyor...</span>
                <span v-else>Bilgileri Güncelle</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Şifre Değiştirme -->
        <div class="profile-section">
          <div class="section-header">
            <h2>Şifre Değiştir</h2>
          </div>
          <form @submit.prevent="changePassword" class="profile-form">
            <div class="form-group">
              <label for="currentPassword">Mevcut Şifre</label>
              <input 
                type="password" 
                id="currentPassword" 
                v-model="passwordForm.currentPassword" 
                class="form-input"
                placeholder="Mevcut şifrenizi girin"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="newPassword">Yeni Şifre</label>
              <input 
                type="password" 
                id="newPassword" 
                v-model="passwordForm.newPassword" 
                class="form-input"
                placeholder="Yeni şifrenizi girin"
                required
                minlength="6"
              />
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">Yeni Şifre Tekrar</label>
              <input 
                type="password" 
                id="confirmPassword" 
                v-model="passwordForm.confirmPassword" 
                class="form-input"
                placeholder="Yeni şifrenizi tekrar girin"
                required
                minlength="6"
              />
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" :disabled="isPasswordLoading">
                <span v-if="isPasswordLoading">Güncelleniyor...</span>
                <span v-else>Şifreyi Değiştir</span>
              </button>
            </div>
          </form>
        </div>

        <!-- İki Faktörlü Kimlik Doğrulama (2FA) -->
        <div class="profile-section">
          <div class="section-header">
            <h2>İki Faktörlü Kimlik Doğrulama (2FA)</h2>
            <p class="section-description">
              Hesabınızı ekstra bir güvenlik katmanı ile koruyun
            </p>
          </div>

          <!-- 2FA Aktif Değil -->
          <div v-if="!twoFactorEnabled" class="twofa-disabled">
            <div class="twofa-info">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <p>2FA şu anda aktif değil. Hesabınızı korumak için 2FA'yı etkinleştirin.</p>
            </div>
            <button
              class="btn btn-primary"
              @click="initiate2FA"
              :disabled="is2FALoading"
            >
              <span v-if="is2FALoading">Yükleniyor...</span>
              <span v-else>2FA'yı Etkinleştir</span>
            </button>
          </div>

          <!-- 2FA Aktif -->
          <div v-else class="twofa-enabled">
            <div class="twofa-status">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="check-icon">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <div>
                <h3>2FA Aktif</h3>
                <p>Hesabınız iki faktörlü kimlik doğrulama ile korunuyor</p>
              </div>
            </div>
            <button
              class="btn btn-danger"
              @click="disable2FA"
              :disabled="is2FALoading"
            >
              <span v-if="is2FALoading">Devre Dışı Bırakılıyor...</span>
              <span v-else>2FA'yı Devre Dışı Bırak</span>
            </button>
          </div>
        </div>

        <!-- Hesap Bilgileri -->
        <div class="profile-section">
          <div class="section-header">
            <h2>Hesap Bilgileri</h2>
          </div>
          <div class="account-info">
            <div class="info-item">
              <label>Kullanıcı Tipi</label>
              <span class="info-value">{{ userType?.name || 'Kullanıcı' }}</span>
            </div>
            <div class="info-item">
              <label>Kayıt Tarihi</label>
              <span class="info-value">{{ formatDate(user.createdAt) }}</span>
            </div>
            <div class="info-item">
              <label>Son Güncelleme</label>
              <span class="info-value">{{ formatDate(user.updatedAt) }}</span>
            </div>
          </div>
        </div>

      <!-- 2FA Setup Modal -->
      <div v-if="show2FAModal" class="modal-overlay" @click.self="close2FAModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>2FA Kurulumu</h3>
            <button class="close-btn" @click="close2FAModal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="setup-step">
              <h4>1. Authenticator uygulamasını indirin</h4>
              <p>Google Authenticator, Authy veya benzeri bir uygulama kullanın.</p>
            </div>

            <div class="setup-step">
              <h4>2. QR kodunu tarayın</h4>
              <div class="qr-code-container">
                <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR Code" />
              </div>
              <p class="secret-key">Veya bu kodu manuel olarak girin: <code>{{ secretKey }}</code></p>
            </div>

            <div class="setup-step">
              <h4>3. Doğrulama kodunu girin</h4>
              <div class="form-group">
                <input
                  type="text"
                  v-model="verificationCode"
                  class="form-input verification-input"
                  placeholder="6 haneli kod"
                  maxlength="6"
                  @input="verificationCode = verificationCode.replace(/[^0-9]/g, '')"
                />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="close2FAModal">İptal</button>
            <button
              class="btn btn-primary"
              @click="verify2FA"
              :disabled="!verificationCode || verificationCode.length !== 6 || is2FALoading"
            >
              <span v-if="is2FALoading">Doğrulanıyor...</span>
              <span v-else>Doğrula ve Etkinleştir</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2FA Disable Confirmation Modal -->
      <div v-if="showDisable2FAModal" class="modal-overlay" @click.self="showDisable2FAModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h3>2FA'yı Devre Dışı Bırak</h3>
            <button class="close-btn" @click="showDisable2FAModal = false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <p>2FA'yı devre dışı bırakmak için lütfen doğrulama kodunu veya şifrenizi girin:</p>

            <div class="form-group">
              <label>2FA Kodu (varsa)</label>
              <input
                type="text"
                v-model="disable2FACode"
                class="form-input"
                placeholder="6 haneli kod"
                maxlength="6"
              />
            </div>

            <div class="form-group">
              <label>Veya Şifreniz</label>
              <input
                type="password"
                v-model="disable2FAPassword"
                class="form-input"
                placeholder="Şifrenizi girin"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showDisable2FAModal = false">İptal</button>
            <button
              class="btn btn-danger"
              @click="confirmDisable2FA"
              :disabled="(!disable2FACode && !disable2FAPassword) || is2FALoading"
            >
              <span v-if="is2FALoading">Devre Dışı Bırakılıyor...</span>
              <span v-else>Devre Dışı Bırak</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios.js'
import { useAlert } from '../composables/useAlert'

const router = useRouter()
const { success, error, warning } = useAlert()

const user = ref({})
const userType = ref({})
const isLoading = ref(false)
const isPasswordLoading = ref(false)

const form = reactive({
  firstName: '',
  lastName: '',
  username: '',
  email: ''
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 2FA state
const twoFactorEnabled = ref(false)
const is2FALoading = ref(false)
const show2FAModal = ref(false)
const showDisable2FAModal = ref(false)
const qrCodeUrl = ref('')
const secretKey = ref('')
const verificationCode = ref('')
const disable2FACode = ref('')
const disable2FAPassword = ref('')

const displayName = computed(() => {
  if (user.value?.firstName && user.value?.lastName) {
    return `${user.value.firstName} ${user.value.lastName}`
  }
  if (user.value?.firstName) {
    return user.value.firstName
  }
  if (user.value?.username) {
    return user.value.username
  }
  return user.value?.email || 'Kullanıcı'
})

const initials = computed(() => {
  const name = displayName.value
  const words = name.split(' ')
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name[0]?.toUpperCase() || 'U'
})

async function loadUserProfile() {
  try {
    const response = await api.get('/auth/profile')
    user.value = response.data.user
    userType.value = response.data.userType
    
    // Form verilerini doldur
    form.firstName = user.value.firstName || ''
    form.lastName = user.value.lastName || ''
    form.username = user.value.username || ''
    form.email = user.value.email || ''
  } catch (err) {
    console.error('Profil yüklenemedi:', err)
    error('Profil bilgileri yüklenemedi')
  }
}

async function updateProfile() {
  isLoading.value = true
  try {
    await api.put('/auth/profile', form)
    await loadUserProfile()
    success('Profil başarıyla güncellendi')
  } catch (err) {
    console.error('Profil güncellenemedi:', err)
    error('Profil güncellenirken hata oluştu')
  } finally {
    isLoading.value = false
  }
}

async function changePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    error('Yeni şifreler eşleşmiyor')
    return
  }
  
  if (passwordForm.newPassword.length < 6) {
    error('Yeni şifre en az 6 karakter olmalıdır')
    return
  }
  
  isPasswordLoading.value = true
  try {
    await api.put('/auth/change-password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
    
    // Formu temizle
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    
    success('Şifre başarıyla değiştirildi')
  } catch (err) {
    console.error('Şifre değiştirilemedi:', err)
    error('Şifre değiştirilirken hata oluştu')
  } finally {
    isPasswordLoading.value = false
  }
}

async function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  
  // Dosya boyutu kontrolü (5MB)
  if (file.size > 5 * 1024 * 1024) {
    warning('Dosya boyutu 5MB\'dan küçük olmalıdır')
    return
  }
  
  // Dosya tipi kontrolü
  if (!file.type.startsWith('image/')) {
    error('Lütfen geçerli bir resim dosyası seçin')
    return
  }
  
  const formData = new FormData()
  formData.append('profileImage', file)
  
  try {
    const response = await api.post('/auth/upload-profile-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    user.value.profileImage = response.data.profileImageUrl
    success('Profil fotoğrafı başarıyla güncellendi')
  } catch (err) {
    console.error('Fotoğraf yüklenemedi:', err)
    error('Fotoğraf yüklenirken hata oluştu')
  }
}

async function removePhoto() {
  if (!confirm('Profil fotoğrafını kaldırmak istediğinizden emin misiniz?')) {
    return
  }
  
  try {
    await api.delete('/auth/profile-image')
    user.value.profileImage = null
    success('Profil fotoğrafı kaldırıldı')
  } catch (err) {
    console.error('Fotoğraf kaldırılamadı:', err)
    error('Fotoğraf kaldırılırken hata oluştu')
  }
}

function formatDate(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 2FA Functions
async function load2FAStatus() {
  try {
    const response = await api.get('/2fa/status')
    twoFactorEnabled.value = response.data.enabled
  } catch (err) {
    console.error('2FA durum yüklenemedi:', err)
  }
}

async function initiate2FA() {
  is2FALoading.value = true
  try {
    const response = await api.post('/2fa/enable')
    qrCodeUrl.value = response.data.qrCode
    secretKey.value = response.data.secret
    show2FAModal.value = true
  } catch (err) {
    console.error('2FA başlatılamadı:', err)
    error(err.response?.data?.error || '2FA başlatılırken hata oluştu')
  } finally {
    is2FALoading.value = false
  }
}

async function verify2FA() {
  is2FALoading.value = true
  try {
    await api.post('/2fa/verify', {
      token: verificationCode.value
    })
    success('2FA başarıyla etkinleştirildi')
    twoFactorEnabled.value = true
    close2FAModal()
  } catch (err) {
    console.error('2FA doğrulama hatası:', err)
    error(err.response?.data?.error || 'Geçersiz kod')
  } finally {
    is2FALoading.value = false
  }
}

function close2FAModal() {
  show2FAModal.value = false
  verificationCode.value = ''
  qrCodeUrl.value = ''
  secretKey.value = ''
}

function disable2FA() {
  showDisable2FAModal.value = true
}

async function confirmDisable2FA() {
  is2FALoading.value = true
  try {
    await api.post('/2fa/disable', {
      token: disable2FACode.value || undefined,
      password: disable2FAPassword.value || undefined
    })
    success('2FA başarıyla devre dışı bırakıldı')
    twoFactorEnabled.value = false
    showDisable2FAModal.value = false
    disable2FACode.value = ''
    disable2FAPassword.value = ''
  } catch (err) {
    console.error('2FA devre dışı bırakma hatası:', err)
    error(err.response?.data?.error || '2FA devre dışı bırakılırken hata oluştu')
  } finally {
    is2FALoading.value = false
  }
}

onMounted(() => {
  loadUserProfile()
  load2FAStatus()
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 2rem 0;
}

.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1rem;
}

.profile-header {
  text-align: center;
  margin-bottom: 3rem;
}

.profile-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.profile-header p {
  font-size: 1.125rem;
  color: #6b7280;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.profile-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.profile-photo-section {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.current-photo {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.profile-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  font-weight: 600;
}

.photo-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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
  color: #374151;
  font-size: 0.875rem;
}

.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.info-item label {
  font-weight: 500;
  color: #374151;
}

.info-value {
  color: #6b7280;
  font-weight: 500;
}

/* 2FA Styles */
.section-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.twofa-disabled,
.twofa-enabled {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.twofa-info,
.twofa-status {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.twofa-info svg {
  color: #6b7280;
  flex-shrink: 0;
}

.twofa-status svg.check-icon {
  color: #10b981;
  flex-shrink: 0;
}

.twofa-status h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.twofa-status p,
.twofa-info p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
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
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.setup-step {
  margin-bottom: 1.5rem;
}

.setup-step:last-child {
  margin-bottom: 0;
}

.setup-step h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.setup-step p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.qr-code-container {
  display: flex;
  justify-content: center;
  padding: 1.5rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  margin: 1rem 0;
}

.qr-code-container img {
  max-width: 100%;
  height: auto;
}

.secret-key {
  text-align: center;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

.secret-key code {
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  color: #1f2937;
  font-size: 0.875rem;
}

.verification-input {
  text-align: center;
  font-size: 1.5rem;
  letter-spacing: 0.5rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  .profile-container {
    padding: 0 0.5rem;
  }

  .profile-header h1 {
    font-size: 2rem;
  }

  .profile-section {
    padding: 1.5rem;
  }

  .profile-photo-section {
    flex-direction: column;
    text-align: center;
  }

  .current-photo {
    width: 100px;
    height: 100px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .photo-actions {
    flex-direction: row;
    justify-content: center;
  }

  .twofa-disabled,
  .twofa-enabled {
    flex-direction: column;
    align-items: flex-start;
  }

  .twofa-info,
  .twofa-status {
    width: 100%;
  }

  .twofa-disabled button,
  .twofa-enabled button {
    width: 100%;
  }

  .modal-content {
    max-width: 100%;
    margin: 0;
  }
}
</style>
