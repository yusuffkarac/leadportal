<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="brand">
        <img alt="Logo" class="logo" :src="companyLogoUrl || defaultLogo" width="36" height="36" />
        <div class="brand-text">
          <h1>{{ companyName }}</h1>
          <p>Yeni şifre belirleyin</p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="verifying" class="loading-state">
        <div class="spinner large"></div>
        <p>Token doğrulanıyor...</p>
      </div>

      <!-- Invalid Token -->
      <div v-else-if="tokenError" class="error-state">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <h3>Geçersiz Link</h3>
        <p>{{ tokenError }}</p>
        <router-link to="/forgot-password" class="btn primary">
          Yeni Link İste
        </router-link>
      </div>

      <!-- Success State -->
      <div v-else-if="success" class="success-state">
        <div class="success-icon">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <h3>Şifreniz Değiştirildi!</h3>
        <p>{{ success }}</p>
        <router-link to="/login" class="btn primary">
          Giriş Yap
        </router-link>
      </div>

      <!-- Reset Form -->
      <div v-else>
        <div v-if="userEmail" class="info-box">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>Şifre sıfırlama: <strong>{{ userEmail }}</strong></span>
        </div>

        <div v-if="error" class="alert">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
          </svg>
          <span>{{ error }}</span>
        </div>

        <form class="form" @submit.prevent="submit">
          <label class="field">
            <span class="label">Yeni Şifre</span>
            <div class="control">
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M17 8V7a5 5 0 0 0-10 0v1H5v12h14V8h-2Zm-8 0V7a3 3 0 0 1 6 0v1H9Zm3 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/>
                </svg>
              </span>
              <input
                class="input"
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                placeholder="••••••••"
                autocomplete="new-password"
                required
                minlength="6"
                :disabled="loading"
              />
              <button
                class="icon-btn"
                type="button"
                @click="showPassword = !showPassword"
                :aria-pressed="showPassword"
                :title="showPassword ? 'Gizle' : 'Göster'"
              >
                <svg v-if="showPassword" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0-5C7 3 2.73 6.11 1 12c1.73 5.89 6 9 11 9s9.27-3.11 11-9c-1.73-5.89-6-9-11-9Z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M2 5.27 3.28 4 20 20.72 18.73 22l-2.4-2.4A12.52 12.52 0 0 1 12 21C7 21 2.73 17.89 1 12a18.46 18.46 0 0 1 5.14-7.11L2 5.27Zm9.77 4.9 2.06 2.06A3 3 0 0 0 11 12a3 3 0 0 0 .77-1.83ZM12 7a5 5 0 0 1 5 5c0 .63-.12 1.22-.34 1.77l4.11 4.11A15.54 15.54 0 0 0 23 12C21.27 6.11 17 3 12 3a11.55 11.55 0 0 0-3.73.63l2.2 2.2C10.96 5.3 11.47 5.25 12 5.25Z"/>
                </svg>
              </button>
            </div>
            <div v-if="passwordError" class="field-error">{{ passwordError }}</div>
          </label>

          <label class="field">
            <span class="label">Yeni Şifre (Tekrar)</span>
            <div class="control">
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M17 8V7a5 5 0 0 0-10 0v1H5v12h14V8h-2Zm-8 0V7a3 3 0 0 1 6 0v1H9Zm3 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/>
                </svg>
              </span>
              <input
                class="input"
                :type="showConfirmPassword ? 'text' : 'password'"
                v-model="confirmPassword"
                placeholder="••••••••"
                autocomplete="new-password"
                required
                minlength="6"
                :disabled="loading"
              />
              <button
                class="icon-btn"
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                :aria-pressed="showConfirmPassword"
                :title="showConfirmPassword ? 'Gizle' : 'Göster'"
              >
                <svg v-if="showConfirmPassword" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0-5C7 3 2.73 6.11 1 12c1.73 5.89 6 9 11 9s9.27-3.11 11-9c-1.73-5.89-6-9-11-9Z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M2 5.27 3.28 4 20 20.72 18.73 22l-2.4-2.4A12.52 12.52 0 0 1 12 21C7 21 2.73 17.89 1 12a18.46 18.46 0 0 1 5.14-7.11L2 5.27Zm9.77 4.9 2.06 2.06A3 3 0 0 0 11 12a3 3 0 0 0 .77-1.83ZM12 7a5 5 0 0 1 5 5c0 .63-.12 1.22-.34 1.77l4.11 4.11A15.54 15.54 0 0 0 23 12C21.27 6.11 17 3 12 3a11.55 11.55 0 0 0-3.73.63l2.2 2.2C10.96 5.3 11.47 5.25 12 5.25Z"/>
                </svg>
              </button>
            </div>
            <div v-if="confirmPasswordError" class="field-error">{{ confirmPasswordError }}</div>
          </label>

          <div class="password-rules">
            <p class="rules-title">Şifre Gereksinimleri:</p>
            <ul>
              <li :class="{ valid: password.length >= 6 }">En az 6 karakter</li>
            </ul>
          </div>

          <button class="btn primary" type="submit" :disabled="!canSubmit">
            <span v-if="loading" class="spinner" aria-hidden="true"></span>
            <span>{{ loading ? 'Kaydediliyor...' : 'Şifreyi Değiştir' }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import defaultLogo from '@/assets/images/logo.png'

const route = useRoute()

const token = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)
const verifying = ref(true)
const tokenError = ref('')
const userEmail = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const passwordError = ref('')
const confirmPasswordError = ref('')

