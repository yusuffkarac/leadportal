<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import defaultLogo from '@/assets/images/logo.png'

const router = useRouter()
const emailOrUsername = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const remember = ref(true)
const emailOrUsernameError = ref('')
const passwordError = ref('')
const requires2FA = ref(false)
const twoFactorCode = ref('')
const twoFactorError = ref('')
const sessionTimeoutMessage = ref('')
const showSessionTimeoutMessage = ref(false)

// Branding
const companyName = ref('LeadPortal')
const companyLogoUrl = ref('')
function loadBranding() {
  try {
    companyName.value = localStorage.getItem('companyName') || 'LeadPortal'
    companyLogoUrl.value = localStorage.getItem('companyLogoUrl') || ''
  } catch {}
}

function validate() {
  emailOrUsernameError.value = ''
  passwordError.value = ''
  const emailOrUsernameVal = emailOrUsername.value.trim()
  const pwdVal = password.value
  if (!emailOrUsernameVal) emailOrUsernameError.value = 'Email veya kullanıcı adı zorunlu'
  if (!pwdVal) passwordError.value = 'Şifre zorunlu'
  else if (pwdVal.length < 6) passwordError.value = 'En az 6 karakter olmalı'
  return !emailOrUsernameError.value && !passwordError.value
}

const canSubmit = computed(() => {
  if (requires2FA.value) {
    return !loading.value && twoFactorCode.value.length === 6
  }
  return !loading.value && emailOrUsername.value && password.value && !emailOrUsernameError.value && !passwordError.value
})

async function submit() {
  error.value = ''
  twoFactorError.value = ''

  if (!requires2FA.value && !validate()) return

  try {
    loading.value = true
    const payload = {
      emailOrUsername: emailOrUsername.value,
      password: password.value
    }

    if (requires2FA.value) {
      payload.twoFactorCode = twoFactorCode.value
    }

    const { data } = await axios.post('/api/auth/login', payload)

    // If 2FA is required but not provided yet
    if (data.requires2FA) {
      requires2FA.value = true
      loading.value = false
      return
    }

    // Successful login
    const storage = remember.value ? window.localStorage : window.sessionStorage
    storage.setItem('token', data.token)
    if (data?.user?.userType) {
      storage.setItem('userType', JSON.stringify(data.user.userType))
      storage.setItem('userTypeId', data.user.userType.id)
    }
    window.dispatchEvent(new Event('auth-change'))
    router.push('/')
  } catch (e) {
    if (requires2FA.value) {
      twoFactorError.value = 'Geçersiz 2FA kodu'
    } else {
      error.value = 'Giriş başarısız: Lütfen bilgilerinizi kontrol edin.'
    }
  }
  finally {
    loading.value = false
  }
}

function goBack() {
  requires2FA.value = false
  twoFactorCode.value = ''
  twoFactorError.value = ''
  error.value = ''
}

// Logout mesajını göster
async function loadLogoutMessage() {
  try {
    // URL parametresinden logout nedenini kontrol et
    const params = new URLSearchParams(window.location.search)
    const logoutReason = params.get('logout')

    if (logoutReason === 'inactivity') {
      showSessionTimeoutMessage.value = true
      // Mesajı branding ayarlarından al (public endpoint)
      try {
        const response = await axios.get('/api/settings/branding')
        if (response.data && response.data.sessionTimeoutMessage) {
          sessionTimeoutMessage.value = response.data.sessionTimeoutMessage
        } else {
          // Fallback default message
          sessionTimeoutMessage.value = 'Oturumunuz hareketsizlik nedeniyle sonlandırılmıştır. Lütfen tekrar giriş yapınız.'
        }
      } catch (e) {
        // Eğer ayarları alamazsak default mesajı kullan
        sessionTimeoutMessage.value = 'Oturumunuz hareketsizlik nedeniyle sonlandırılmıştır. Lütfen tekrar giriş yapınız.'
      }
    }
  } catch (error) {
    console.warn('Logout message load error:', error)
  }
}

onMounted(() => {
  loadBranding()
  loadLogoutMessage()
  window.addEventListener('settings-change', loadBranding)
})

onUnmounted(() => {
  window.removeEventListener('settings-change', loadBranding)
})
</script>

