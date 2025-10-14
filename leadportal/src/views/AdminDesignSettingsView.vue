<template>
  <div class="admin-design-settings-page">
    <div class="page-content">
      <div class="page-header">
        <h1>Tasarım Ayarları</h1>
        <p class="page-subtitle">Uygulamanın görsel temasını ve renklerini özelleştirin</p>
      </div>

      <!-- Color Settings Section -->
      <div class="settings-section">
        <div class="section-header">
          <h2>Renk Ayarları</h2>
          <p>Ana renk paletini özelleştirin</p>
        </div>
        
        <div class="settings-content">
          <div class="color-grid">
            <div class="color-group">
              <label class="setting-label">Arka Plan Rengi</label>
              <div class="color-input-group">
                <input 
                  type="color" 
                  v-model="designSettings.colors.bg" 
                  @input="updatePreview"
                  class="color-picker"
                >
                <input 
                  type="text" 
                  v-model="designSettings.colors.bg" 
                  @input="updatePreview"
                  class="color-text"
                  placeholder="#f8fafc"
                >
              </div>
            </div>

            <div class="color-group">
              <label class="setting-label">Panel Rengi</label>
              <div class="color-input-group">
                <input 
                  type="color" 
                  v-model="designSettings.colors.panel" 
                  @input="updatePreview"
                  class="color-picker"
                >
                <input 
                  type="text" 
                  v-model="designSettings.colors.panel" 
                  @input="updatePreview"
                  class="color-text"
                  placeholder="#ffffff"
                >
              </div>
            </div>

            <div class="color-group">
              <label class="setting-label">Metin Rengi</label>
              <div class="color-input-group">
                <input 
                  type="color" 
                  v-model="designSettings.colors.text" 
                  @input="updatePreview"
                  class="color-picker"
                >
                <input 
                  type="text" 
                  v-model="designSettings.colors.text" 
                  @input="updatePreview"
                  class="color-text"
                  placeholder="#1e293b"
                >
              </div>
            </div>

            <div class="color-group">
              <label class="setting-label">İkincil Metin Rengi</label>
              <div class="color-input-group">
                <input 
                  type="color" 
                  v-model="designSettings.colors.muted" 
                  @input="updatePreview"
                  class="color-picker"
                >
                <input 
                  type="text" 
                  v-model="designSettings.colors.muted" 
                  @input="updatePreview"
                  class="color-text"
                  placeholder="#64748b"
                >
              </div>
            </div>

            <div class="color-group">
              <label class="setting-label">Ana Renk</label>
              <div class="color-input-group">
                <input 
                  type="color" 
                  v-model="designSettings.colors.primary" 
                  @input="updatePreview"
                  class="color-picker"
                >
                <input 
                  type="text" 
                  v-model="designSettings.colors.primary" 
                  @input="updatePreview"
                  class="color-text"
                  placeholder="#1e293b"
                >
              </div>
            </div>

            <div class="color-group">
              <label class="setting-label">Başarı Rengi</label>
              <div class="color-input-group">
                <input 
                  type="color" 
                  v-model="designSettings.colors.success" 
                  @input="updatePreview"
                  class="color-picker"
                >
                <input 
                  type="text" 
                  v-model="designSettings.colors.success" 
                  @input="updatePreview"
                  class="color-text"
                  placeholder="#059669"
                >
              </div>
            </div>

            <div class="color-group">
              <label class="setting-label">Uyarı Rengi</label>
              <div class="color-input-group">
                <input 
                  type="color" 
                  v-model="designSettings.colors.warning" 
                  @input="updatePreview"
                  class="color-picker"
                >
                <input 
                  type="text" 
                  v-model="designSettings.colors.warning" 
                  @input="updatePreview"
                  class="color-text"
                  placeholder="#d97706"
                >
              </div>
            </div>

            <div class="color-group">
              <label class="setting-label">Hata Rengi</label>
              <div class="color-input-group">
                <input 
                  type="color" 
                  v-model="designSettings.colors.danger" 
                  @input="updatePreview"
                  class="color-picker"
                >
                <input 
                  type="text" 
                  v-model="designSettings.colors.danger" 
                  @input="updatePreview"
                  class="color-text"
                  placeholder="#dc2626"
                >
              </div>
            </div>

            <div class="color-group">
              <label class="setting-label">Kenarlık Rengi</label>
              <div class="color-input-group">
                <input 
                  type="color" 
                  v-model="designSettings.colors.border" 
                  @input="updatePreview"
                  class="color-picker"
                >
                <input 
                  type="text" 
                  v-model="designSettings.colors.border" 
                  @input="updatePreview"
                  class="color-text"
                  placeholder="#e2e8f0"
                >
              </div>
            </div>
          </div>

          <!-- Preview Section -->
          <div class="preview-section">
            <h3>Önizleme</h3>
            <div class="preview-container" :style="previewStyles">
              <div class="preview-panel">
                <h4>Örnek Panel</h4>
                <p class="preview-text">Bu bir örnek metindir.</p>
                <p class="preview-muted">Bu ikincil bir metindir.</p>
                <div class="preview-buttons">
                  <button class="preview-btn primary">Ana Buton</button>
                  <button class="preview-btn success">Başarı</button>
                  <button class="preview-btn warning">Uyarı</button>
                  <button class="preview-btn danger">Hata</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Preset Themes -->
          <div class="preset-section">
            <h3>Hazır Temalar</h3>
            <div class="preset-grid">
              <div 
                class="preset-card" 
                v-for="preset in presets" 
                :key="preset.name"
                @click="applyPreset(preset)"
                :class="{ active: isCurrentPreset(preset) }"
              >
                <div class="preset-preview">
                  <div class="preset-colors">
                    <div 
                      class="preset-color" 
                      v-for="color in preset.colors" 
                      :key="color"
                      :style="{ backgroundColor: color }"
                    ></div>
                  </div>
                </div>
                <div class="preset-name">{{ preset.name }}</div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button class="btn btn-secondary" @click="resetToDefaults">
              Varsayılana Sıfırla
            </button>
            <button class="btn btn-primary" @click="saveDesignSettings" :disabled="saving">
              <svg v-if="saving" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="message" class="message" :class="messageType">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/axios.js'

