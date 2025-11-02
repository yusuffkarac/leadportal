<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import defaultLogo from '@/assets/images/logo.png'

const router = useRouter()
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const firstName = ref('')
const lastName = ref('')
const username = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const registrationSuccess = ref(false)
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const firstNameError = ref('')
const lastNameError = ref('')
const usernameError = ref('')

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
  emailError.value = ''
  passwordError.value = ''
  confirmPasswordError.value = ''
  firstNameError.value = ''
  lastNameError.value = ''
  usernameError.value = ''

  const emailVal = email.value.trim()
  const pwdVal = password.value
  const confirmPwdVal = confirmPassword.value
  const firstNameVal = firstName.value.trim()
  const lastNameVal = lastName.value.trim()
  const usernameVal = username.value.trim()

  if (!emailVal) {
    emailError.value = 'Email adresi zorunlu'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    emailError.value = 'Geçerli bir email adresi giriniz'
  }

  if (!pwdVal) {
    passwordError.value = 'Şifre zorunlu'
  } else if (pwdVal.length < 6) {
    passwordError.value = 'En az 6 karakter olmalı'
  }

  if (!confirmPwdVal) {
    confirmPasswordError.value = 'Şifre tekrarı zorunlu'
  } else if (pwdVal !== confirmPwdVal) {
    confirmPasswordError.value = 'Şifreler eşleşmiyor'
  }

  if (!firstNameVal) firstNameError.value = 'Ad zorunlu'
  if (!lastNameVal) lastNameError.value = 'Soyadı zorunlu'

  return !emailError.value && !passwordError.value && !confirmPasswordError.value &&
         !firstNameError.value && !lastNameError.value
}

const canSubmit = computed(() => {
  return !loading.value && email.value && password.value && confirmPassword.value &&
         firstName.value && lastName.value && !emailError.value && !passwordError.value &&
         !confirmPasswordError.value && !firstNameError.value && !lastNameError.value
})

async function submit() {
  error.value = ''

  if (!validate()) return

  try {
    loading.value = true
    const payload = {
      email: email.value.trim(),
      password: password.value,
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim()
    }

    if (username.value.trim()) {
      payload.username = username.value.trim()
    }

    const { data } = await axios.post('/api/auth/register', payload)

    if (data.message) {
      registrationSuccess.value = true
    } else if (data.token) {
      // Onay gerekli değilse direkt giriş yapabilir
      localStorage.setItem('token', data.token)
      if (data?.user?.userType) {
        localStorage.setItem('userType', JSON.stringify(data.user.userType))
        localStorage.setItem('userTypeId', data.user.userType.id)
      }
      window.dispatchEvent(new Event('auth-change'))
      router.push('/')
    }
  } catch (e) {
    if (e.response?.status === 409) {
      error.value = 'Bu email adresi zaten kullanılıyor'
      emailError.value = 'Email zaten kayıtlı'
    } else if (e.response?.data?.error) {
      error.value = e.response.data.error
    } else {
      error.value = 'Kayıt başarısız. Lütfen daha sonra tekrar deneyin.'
    }
  } finally {
    loading.value = false
  }
}

function goToLogin() {
  router.push('/login')
}

