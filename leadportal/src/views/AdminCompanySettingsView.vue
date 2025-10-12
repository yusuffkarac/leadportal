<template>
  <div class="admin-settings-page">
    <div class="page-content">
      <div class="page-header">
        <h1>Firma Ayarları</h1>
      </div>

      <!-- Grid: 2 columns on desktop -->
      <div class="grid">
        <!-- Marka -->
        <section class="card">
          <header class="card-header">
            <div>
              <h2>Marka</h2>
              <p>Logo ve firma adı</p>
            </div>
          </header>

          <div class="card-body">
            <div class="field">
              <label>Firma Adı</label>
              <input v-model="companyName" type="text" class="input" placeholder="Örnek: LeadPortal">
            </div>

            <div class="field">
              <label>Logo URL</label>
              <input
                v-model="logoUrlInput"
                type="text"
                class="input"
                :disabled="logoUploadedViaFile"
                placeholder="https://.../logo.png"
              >
              <small class="help">Boş bırakılırsa varsayılan logo kullanılır</small>
            </div>

            <div class="field">
              <label>Logo Yükle</label>
              <div class="upload">
                <input id="company-logo-file" class="file" type="file" accept="image/*" @change="onLogoFileChange">
                <label for="company-logo-file" class="btn btn-outline">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Dosya Seç
                </label>
                <span class="file-name" v-if="logoFileName">{{ logoFileName }}</span>
                <span class="file-name muted" v-else>Seçilmedi</span>
                <button v-if="logoUploadedViaFile" type="button" class="btn btn-danger" @click="clearLogoFile">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Kaldır
                </button>
              </div>
            </div>

            <div class="field" v-if="companyLogoUrl">
              <label>Logo Önizleme</label>
              <div class="preview">
                <img :src="companyLogoUrl" alt="Logo Preview" />
              </div>
            </div>

            <div class="field">
              <label>Favicon URL</label>
              <input
                v-model="faviconUrlInput"
                type="text"
                class="input"
                :disabled="faviconUploadedViaFile"
                placeholder="https://.../favicon.ico"
              >
              <small class="help">Boş bırakılırsa varsayılan favicon kullanılır</small>
            </div>

            <div class="field">
              <label>Favicon Yükle</label>
              <div class="upload">
                <input id="favicon-file" class="file" type="file" accept="image/*,.ico" @change="onFaviconFileChange">
                <label for="favicon-file" class="btn btn-outline">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Favicon Seç
                </label>
                <span class="file-name" v-if="faviconFileName">{{ faviconFileName }}</span>
                <span class="file-name muted" v-else>Seçilmedi</span>
                <button v-if="faviconUploadedViaFile" type="button" class="btn btn-danger" @click="clearFaviconFile">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Kaldır
                </button>
              </div>
            </div>

            <div class="field" v-if="faviconUrl || faviconUrlInput">
              <label>Favicon Önizleme</label>
              <div class="preview favicon-preview">
                <img :src="faviconUrlInput || faviconUrl" alt="Favicon Preview" />
              </div>
            </div>
          </div>

          <footer class="card-footer">
            <button class="btn btn-primary" @click="saveBranding" :disabled="savingBranding">
              <span v-if="savingBranding" class="spinner-sm"></span>
              <span v-else>Markayı Kaydet</span>
            </button>
          </footer>
        </section>

        <!-- Footer Ayarları -->
        <section class="card">
          <header class="card-header">
            <div>
              <h2>Footer Ayarları</h2>
              <p>İletişim ve yasal bilgiler</p>
            </div>
          </header>

          <div class="card-body">
            <div class="field">
              <label>Telefon</label>
              <input v-model="footerPhone" type="text" class="input" placeholder="+90 (212) 123 45 67">
            </div>
            <div class="field">
              <label>E-posta</label>
              <input v-model="footerEmail" type="email" class="input" placeholder="info@example.com">
            </div>
            <div class="field">
              <label>Alt Bilgi Notu</label>
              <input v-model="footerNote" type="text" class="input" placeholder="© 2024 Firma. Tüm hakları saklıdır.">
            </div>
          </div>

          <footer class="card-footer">
            <button class="btn btn-primary" @click="saveFooter" :disabled="savingFooter">
              <span v-if="savingFooter" class="spinner-sm"></span>
              <span v-else>Footer'ı Kaydet</span>
            </button>
          </footer>
        </section>
      </div>

      <div v-if="message" class="message" :class="messageType">{{ message }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const companyName = ref('LeadPortal')
const companyLogoUrl = ref('')
const logoUrlInput = ref('')
const logoFileName = ref('')
const logoUploadedViaFile = ref(false)

const faviconUrl = ref('')
const faviconUrlInput = ref('')
const faviconFileName = ref('')
const faviconUploadedViaFile = ref(false)

const savingBranding = ref(false)

const footerPhone = ref('')
const footerEmail = ref('')
const footerNote = ref('')
const savingFooter = ref(false)

const message = ref('')
const messageType = ref('')

function loadFromStorage() {
  try {
    companyName.value = localStorage.getItem('companyName') || 'LeadPortal'
    companyLogoUrl.value = localStorage.getItem('companyLogoUrl') || ''
    logoUrlInput.value = companyLogoUrl.value && !companyLogoUrl.value.startsWith('data:') ? companyLogoUrl.value : ''
    logoUploadedViaFile.value = !!(companyLogoUrl.value && companyLogoUrl.value.startsWith('data:'))
    logoFileName.value = logoUploadedViaFile.value ? 'Yüklendi (data URL)' : ''

    // Favicon'u localStorage'dan veya sessionStorage'dan yükle
    faviconUrl.value = localStorage.getItem('faviconUrl') || sessionStorage.getItem('faviconUrl') || ''
    faviconUrlInput.value = faviconUrl.value && !faviconUrl.value.startsWith('data:') ? faviconUrl.value : ''
    faviconUploadedViaFile.value = !!(faviconUrl.value && faviconUrl.value.startsWith('data:'))
    faviconFileName.value = faviconUploadedViaFile.value ? 'Yüklendi (sıkıştırılmış)' : ''

    footerPhone.value = localStorage.getItem('footerPhone') || ''
    footerEmail.value = localStorage.getItem('footerEmail') || ''
    footerNote.value = localStorage.getItem('footerNote') || ''
  } catch {}
}

function onLogoFileChange(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    companyLogoUrl.value = reader.result
    logoUrlInput.value = ''
    logoUploadedViaFile.value = true
    logoFileName.value = file.name
  }
  reader.readAsDataURL(file)
}