const designSettings = ref({
  colors: {
    bg: '#f8fafc',
    panel: '#ffffff',
    muted: '#64748b',
    text: '#1e293b',
    primary: '#1e293b',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
    border: '#e2e8f0'
  }
})

const saving = ref(false)
const message = ref('')
const messageType = ref('')

// Hazır temalar
const presets = ref([
  {
    name: 'Varsayılan',
    colors: ['#f8fafc', '#ffffff', '#1e293b', '#059669'],
    theme: {
      bg: '#f8fafc',
      panel: '#ffffff',
      muted: '#64748b',
      text: '#1e293b',
      primary: '#1e293b',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      border: '#e2e8f0'
    }
  },
  {
    name: 'Koyu Tema',
    colors: ['#1f2937', '#374151', '#60a5fa', '#34d399'],
    theme: {
      bg: '#1f2937',
      panel: '#374151',
      muted: '#9ca3af',
      text: '#f9fafb',
      primary: '#60a5fa',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
      border: '#4b5563'
    }
  },
  {
    name: 'Yeşil Tema',
    colors: ['#f0fdf4', '#ffffff', '#16a34a', '#059669'],
    theme: {
      bg: '#f0fdf4',
      panel: '#ffffff',
      muted: '#6b7280',
      text: '#1f2937',
      primary: '#16a34a',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      border: '#d1fae5'
    }
  },
  {
    name: 'Mor Tema',
    colors: ['#faf5ff', '#ffffff', '#8b5cf6', '#a855f7'],
    theme: {
      bg: '#faf5ff',
      panel: '#ffffff',
      muted: '#6b7280',
      text: '#1f2937',
      primary: '#8b5cf6',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      border: '#e9d5ff'
    }
  }
])

// Önizleme stilleri
const previewStyles = computed(() => ({
  '--preview-bg': designSettings.value.colors.bg,
  '--preview-panel': designSettings.value.colors.panel,
  '--preview-text': designSettings.value.colors.text,
  '--preview-muted': designSettings.value.colors.muted,
  '--preview-primary': designSettings.value.colors.primary,
  '--preview-success': designSettings.value.colors.success,
  '--preview-warning': designSettings.value.colors.warning,
  '--preview-danger': designSettings.value.colors.danger,
  '--preview-border': designSettings.value.colors.border
}))

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadDesignSettings() {
  try {
    const response = await api.get('/settings/design')
    if (response.data && response.data.colors) {
      designSettings.value = response.data
    }
  } catch (error) {
    console.error('Tasarım ayarları yüklenemedi:', error)
    // Varsayılan değerleri kullan
  }
}

