<template>
  <div class="admin-settings-page">
    <div class="page-content">
      <div class="page-header">
        <h1>Uygulama Ayarları</h1>
        <p class="page-subtitle">Sistem genelinde kullanılan ayarları yönetin</p>
      </div>

      <!-- Settings Sections -->
      <div class="settings-sections">
        <!-- Lead ID Format Settings -->
        <div class="settings-section">
          <div class="section-header">
            <h2>Lead ID Formatı</h2>
            <p>Lead'lerin nasıl numaralandırılacağını belirleyin</p>
          </div>
          
          <div class="settings-content">
            <div class="setting-group">
              <label class="setting-label">ID Formatı</label>
              <div class="format-options">
                <label class="format-option" :class="{ active: settings.leadIdFormat === 'numeric' }">
                  <input 
                    type="radio" 
                    v-model="settings.leadIdFormat" 
                    value="numeric"
                    @change="updateSettings"
                  >
                  <div class="option-content">
                    <div class="option-title">Sayısal (1, 2, 3...)</div>
                    <div class="option-preview">Örnek: 1, 2, 3, 1001</div>
                  </div>
                </label>

                <label class="format-option" :class="{ active: settings.leadIdFormat === 'prefixed-numeric' }">
                  <input 
                    type="radio" 
                    v-model="settings.leadIdFormat" 
                    value="prefixed-numeric"
                    @change="updateSettings"
                  >
                  <div class="option-content">
                    <div class="option-title">Ön Ekli Sayısal (LEAD-1, LEAD-2...)</div>
                    <div class="option-preview">Örnek: LEAD-1, LEAD-2, LEAD-1001</div>
                  </div>
                </label>

                <label class="format-option" :class="{ active: settings.leadIdFormat === 'date-numeric' }">
                  <input 
                    type="radio" 
                    v-model="settings.leadIdFormat" 
                    value="date-numeric"
                    @change="updateSettings"
                  >
                  <div class="option-content">
                    <div class="option-title">Tarihli Sayısal (20241201-1, 20241201-2...)</div>
                    <div class="option-preview">Örnek: 20241201-1, 20241201-2</div>
                  </div>
                </label>

                <label class="format-option" :class="{ active: settings.leadIdFormat === 'custom' }">
                  <input 
                    type="radio" 
                    v-model="settings.leadIdFormat" 
                    value="custom"
                    @change="updateSettings"
                  >
                  <div class="option-content">
                    <div class="option-title">Özel Format</div>
                    <div class="option-preview">Kendi formatınızı belirleyin</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Custom Format Settings -->
            <div v-if="settings.leadIdFormat === 'custom'" class="custom-format-settings">
              <div class="setting-group">
                <label class="setting-label">Özel Format Şablonu</label>
                <input 
                  v-model="settings.customFormat" 
                  type="text" 
                  class="form-input"
                  placeholder="Örnek: L{YYYY}{MM}{DD}-{NUM}"
                  @input="updateSettings"
                >
                <div class="format-help">
                  <p>Kullanılabilir değişkenler:</p>
                  <ul>
                    <li><code>{YYYY}</code> - Yıl (2024)</li>
                    <li><code>{MM}</code> - Ay (01-12)</li>
                    <li><code>{DD}</code> - Gün (01-31)</li>
                    <li><code>{NUM}</code> - Sıra numarası (1, 2, 3...)</li>
                    <li><code>{PREFIX}</code> - Ön ek</li>
                  </ul>
                </div>
              </div>

              <div class="setting-group">
                <label class="setting-label">Ön Ek</label>
                <input 
                  v-model="settings.leadPrefix" 
                  type="text" 
                  class="form-input"
                  placeholder="LEAD"
                  @input="updateSettings"
                >
              </div>
            </div>

            <!-- Numeric Settings -->
            <div v-if="settings.leadIdFormat === 'prefixed-numeric'" class="setting-group">
              <label class="setting-label">Ön Ek</label>
              <input 
                v-model="settings.leadPrefix" 
                type="text" 
                class="form-input"
                placeholder="LEAD"
                @input="updateSettings"
              >
            </div>

            <!-- Starting Number -->
            <div class="setting-group">
              <label class="setting-label">Başlangıç Numarası</label>
              <input 
                v-model.number="settings.startingNumber" 
                type="number" 
                class="form-input"
                min="1"
                @input="updateSettings"
              >
              <small class="form-help">Yeni lead'ler bu numaradan başlayacak</small>
            </div>

            <!-- Number Type -->
            <div class="setting-group">
              <label class="setting-label">Sayı Türü</label>
              <div class="radio-options">
                <label class="radio-option" :class="{ active: settings.numberType === 'sequential' }">
                  <input 
                    type="radio" 
                    v-model="settings.numberType" 
                    value="sequential"
                    @change="updateSettings"
                  >
                  <div class="option-content">
                    <div class="option-title">Sıralı (1, 2, 3...)</div>
                    <div class="option-preview">Her yeni lead bir sonraki sayıyı alır</div>
                  </div>
                </label>

                <label class="radio-option" :class="{ active: settings.numberType === 'random' }">
                  <input 
                    type="radio" 
                    v-model="settings.numberType" 
                    value="random"
                    @change="updateSettings"
                  >
                  <div class="option-content">
                    <div class="option-title">Rastgele</div>
                    <div class="option-preview">Her lead rastgele bir sayı alır</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Preview -->
            <div class="setting-group">
              <label class="setting-label">Önizleme</label>
              <div class="preview-box">
                <div class="preview-item" v-for="i in 3" :key="i">
                  {{ generatePreviewId(i) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Other Settings -->
        <div class="settings-section">
          <div class="section-header">
            <h2>Genel Ayarlar</h2>
            <p>Diğer sistem ayarları</p>
          </div>
          
          <div class="settings-content">
            <div class="setting-group">
              <label class="setting-label">Varsayılan Para Birimi</label>
              <select v-model="settings.defaultCurrency" class="form-select" @change="updateSettings">
                <option value="TRY">Türk Lirası (₺)</option>
                <option value="USD">Amerikan Doları ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>

            <div class="setting-group">
              <label class="setting-label">Varsayılan Açık Artırma Süresi (Gün)</label>
              <input 
                v-model.number="settings.defaultAuctionDays" 
                type="number" 
                class="form-input"
                min="1"
                max="30"
                @input="updateSettings"
              >
            </div>

            <div class="setting-group">
              <label class="setting-label">Varsayılan Minimum Artış</label>
              <input 
                v-model.number="settings.defaultMinIncrement" 
                type="number" 
                class="form-input"
                min="1"
                step="0.01"
                @input="updateSettings"
              >
            </div>
          </div>

          <!-- Sistem Ayarları -->
          <div class="settings-section">
            <h3 class="section-title">Sistem Ayarları</h3>
            
            <div class="setting-group">
              <label class="setting-label">Bakım Modu</label>
              <div class="toggle-container">
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    v-model="settings.maintenanceMode"
                    @change="updateSettings"
                  >
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">
                  {{ settings.maintenanceMode ? 'Açık' : 'Kapalı' }}
                </span>
              </div>
              <small class="form-help">
                Bakım modu açıkken sadece admin kullanıcıları sisteme erişebilir
              </small>
            </div>

            <div v-if="settings.maintenanceMode" class="setting-group">
              <label class="setting-label">Bakım Mesajı</label>
              <textarea 
                v-model="settings.maintenanceMessage" 
                class="form-textarea"
                rows="3"
                placeholder="Kullanıcılara gösterilecek bakım mesajı"
                @input="updateSettings"
              ></textarea>
              <small class="form-help">
                Bu mesaj bakım modu sırasında kullanıcılara gösterilir
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="save-section">
        <button class="btn btn-primary" @click="saveSettings" :disabled="saving">
          <svg v-if="saving" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <polyline points="17,21 17,13 7,13 7,21"/>
            <polyline points="7,3 7,8 15,8"/>
          </svg>
          {{ saving ? 'Kaydediliyor...' : 'Ayarları Kaydet' }}
        </button>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="message" class="message" :class="messageType">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/axios.js'

const settings = ref({
  leadIdFormat: 'numeric',
  customFormat: 'L{YYYY}{MM}{DD}-{NUM}',
  leadPrefix: 'LEAD',
  startingNumber: 1,
  numberType: 'sequential',
  defaultCurrency: 'TRY',
  defaultAuctionDays: 7,
  defaultMinIncrement: 10,
  maintenanceMode: false,
  maintenanceMessage: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.'
})

const saving = ref(false)
const message = ref('')
const messageType = ref('')

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function generatePreviewId(index) {
  let num
  if (settings.value.numberType === 'random') {
    // Rastgele sayı (1000-9999 arası)
    num = Math.floor(Math.random() * 9000) + 1000
  } else {
    // Sıralı sayı
    num = settings.value.startingNumber + index - 1
  }
  
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  
  switch (settings.value.leadIdFormat) {
    case 'numeric':
      return num.toString()
    case 'prefixed-numeric':
      return `${settings.value.leadPrefix}-${num}`
    case 'date-numeric':
      return `${year}${month}${day}-${num}`
    case 'custom':
      return settings.value.customFormat
        .replace('{YYYY}', year)
        .replace('{MM}', month)
        .replace('{DD}', day)
        .replace('{NUM}', num)
        .replace('{PREFIX}', settings.value.leadPrefix)
    default:
      return num.toString()
  }
}

async function loadSettings() {
  try {
    const response = await api.get('/settings')
    if (response.data) {
      settings.value = { ...settings.value, ...response.data }
    }
  } catch (error) {
    console.error('Ayarlar yüklenemedi:', error)
  }
}

async function updateSettings() {
  // Real-time preview update
}

async function saveSettings() {
  try {
    saving.value = true
    message.value = ''
    
    await api.post('/settings', settings.value)
    
    message.value = 'Ayarlar başarıyla kaydedildi!'
    messageType.value = 'success'
    
    setTimeout(() => {
      message.value = ''
    }, 3000)
    
  } catch (error) {
    message.value = error.response?.data?.message || 'Ayarlar kaydedilemedi'
    messageType.value = 'error'
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<style scoped>
.admin-settings-page {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
}

.page-content {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16px;
}

.page-subtitle {
  font-size: 1.125rem;
  color: var(--primary);
  max-width: 600px;
  margin: 0 auto;
}

.settings-sections {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.settings-section {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
}

.section-header {
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.section-header p {
  color: #64748b;
  font-size: 0.875rem;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.format-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.format-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.format-option:hover {
  border-color: var(--text);
  background: #f8fafc;
}

.format-option.active {
  border-color: var(--text);
  background: #eff6ff;
}

.format-option input[type="radio"] {
  margin: 0;
}

.radio-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-option:hover {
  border-color: var(--text);
  background: #f8fafc;
}

.radio-option.active {
  border-color: var(--text);
  background: #eff6ff;
}

.radio-option input[type="radio"] {
  margin: 0;
}

.option-content {
  flex: 1;
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
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
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--text);
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.toggle-label {
  font-weight: 500;
  color: #374151;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--text);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.option-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.option-preview {
  font-size: 0.875rem;
  color: var(--primary);
  font-family: monospace;
}

.custom-format-settings {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.format-help {
  margin-top: 8px;
  padding: 12px;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 0.875rem;
}

.format-help p {
  margin: 0 0 8px 0;
  font-weight: 600;
  color: #374151;
}

.format-help ul {
  margin: 0;
  padding-left: 16px;
}

.format-help li {
  margin-bottom: 4px;
  color: var(--primary);
}

.format-help code {
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.75rem;
}

.preview-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.preview-item {
  font-family: monospace;
  font-size: 0.875rem;
  color: #374151;
  padding: 4px 0;
  border-bottom: 1px solid #e2e8f0;
}

.preview-item:last-child {
  border-bottom: none;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--text);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-help {
  font-size: 0.75rem;
  color: var(--primary);
  margin-top: 4px;
}

.save-section {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.btn-primary {
  background: var(--text);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message {
  text-align: center;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  margin-top: 20px;
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

/* Responsive */
@media (max-width: 768px) {
  .admin-settings-page {
    padding: 16px;
  }
  
  .settings-section {
    padding: 20px;
  }
  
  .format-options {
    gap: 8px;
  }
  
  .format-option {
    padding: 12px;
  }
  
  .custom-format-settings {
    padding: 16px;
  }
}
</style>