function clearLogoFile() {
  companyLogoUrl.value = ''
  logoUrlInput.value = ''
  logoUploadedViaFile.value = false
  logoFileName.value = ''
  const input = document.getElementById('company-logo-file')
  if (input) input.value = ''
}

function onFaviconFileChange(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  
  // Resmi canvas ile küçült ve sıkıştır
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      // 32x32 boyutunda sıkıştırılmış favicon oluştur
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 32, 32)
      
      // Düşük kalitede PNG olarak kaydet (boyutu küçültmek için)
      const compressedDataUrl = canvas.toDataURL('image/png', 0.8)
      
      faviconUrl.value = compressedDataUrl
      faviconUrlInput.value = ''
      faviconUploadedViaFile.value = true
      faviconFileName.value = file.name
    }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
}

function clearFaviconFile() {
  faviconUrl.value = ''
  faviconUrlInput.value = ''
  faviconUploadedViaFile.value = false
  faviconFileName.value = ''
  const input = document.getElementById('favicon-file')
  if (input) input.value = ''
}


function updateFavicon(url) {
  if (!url) return
  
  try {
    // Eğer data URL ise, canvas ile 16x16 ve 32x32 boyutlarında favicon oluştur
    if (url.startsWith('data:')) {
      createFaviconFromDataUrl(url)
      return
    }
    
    // Normal URL için direkt favicon güncelle
    setFaviconLink(url)
    
  } catch (error) {
    console.error('Favicon güncellenirken hata:', error)
  }
}

function createFaviconFromDataUrl(dataUrl) {
  const img = new Image()
  img.onload = () => {
    // 32x32 favicon oluştur (tek boyut yeterli)
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, 32, 32)
    
    // Canvas'ı data URL'e dönüştür
    const faviconUrl = canvas.toDataURL('image/png')
    
    // Favicon linkini güncelle
    setFaviconLink(faviconUrl)
  }
  img.src = dataUrl
}

function setFaviconLink(url, sizes = null) {
  // Tüm favicon linklerini temizle
  const existingLinks = document.querySelectorAll("link[rel*='icon']")
  existingLinks.forEach(link => link.remove())
  
  // Yeni favicon linki oluştur
  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/png'
  link.href = url
  link.setAttribute('data-dynamic', 'true')
  
  if (sizes) {
    link.sizes = sizes
  }
  
  // Cache busting için timestamp ekle (sadece normal URL'ler için)
  if (!url.includes('?') && !url.startsWith('data:') && !url.startsWith('blob:')) {
    link.href += '?v=' + Date.now()
  }
  
  // Head'e ekle
  document.getElementsByTagName('head')[0].appendChild(link)
}