// Branding
const companyName = ref('LeadPortal')
const companyLogoUrl = ref('')

function loadBranding() {
  try {
    companyName.value = localStorage.getItem('companyName') || 'LeadPortal'
    companyLogoUrl.value = localStorage.getItem('companyLogoUrl') || ''
  } catch {}
}

const canSubmit = computed(() => {
  return !loading.value &&
         password.value &&
         confirmPassword.value &&
         password.value.length >= 6 &&
         password.value === confirmPassword.value
})

function validate() {
  passwordError.value = ''
  confirmPasswordError.value = ''

  if (password.value.length < 6) {
    passwordError.value = 'Şifre en az 6 karakter olmalıdır'
    return false
  }

  if (password.value !== confirmPassword.value) {
    confirmPasswordError.value = 'Şifreler eşleşmiyor'
    return false
  }

  return true
}

async function verifyToken() {
  try {
    verifying.value = true
    tokenError.value = ''

    const { data } = await axios.get(`/api/auth/verify-reset-token/${token.value}`)

    if (data.valid) {
      userEmail.value = data.email
    }
  } catch (e) {
    const errorMessage = e.response?.data?.error
    tokenError.value = errorMessage || 'Bu şifre sıfırlama linki geçersiz veya süresi dolmuş.'
  } finally {
    verifying.value = false
  }
}

async function submit() {
  error.value = ''

  if (!validate()) return

  try {
    loading.value = true

    const { data } = await axios.post('/api/auth/reset-password', {
      token: token.value,
      newPassword: password.value
    })

    success.value = data.message || 'Şifreniz başarıyla değiştirildi!'
    password.value = ''
    confirmPassword.value = ''
  } catch (e) {
    const errorMessage = e.response?.data?.error
    error.value = errorMessage || 'Şifre değiştirilemedi. Lütfen tekrar deneyin.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadBranding()
  window.addEventListener('settings-change', loadBranding)

  // URL'den token'ı al
  token.value = route.query.token || ''

  if (!token.value) {
    tokenError.value = 'Şifre sıfırlama token\'ı bulunamadı.'
    verifying.value = false
  } else {
    verifyToken()
  }
})

onUnmounted(() => {
  window.removeEventListener('settings-change', loadBranding)
})
</script>

<style scoped>
.auth-wrap {
  min-height: calc(70vh);
  display: grid;
  place-items: start center;
  padding: 16px;
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
  margin-bottom: 16px;
}

.brand-text h1 {
  margin: 0;
  font-size: 20px;
}

.brand-text p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
}

.loading-state,
.error-state,
.success-state {
  text-align: center;
  padding: 20px 0;
}

.loading-state p {
  margin-top: 16px;
  color: #64748b;
}

.error-state,
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.error-icon svg {
  color: #dc2626;
}

.success-icon svg {
  color: #10b981;
}

.error-state h3 {
  margin: 0;
  font-size: 20px;
  color: #1f2937;
}

.success-state h3 {
  margin: 0;
  font-size: 20px;
  color: #1f2937;
}

.error-state p,
.success-state p {
  margin: 0;
  color: #6b7280;
  max-width: 320px;
}

.info-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #dbeafe;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #1e40af;
}

.alert {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  color: #b91c1c;
  background: #fee2e2;
  border: 1px solid #fecaca;
}

.form {
  display: grid;
  gap: 14px;
}

.field .label {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 6px;
}

.control {
  position: relative;
}

.control .input {
  padding-left: 40px;
  height: 42px;
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}

.control .input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.control .input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.field-error {
  color: #b91c1c;
  font-size: 12px;
  margin-top: 6px;
}

.icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
}

.icon-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: 0;
  padding: 6px;
  cursor: pointer;
  color: #64748b;
}

.password-rules {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.rules-title {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.password-rules ul {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #6b7280;
}

.password-rules li {
  margin-bottom: 4px;
}

.password-rules li.valid {
  color: #10b981;
}

.btn.primary {
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #2563eb;
  color: white;
  border: 1px solid rgba(37,99,235,.8);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  width: 100%;
  text-decoration: none;
}

.btn.primary:disabled {
  opacity: .8;
  cursor: not-allowed;
}

.btn.primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.spinner {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid rgba(255,255,255,.45);
  border-top-color: white;
  animation: spin .8s linear infinite;
}

.spinner.large {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
