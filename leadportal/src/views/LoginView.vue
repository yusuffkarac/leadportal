<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import defaultLogo from '@/assets/images/logo.png'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const remember = ref(true)
const emailError = ref('')
const passwordError = ref('')

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
  const emailVal = email.value.trim()
  const pwdVal = password.value
  const emailOk = /.+@.+\..+/.test(emailVal)
  if (!emailVal) emailError.value = 'Email zorunlu'
  else if (!emailOk) emailError.value = 'Geçerli bir email girin'
  if (!pwdVal) passwordError.value = 'Şifre zorunlu'
  else if (pwdVal.length < 6) passwordError.value = 'En az 6 karakter olmalı'
  return !emailError.value && !passwordError.value
}

const canSubmit = computed(() => {
  return !loading.value && email.value && password.value && !emailError.value && !passwordError.value
})

async function submit() {
  error.value = ''
  if (!validate()) return
  try {
    loading.value = true
    const { data } = await axios.post('/api/auth/login', { email: email.value, password: password.value })
    const storage = remember.value ? window.localStorage : window.sessionStorage
    storage.setItem('token', data.token)
    if (data?.user?.userType) {
      storage.setItem('userType', JSON.stringify(data.user.userType))
      storage.setItem('userTypeId', data.user.userType.id)
    }
    window.dispatchEvent(new Event('auth-change'))
    router.push('/')
  } catch (e) {
    error.value = 'Giriş başarısız: Lütfen bilgilerinizi kontrol edin.'
  }
  finally {
    loading.value = false
  }
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
          <p>Hesabınıza güvenle giriş yapın</p>
        </div>
      </div>

      <div v-if="error" class="alert">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
        <span>{{ error }}</span>
      </div>

      <form class="form" @submit.prevent="submit">
        <label class="field">
          <span class="label">Email</span>
          <div class="control">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z"/></svg>
            </span>
            <input class="input" v-model="email" type="email" placeholder="ornek@site.com" autocomplete="email" required />
          </div>
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
          <a href="#" class="muted" @click.prevent>Şifremi unuttum?</a>
        </label>

        <button class="btn primary" type="submit" :disabled="!canSubmit">
          <span v-if="loading" class="spinner" aria-hidden="true"></span>
          <span>{{ loading ? 'Giriş yapılıyor...' : 'Giriş' }}</span>
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

@keyframes spin { to { transform: rotate(360deg); } }
</style>