onMounted(() => {
  loadBranding()
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
          <p>Yeni bir hesap oluşturun</p>
        </div>
      </div>

      <!-- Başarılı Kayıt Mesajı -->
      <div v-if="registrationSuccess" class="alert success">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <div>
          <strong>Kaydınız başarıyla alındı!</strong>
          <p>Admin onayı bekleniyor. Onaylandıktan sonra giriş yapabileceksiniz. Bu genellikle 24 saat içinde tamamlanır.</p>
          <button class="btn primary" @click="goToLogin" style="margin-top: 12px; width: 100%;">
            Giriş Sayfasına Dön
          </button>
        </div>
      </div>

      <!-- Hata Mesajı -->
      <div v-if="error && !registrationSuccess" class="alert">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="currentColor" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- Kayıt Formu -->
      <form v-if="!registrationSuccess" class="form" @submit.prevent="submit">
        <!-- Ad -->
        <label class="field">
          <span class="label">Ad *</span>
          <div class="control">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </span>
            <input class="input" v-model="firstName" type="text" placeholder="Adınız" required @blur="() => { if (!firstName.trim()) firstNameError = 'Ad zorunlu' }" />
          </div>
          <div v-if="firstNameError" class="field-error">{{ firstNameError }}</div>
        </label>

        <!-- Soyadı -->
        <label class="field">
          <span class="label">Soyadı *</span>
          <div class="control">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </span>
            <input class="input" v-model="lastName" type="text" placeholder="Soyadınız" required @blur="() => { if (!lastName.trim()) lastNameError = 'Soyadı zorunlu' }" />
          </div>
          <div v-if="lastNameError" class="field-error">{{ lastNameError }}</div>
        </label>

        <!-- Kullanıcı Adı (Opsiyonel) -->
        <label class="field">
          <span class="label">Kullanıcı Adı (Opsiyonel)</span>
          <div class="control">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </span>
            <input class="input" v-model="username" type="text" placeholder="Kullanıcı adı" />
          </div>
          <div v-if="usernameError" class="field-error">{{ usernameError }}</div>
        </label>

        <!-- Email -->
        <label class="field">
          <span class="label">Email Adresi *</span>
          <div class="control">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            </span>
            <input class="input" v-model="email" type="email" placeholder="ornek@site.com" required @blur="validate" />
          </div>
          <div v-if="emailError" class="field-error">{{ emailError }}</div>
        </label>

        <!-- Şifre -->
        <label class="field">
          <span class="label">Şifre *</span>
          <div class="control">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M17 8V7a5 5 0 0 0-10 0v1H5v12h14V8h-2Zm-8 0V7a3 3 0 0 1 6 0v1H9Zm3 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/></svg>
            </span>
            <input class="input" :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="••••••••" required @blur="validate" />
            <button class="icon-btn" type="button" @click="showPassword = !showPassword" :aria-pressed="showPassword" :title="showPassword ? 'Gizle' : 'Göster'">
              <svg v-if="showPassword" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0-5C7 3 2.73 6.11 1 12c1.73 5.89 6 9 11 9s9.27-3.11 11-9c-1.73-5.89-6-9-11-9Z"/></svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M2 5.27 3.28 4 20 20.72 18.73 22l-2.4-2.4A12.52 12.52 0 0 1 12 21C7 21 2.73 17.89 1 12a18.46 18.46 0 0 1 5.14-7.11L2 5.27Zm9.77 4.9 2.06 2.06A3 3 0 0 0 11 12a3 3 0 0 0 .77-1.83ZM12 7a5 5 0 0 1 5 5c0 .63-.12 1.22-.34 1.77l4.11 4.11A15.54 15.54 0 0 0 23 12C21.27 6.11 17 3 12 3a11.55 11.55 0 0 0-3.73.63l2.2 2.2C10.96 5.3 11.47 5.25 12 5.25Z"/></svg>
            </button>
          </div>
          <div v-if="passwordError" class="field-error">{{ passwordError }}</div>
        </label>

        <!-- Şifre Tekrarı -->
        <label class="field">
          <span class="label">Şifre Tekrarı *</span>
          <div class="control">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M17 8V7a5 5 0 0 0-10 0v1H5v12h14V8h-2Zm-8 0V7a3 3 0 0 1 6 0v1H9Zm3 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/></svg>
            </span>
            <input class="input" :type="showConfirmPassword ? 'text' : 'password'" v-model="confirmPassword" placeholder="••••••••" required @blur="validate" />
            <button class="icon-btn" type="button" @click="showConfirmPassword = !showConfirmPassword" :aria-pressed="showConfirmPassword" :title="showConfirmPassword ? 'Gizle' : 'Göster'">
              <svg v-if="showConfirmPassword" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0-5C7 3 2.73 6.11 1 12c1.73 5.89 6 9 11 9s9.27-3.11 11-9c-1.73-5.89-6-9-11-9Z"/></svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M2 5.27 3.28 4 20 20.72 18.73 22l-2.4-2.4A12.52 12.52 0 0 1 12 21C7 21 2.73 17.89 1 12a18.46 18.46 0 0 1 5.14-7.11L2 5.27Zm9.77 4.9 2.06 2.06A3 3 0 0 0 11 12a3 3 0 0 0 .77-1.83ZM12 7a5 5 0 0 1 5 5c0 .63-.12 1.22-.34 1.77l4.11 4.11A15.54 15.54 0 0 0 23 12C21.27 6.11 17 3 12 3a11.55 11.55 0 0 0-3.73.63l2.2 2.2C10.96 5.3 11.47 5.25 12 5.25Z"/></svg>
            </button>
          </div>
          <div v-if="confirmPasswordError" class="field-error">{{ confirmPasswordError }}</div>
        </label>

        <!-- Giriş Sayfasına Link -->
        <label class="row small">
          <span>Zaten bir hesabınız var mı?</span>
          <span style="margin-left:auto"></span>
          <router-link to="/login" class="muted">Giriş yapın</router-link>
        </label>

        <!-- Kayıt Butonu -->
        <button class="btn primary" type="submit" :disabled="!canSubmit">
          <span v-if="loading" class="spinner" aria-hidden="true"></span>
          <span>{{ loading ? 'Kaydediliyor...' : 'Kayıt Ol' }}</span>
        </button>
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
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  color: #b91c1c;
  background: #fee2e2;
  border: 1px solid #fecaca;
  font-size: 14px;
}

.alert.success {
  color: #166534;
  background: #dcfce7;
  border-color: #bbf7d0;
}

.alert.success strong {
  display: block;
  margin-bottom: 4px;
}

.alert.success p {
  margin: 0;
  font-size: 13px;
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
  width: 100%;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}
.btn.primary:disabled { opacity: .8; cursor: not-allowed; }

.spinner {
  width: 16px; height: 16px; border-radius: 999px;
  border: 2px solid rgba(255,255,255,.45);
  border-top-color: white;
  animation: spin .8s linear infinite;
}

.row.small {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
}

.muted {
  color: #2563eb;
  text-decoration: none;
}

.muted:hover {
  text-decoration: underline;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
