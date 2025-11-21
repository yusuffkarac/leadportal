<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="brand">
        <img alt="Logo" class="logo" :src="companyLogoUrl || defaultLogo" width="36" height="36" />
        <div class="brand-text">
          <h1>{{ companyName }}</h1>
          <p>Setzen Sie Ihr Passwort zurück</p>
        </div>
      </div>

      <!-- Success Message -->
      <div v-if="success" class="alert success">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>{{ success }}</span>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="alert">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="currentColor" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- Form - sadece success mesajı yoksa göster -->
      <form v-if="!success" class="form" @submit.prevent="submit">
        <p class="description">
          Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link zum Zurücksetzen des Passworts.
        </p>

        <label class="field">
          <span class="label">E-Mail-Adresse</span>
          <div class="control">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </span>
            <input
              class="input"
              v-model="email"
              type="email"
              placeholder="beispiel@seite.com"
              autocomplete="email"
              required
              :disabled="loading"
            />
          </div>
          <div v-if="emailError" class="field-error">{{ emailError }}</div>
        </label>

        <button class="btn primary" type="submit" :disabled="!canSubmit">
          <span v-if="loading" class="spinner" aria-hidden="true"></span>
          <span>{{ loading ? 'Wird gesendet...' : 'Passwort-Zurücksetzungs-Link senden' }}</span>
        </button>

        <div class="back-to-login">
          <router-link to="/login" class="link">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            Zur Anmeldeseite zurückkehren
          </router-link>
        </div>
      </form>

      <!-- Success durumunda giriş linki göster -->
      <div v-else class="success-actions">
        <router-link to="/login" class="btn primary">
          Zur Anmeldeseite zurückkehren
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import defaultLogo from '@/assets/images/logo.png'

const email = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)
const emailError = ref('')

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
  return !loading.value && email.value && !emailError.value
})

function validate() {
  emailError.value = ''
  const emailVal = email.value.trim()

  if (!emailVal) {
    emailError.value = 'E-Mail-Adresse erforderlich'
    return false
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailVal)) {
    emailError.value = 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
    return false
  }

  return true
}

async function submit() {
  error.value = ''
  success.value = ''

  if (!validate()) return

  try {
    loading.value = true
    const { data } = await axios.post('/api/auth/forgot-password', {
      email: email.value.trim()
    })

    success.value = data.message || 'Der Passwort-Zurücksetzungs-Link wurde an Ihre E-Mail-Adresse gesendet.'
    email.value = ''
  } catch (e) {
    const errorMessage = e.response?.data?.error
    if (errorMessage) {
      error.value = errorMessage
    } else {
      error.value = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
    }
  } finally {
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

.brand-text h1 {
  margin: 0;
  font-size: 20px;
}

.brand-text p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
}

.description {
  margin: 16px 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
}

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

.alert.success {
  color: #065f46;
  background: #d1fae5;
  border-color: #6ee7b7;
}

.form {
  margin-top: 16px;
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

.back-to-login {
  text-align: center;
  margin-top: 8px;
}

.link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s;
}

.link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.success-actions {
  margin-top: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