<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="brand">
        <img alt="Logo" class="logo" :src="companyLogoUrl || defaultLogo" width="36" height="36" />
        <div class="brand-text">
          <h1>{{ companyName }}</h1>
          <p>Hesabınıza güvenle giriş yapın</p>
        </div>
      </div>

      <div v-if="showSessionTimeoutMessage" class="alert info">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <span>{{ sessionTimeoutMessage }}</span>
      </div>

      <div v-if="error" class="alert">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
        <span>{{ error }}</span>
      </div>

      <form class="form" @submit.prevent="submit">
        <!-- 2FA Code Input -->
        <div v-if="requires2FA" class="twofa-section">
          <div class="twofa-info">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <h3>İki Faktörlü Kimlik Doğrulama</h3>
            <p>Authenticator uygulamanızdan 6 haneli kodu girin</p>
          </div>

          <label class="field">
            <span class="label">2FA Kodu</span>
            <input
              class="input code-input"
              v-model="twoFactorCode"
              type="text"
              placeholder="000000"
              maxlength="6"
              @input="twoFactorCode = twoFactorCode.replace(/[^0-9]/g, '')"
              autocomplete="one-time-code"
              autofocus
              required
            />
            <div v-if="twoFactorError" class="field-error">{{ twoFactorError }}</div>
          </label>

          <div class="twofa-actions">
            <button class="btn secondary" type="button" @click="goBack">
              Geri
            </button>
            <button class="btn primary" type="submit" :disabled="!canSubmit">
              <span v-if="loading" class="spinner" aria-hidden="true"></span>
              <span>{{ loading ? 'Doğrulanıyor...' : 'Doğrula' }}</span>
            </button>
          </div>
        </div>

        <!-- Regular Login Fields -->
        <template v-else>
          <label class="field">
            <span class="label">Email veya Kullanıcı Adı</span>
            <div class="control">
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </span>
              <input class="input" v-model="emailOrUsername" type="text" placeholder="ornek@site.com veya kullaniciadi" autocomplete="username" required />
            </div>
            <div v-if="emailOrUsernameError" class="field-error">{{ emailOrUsernameError }}</div>
          </label>

          <label class="field">
            <span class="label">Şifre</span>
            <div class="control">
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M17 8V7a5 5 0 0 0-10 0v1H5v12h14V8h-2Zm-8 0V7a3 3 0 0 1 6 0v1H9Zm3 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/></svg>
              </span>
              <input class="input" :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="••••••••" autocomplete="current-password" required />
              <button class="icon-btn" type="button" @click="showPassword = !showPassword" :aria-pressed="showPassword" :title="showPassword ? 'Gizle' : 'Göster'">
                <svg v-if="showPassword" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0-5C7 3 2.73 6.11 1 12c1.73 5.89 6 9 11 9s9.27-3.11 11-9c-1.73-5.89-6-9-11-9Z"/></svg>
                <svg v-else viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M2 5.27 3.28 4 20 20.72 18.73 22l-2.4-2.4A12.52 12.52 0 0 1 12 21C7 21 2.73 17.89 1 12a18.46 18.46 0 0 1 5.14-7.11L2 5.27Zm9.77 4.9 2.06 2.06A3 3 0 0 0 11 12a3 3 0 0 0 .77-1.83ZM12 7a5 5 0 0 1 5 5c0 .63-.12 1.22-.34 1.77l4.11 4.11A15.54 15.54 0 0 0 23 12C21.27 6.11 17 3 12 3a11.55 11.55 0 0 0-3.73.63l2.2 2.2C10.96 5.3 11.47 5.25 12 5.25Z"/></svg>
              </button>
            </div>
            <div v-if="passwordError" class="field-error">{{ passwordError }}</div>
          </label>

          <label class="row small">
            <input type="checkbox" v-model="remember" />
            <span>Beni hatırla</span>
            <span style="margin-left:auto"></span>
            <router-link to="/forgot-password" class="muted">Şifremi unuttum?</router-link>
          </label>

          <button class="btn primary" type="submit" :disabled="!canSubmit">
            <span v-if="loading" class="spinner" aria-hidden="true"></span>
            <span>{{ loading ? 'Giriş yapılıyor...' : 'Giriş' }}</span>
          </button>
        </template>
      </form>
    </div>
  </div>
  </template>

<style scoped>
.auth-wrap {
  min-height: calc(70vh);
  display: grid;
  place-items: start center;
  padding: 16px;
  /* Düz arka plan: global bg'den gelsin */
}

.auth-card {
  width: 100%;
  max-width: 480px;
  padding: 28px;
  background: rgba(255,255,255,.75);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0,0,0,.06);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,.06);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-text h1 { margin: 0; font-size: 20px; }
.brand-text p { margin: 0; color: #64748b; font-size: 12px; }

.alert {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  color: #b91c1c;
  background: #fee2e2;
  border: 1px solid #fecaca;
}

.alert.info {
  color: #0369a1;
  background: #e0f2fe;
  border-color: #bae6fd;
}

.form { margin-top: 16px; display: grid; gap: 14px; }

.field .label { display: block; font-size: 12px; color: #64748b; margin-bottom: 6px; }
.control { position: relative; }
.control .input { padding-left: 40px; height: 42px; }
.field-error { color: #b91c1c; font-size: 12px; margin-top: 6px; }
.icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: #64748b;
}
.icon-btn {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  background: transparent; border: 0; padding: 6px; cursor: pointer; color: #64748b;
}

.btn.primary {
  height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: #2563eb; color: white; border: 1px solid rgba(37,99,235,.8);
}
.btn.primary:disabled { opacity: .8; cursor: not-allowed; }

.spinner {
  width: 16px; height: 16px; border-radius: 999px;
  border: 2px solid rgba(255,255,255,.45);
  border-top-color: white;
  animation: spin .8s linear infinite;
}

.btn.secondary {
  height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;
}

.btn.secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

/* 2FA Styles */
.twofa-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.twofa-info {
  text-align: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.twofa-info svg {
  color: #3b82f6;
  margin-bottom: 12px;
}

.twofa-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.twofa-info p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.code-input {
  text-align: center;
  font-size: 24px;
  letter-spacing: 8px;
  font-weight: 600;
  padding-left: 16px !important;
  width: 100%;
}

.twofa-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>