function updatePreview() {
  // CSS değişkenlerini gerçek zamanlı güncelle
  const root = document.documentElement
  Object.entries(designSettings.value.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })
}

function applyPreset(preset) {
  designSettings.value.colors = { ...preset.theme }
  updatePreview()
}

function isCurrentPreset(preset) {
  return JSON.stringify(designSettings.value.colors) === JSON.stringify(preset.theme)
}

function resetToDefaults() {
  const defaultPreset = presets.value[0]
  applyPreset(defaultPreset)
}

async function saveDesignSettings() {
  try {
    saving.value = true
    message.value = ''
    
    await api.post('/settings/design', designSettings.value)
    
    message.value = 'Tasarım ayarları başarıyla kaydedildi!'
    messageType.value = 'success'
    
    // CSS değişkenlerini kalıcı olarak güncelle
    updatePreview()
    
    // Diğer bileşenlere tasarım değişikliğini bildir
    window.dispatchEvent(new Event('design-settings-change'))
    
    setTimeout(() => {
      message.value = ''
    }, 3000)
    
  } catch (error) {
    message.value = error.response?.data?.message || 'Tasarım ayarları kaydedilemedi'
    messageType.value = 'error'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadDesignSettings()
})
</script>

<style scoped>
.admin-design-settings-page {
  min-height: 100vh;
  background: var(--bg);
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
  color: var(--text);
  margin-bottom: 16px;
}

.page-subtitle {
  font-size: 1.125rem;
  color: var(--muted);
  max-width: 600px;
  margin: 0 auto;
}

.settings-section {
  background: var(--panel);
  border-radius: 12px;
  padding: 32px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}

.section-header {
  margin-bottom: 32px;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.section-header p {
  color: var(--muted);
  font-size: 0.875rem;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.color-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-weight: 600;
  color: var(--text);
  font-size: 0.875rem;
}

.color-input-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.color-picker {
  width: 60px;
  height: 40px;
  border: 2px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  background: none;
}

.color-text {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text);
  background: var(--panel);
}

.color-text:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.preview-section h3,
.preset-section h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
}

.preview-container {
  background: var(--preview-bg);
  border: 2px solid var(--preview-border);
  border-radius: 12px;
  padding: 24px;
}

.preview-panel {
  background: var(--preview-panel);
  border: 1px solid var(--preview-border);
  border-radius: 8px;
  padding: 24px;
}

.preview-panel h4 {
  color: var(--preview-text);
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.preview-text {
  color: var(--preview-text);
  margin-bottom: 8px;
}

.preview-muted {
  color: var(--preview-muted);
  font-size: 0.875rem;
  margin-bottom: 16px;
}

.preview-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.preview-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-btn.primary {
  background: var(--preview-primary);
  color: white;
}

.preview-btn.success {
  background: var(--preview-success);
  color: white;
}

.preview-btn.warning {
  background: var(--preview-warning);
  color: white;
}

.preview-btn.danger {
  background: var(--preview-danger);
  color: white;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.preset-card {
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--panel);
}

.preset-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.preset-card.active {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.05);
}

.preset-preview {
  margin-bottom: 12px;
}

.preset-colors {
  display: flex;
  gap: 4px;
  height: 40px;
}

.preset-color {
  flex: 1;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.preset-name {
  font-weight: 600;
  color: var(--text);
  text-align: center;
  font-size: 0.875rem;
}

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px solid var(--border);
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
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--bg);
  border-color: var(--primary);
}

.message {
  text-align: center;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  margin-top: 20px;
}

.message.success {
  background: rgba(5, 150, 105, 0.1);
  color: var(--success);
  border: 1px solid rgba(5, 150, 105, 0.2);
}

.message.error {
  background: rgba(220, 38, 38, 0.1);
  color: var(--danger);
  border: 1px solid rgba(220, 38, 38, 0.2);
}

/* Responsive */
@media (max-width: 768px) {
  .admin-design-settings-page {
    padding: 16px;
  }
  
  .settings-section {
    padding: 20px;
  }
  
  .color-grid {
    grid-template-columns: 1fr;
  }
  
  .preset-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .preview-buttons {
    flex-direction: column;
  }
}
</style>