async function saveBranding() {
  try {
    savingBranding.value = true
    message.value = ''
    
    // Persist locally for immediate UX; backend schema may not yet support these fields
    localStorage.setItem('companyName', companyName.value || '')
    localStorage.setItem('companyLogoUrl', (logoUrlInput.value || companyLogoUrl.value) || '')
    
    // Favicon kaydet ve güncelle
    const finalFaviconUrl = faviconUrlInput.value || faviconUrl.value
    
    // localStorage boyut kontrolü ile kaydet
    try {
      if (finalFaviconUrl) {
        // Data URL boyutunu kontrol et (localStorage limiti ~5MB)
        const sizeInBytes = new Blob([finalFaviconUrl]).size
        const sizeInMB = sizeInBytes / (1024 * 1024)
        
        if (sizeInMB > 2) {
          throw new Error('Favicon çok büyük, lütfen daha küçük bir resim seçin')
        }
        
        localStorage.setItem('faviconUrl', finalFaviconUrl)
        
        // Favicon'u hemen güncelle
        updateFavicon(finalFaviconUrl)
      } else {
        localStorage.removeItem('faviconUrl')
      }
    } catch (error) {
      if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
        // localStorage dolu, favicon'u sessionStorage'a kaydet
        try {
          sessionStorage.setItem('faviconUrl', finalFaviconUrl || '')
          message.value = 'Favicon kaydedildi (geçici olarak). Tarayıcı depolama alanı dolu.'
          messageType.value = 'success'
        } catch (sessionError) {
          message.value = 'Favicon çok büyük. Lütfen daha küçük bir resim seçin.'
          messageType.value = 'error'
          return
        }
      } else {
        message.value = error.message || 'Favicon kaydedilemedi'
        messageType.value = 'error'
        return
      }
      
      // Yine de favicon'u güncelle
      if (finalFaviconUrl) {
        updateFavicon(finalFaviconUrl)
      }
    }
    
    window.dispatchEvent(new Event('settings-change'))
    message.value = 'Marka ayarları kaydedildi!'
    messageType.value = 'success'
  } catch (e) {
    message.value = 'Marka ayarları kaydedilemedi'
    messageType.value = 'error'
    console.error('Branding save error:', e)
  } finally {
    savingBranding.value = false
  }
}

async function saveFooter() {
  try {
    savingFooter.value = true
    message.value = ''
    localStorage.setItem('footerPhone', footerPhone.value || '')
    localStorage.setItem('footerEmail', footerEmail.value || '')
    localStorage.setItem('footerNote', footerNote.value || '')
    window.dispatchEvent(new Event('settings-change'))
    message.value = 'Footer ayarları kaydedildi!'
    messageType.value = 'success'
  } catch (e) {
    message.value = 'Footer ayarları kaydedilemedi'
    messageType.value = 'error'
  } finally {
    savingFooter.value = false
  }
}

onMounted(() => {
  loadFromStorage()
  
  // Sayfa yüklendiğinde mevcut favicon'u uygula
  const savedFavicon = localStorage.getItem('faviconUrl') || sessionStorage.getItem('faviconUrl')
  if (savedFavicon) {
    updateFavicon(savedFavicon)
  }
})
</script>

<style scoped>
/* Page */
.admin-settings-page { min-height: 100vh; background: #f8f9fa; padding: 24px; }
.page-content { max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 2rem; font-weight: 700; color: #1f2937; }

/* Grid */
.grid { display: grid; grid-template-columns: 1fr; gap: 24px; }

/* Card */
.card { background: #fff; border: 1px solid #eef2f7; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.04); display: flex; flex-direction: column; }
.card-header { padding: 20px 24px 0; }
.card-header h2 { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0; }
.card-header p { color: #64748b; margin: 8px 0 0; font-size: .9rem; }
.card-body { padding: 20px 24px; display: grid; gap: 16px; }
.card-footer { padding: 16px 24px 24px; display: flex; justify-content: flex-end; }

/* Fields */
.field { display: grid; gap: 6px; }
.field label { font-weight: 600; color: #374151; font-size: .875rem; }
.input { width: 100%; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: .9rem; transition: border-color .2s ease, box-shadow .2s ease; background: #fff; }
.input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }
.help { font-size: .75rem; color: #6b7280; }

/* Upload */
.upload { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.file { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.file-name { font-size: .875rem; color: #374151; }
.file-name.muted { color: #9ca3af; }

/* Preview */
.preview { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
.preview img { height: 56px; object-fit: contain; display: block; }
.favicon-preview img { height: 32px; width: 32px; }

/* Buttons */
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: 1px solid transparent; background: transparent; color: #111827; transition: all .2s ease; }
.btn svg { flex-shrink: 0; }
.btn-primary { background: #3b82f6; color: #fff; border-color: rgba(59,130,246,.9); }
.btn-primary:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 6px 14px rgba(37,99,235,.25); }
.btn-outline { background: #fff; color: #111827; border-color: #d1d5db; }
.btn-outline:hover { background: #f9fafb; border-color: #9ca3af; }
.btn-danger { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.btn-danger:hover { background: #fee2e2; border-color: #fca5a5; }
.btn:disabled { opacity: .6; cursor: not-allowed; }

/* Messages */
.message { margin-top: 16px; padding: 12px 16px; border-radius: 8px; font-weight: 600; text-align: center; }
.message.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.message.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

/* Spinner */
.spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.45); border-top-color: white; border-radius: 999px; display: inline-block; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
