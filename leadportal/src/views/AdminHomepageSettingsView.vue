<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useAlert } from '@/composables/useAlert'
import { useExportImport } from '@/composables/useExportImport.js'
import { Icon } from '@iconify/vue'

const defaultContent = {
  hero: {
    eyebrow: 'Versicherungs-Lead-Marktplatz',
    title: "Deutschlands führender",
    highlight: 'Versicherungs-Lead',
    titleSuffix: 'Marktplatz',
    subtitle: 'LeadPortal bietet Versicherungsmaklern professionelle Auktionsinfrastruktur, verifizierte Lead-Qualität und Live-Gebotsverfolgung.',
    primaryText: 'Jetzt registrieren',
    primaryLink: '/login',
    secondaryText: 'Live-Auktionen ansehen',
    secondaryLink: '/leads',
    backgroundImage: '',
    backgroundOpacity: 0.75
  },
  featureHeading: "Warum LeadPortal wählen?",
  features: [
    {
      icon: 'mdi:scale-balance',
      title: 'Faire Auktionen',
      description: 'Transparente Regeln und Echtzeit-Gebote mit flexiblen Auktionsmodellen.'
    },
    {
      icon: 'mdi:shield-check',
      title: 'Verifizierte Qualität',
      description: 'Jeder Lead durchläuft Qualitäts- und Verifizierungsprüfungen vor der Veröffentlichung.'
    },
    {
      icon: 'mdi:account-group',
      title: 'Zuverlässiger Partner',
      description: 'Verifizierungsprozess und Bewertungssystem für unsere Makler-Community.'
    }
  ],
  showcase: {
    eyebrow: 'Showcase-Leads',
    title: 'Aktuelle Auktionen',
    ctaText: 'Alle anzeigen',
    ctaLink: '/leads'
  },
  statsHeading: {
    eyebrow: 'Vertrauensvolle Zahlen',
    title: 'Unsere Makler-Community wächst weiter'
  },
  stats: [
    { value: '2.500+', label: 'Aktive Makler' },
    { value: '15.000+', label: 'Verkaufte Leads' },
    { value: '98%', label: 'Zufriedenheit' },
    { value: '€2.1M', label: 'Gesamtvolumen' }
  ],
  cta: {
    title: 'Bereit loszulegen?',
    subtitle: 'Treten Sie der LeadPortal-Community bei, erhalten Sie Zugang zu verifizierten Leads und wachsen Sie Ihr Geschäft sicher.',
    primaryText: 'Kostenlos registrieren',
    primaryLink: '/login',
    secondaryText: 'Leads durchsuchen',
    secondaryLink: '/leads'
  }
}

const form = ref(JSON.parse(JSON.stringify(defaultContent)))
const loading = ref(false)
const saving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const showResetModal = ref(false)
const uploadingHeroImage = ref(false)
const heroImagePreview = ref('')
const { showAlert } = useAlert()

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function mergeContent(data) {
  return {
    hero: { 
      ...defaultContent.hero, 
      ...(data?.hero || {}),
      backgroundImage: data?.hero?.backgroundImage ?? defaultContent.hero.backgroundImage,
      backgroundOpacity: data?.hero?.backgroundOpacity ?? defaultContent.hero.backgroundOpacity
    },
    featureHeading: data?.featureHeading || defaultContent.featureHeading,
    features: Array.isArray(data?.features) && data.features.length ? data.features : [...defaultContent.features],
    showcase: { ...defaultContent.showcase, ...(data?.showcase || {}) },
    statsHeading: { ...defaultContent.statsHeading, ...(data?.statsHeading || {}) },
    stats: Array.isArray(data?.stats) && data.stats.length ? data.stats : [...defaultContent.stats],
    cta: { ...defaultContent.cta, ...(data?.cta || {}) }
  }
}

async function loadHomepageSettings() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const { data } = await axios.get('/api/settings/homepage', { headers: authHeaders() })
    form.value = mergeContent(data)
    if (form.value.hero.backgroundImage) {
      heroImagePreview.value = form.value.hero.backgroundImage
    }
  } catch (error) {
    console.error('Homepage settings load error:', error)
    errorMessage.value = 'Homepage-Einstellungen konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

function addFeature() {
  form.value.features.push({
    icon: 'mdi:information',
    title: '',
    description: ''
  })
}

function removeFeature(index) {
  if (form.value.features.length > 1) {
    form.value.features.splice(index, 1)
  }
}

function addStat() {
  form.value.stats.push({
    value: '',
    label: ''
  })
}

function removeStat(index) {
  if (form.value.stats.length > 1) {
    form.value.stats.splice(index, 1)
  }
}

function resetToDefaults() {
  showResetModal.value = true
}

async function confirmReset() {
  try {
    form.value = JSON.parse(JSON.stringify(defaultContent))
    successMessage.value = 'Einstellungen auf Standardwerte zurückgesetzt. Wird gespeichert...'
    errorMessage.value = ''
    showResetModal.value = false
    
    // Automatisch speichern
    await saveHomepageSettings()
  } catch (error) {
    console.error('Reset error:', error)
    errorMessage.value = 'Beim Zurücksetzen der Einstellungen ist ein Fehler aufgetreten.'
  }
}

async function handleHeroImageUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  // Dosya boyutu kontrolü (10MB)
  if (file.size > 10 * 1024 * 1024) {
    showAlert('Dateigröße muss kleiner als 10MB sein', 'error')
    return
  }

  // Dosya tipi kontrolü
  if (!file.type.startsWith('image/')) {
    showAlert('Bitte wählen Sie eine gültige Bilddatei', 'error')
    return
  }

  uploadingHeroImage.value = true
  errorMessage.value = ''

  try {
    const formData = new FormData()
    formData.append('heroImage', file)

    const { data } = await axios.post('/api/settings/homepage/upload-hero-image', formData, {
      headers: {
        ...authHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    })

    form.value.hero.backgroundImage = data.imageUrl
    heroImagePreview.value = data.imageUrl
    showAlert('Hero-Bild erfolgreich hochgeladen', 'success')
  } catch (error) {
    console.error('Fehler beim Hochladen des Hero-Bildes:', error)
    errorMessage.value = error.response?.data?.error || 'Beim Hochladen des Bildes ist ein Fehler aufgetreten.'
    showAlert(errorMessage.value, 'error')
  } finally {
    uploadingHeroImage.value = false
    // Input'u temizle
    const input = document.getElementById('hero-image-file')
    if (input) input.value = ''
  }
}

function clearHeroImage() {
  form.value.hero.backgroundImage = ''
  heroImagePreview.value = ''
  const input = document.getElementById('hero-image-file')
  if (input) input.value = ''
}

async function saveHomepageSettings() {
  saving.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const payload = {
      hero: form.value.hero,
      featureHeading: form.value.featureHeading,
      features: form.value.features,
      showcase: form.value.showcase,
      statsHeading: form.value.statsHeading,
      stats: form.value.stats,
      cta: form.value.cta
    }

    const { data } = await axios.post('/api/settings/homepage', payload, { headers: authHeaders() })
    successMessage.value = data?.message || 'Homepage-Einstellungen gespeichert.'
    form.value = mergeContent(data?.homepage)
    if (form.value.hero.backgroundImage) {
      heroImagePreview.value = form.value.hero.backgroundImage
    }
  } catch (error) {
    console.error('Homepage settings save error:', error)
    errorMessage.value = error.response?.data?.message || 'Einstellungen konnten nicht gespeichert werden.'
  } finally {
    saving.value = false
  }
}

// Export/Import Functions
async function getAllHomepageData() {
  try {
    const { data } = await axios.get('/api/settings/homepage', { headers: authHeaders() })
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      homepage: data || {}
    }
  } catch (err) {
    console.error('Fehler beim Abrufen der Homepage-Einstellungen:', err)
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      homepage: form.value
    }
  }
}

async function setAllHomepageData(data) {
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('Ungültiges Datenformat')
    }

    // Homepage ayarlarını yükle
    if (data.homepage) {
      form.value = mergeContent(data.homepage)
      if (form.value.hero.backgroundImage) {
        heroImagePreview.value = form.value.hero.backgroundImage
      }
      
      // Otomatik kaydet
      await saveHomepageSettings()
    }
  } catch (err) {
    console.error('Fehler beim Laden der Homepage-Einstellungen:', err)
    throw err
  }
}

function validateHomepageData(data) {
  if (!data || typeof data !== 'object') {
    return 'Ungültiges Datenformat'
  }
  
  if (!data.version) {
    return 'Fehlende Versionsinformation'
  }
  
  return true
}

// Export/Import composable
const { 
  exportData: exportSettings, 
  triggerImport, 
  isExporting, 
  isImporting 
} = useExportImport({
  getData: getAllHomepageData,
  setData: setAllHomepageData,
  validateData: validateHomepageData,
  fileName: 'homepage-settings',
  fileExtension: 'json'
})

onMounted(loadHomepageSettings)
</script>

<template>
  <section class="section">
    <header class="section-header">
      <div>
        <h2>Homepage-Einstellungen</h2>
        <p class="muted">
          Bearbeiten Sie Hero-, Showcase-, Feature- und CTA-Texte, die auf der Homepage angezeigt werden.
        </p>
      </div>
      <div class="header-actions">
        <button 
          class="btn-outline" 
          @click="exportSettings" 
          :disabled="isExporting"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span v-if="isExporting">Wird exportiert...</span>
          <span v-else>Export</span>
        </button>
        <button 
          class="btn-outline" 
          @click="triggerImport" 
          :disabled="isImporting"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span v-if="isImporting">Wird importiert...</span>
          <span v-else>Import</span>
        </button>
        <button class="btn-secondary" @click="resetToDefaults" :disabled="saving">
          Auf Standard zurücksetzen
        </button>
        <button class="btn" @click="saveHomepageSettings" :disabled="saving">
          {{ saving ? 'Wird gespeichert…' : 'Einstellungen speichern' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="message info">Einstellungen werden geladen…</div>
    <div v-if="errorMessage" class="message error">{{ errorMessage }}</div>
    <div v-if="successMessage" class="message success" style='margin-bottom:1%'>{{ successMessage }}</div>

    

    <div class="settings-grid">
      <!-- Hero -->
      <article class="card">
        <h3>Hero-Bereich</h3>
        <div class="grid two-cols">
          <div class="stack">
            <label>Überschrift</label>
            <input class="input" v-model="form.hero.eyebrow" placeholder="z.B. Versicherungs-Lead-Marktplatz" />
          </div>
          <div class="stack">
            <label>Titel (links)</label>
            <input class="input" v-model="form.hero.title" placeholder="z.B. Deutschlands führender" />
          </div>
          <div class="stack">
            <label>Hervorgehobenes Wort</label>
            <input class="input" v-model="form.hero.highlight" placeholder="z.B. Versicherungs-Lead" />
          </div>
          <div class="stack">
            <label>Titel (rechts)</label>
            <input class="input" v-model="form.hero.titleSuffix" placeholder="z.B. Marktplatz" />
          </div>
        </div>
        <div class="stack">
          <label>Beschreibung</label>
          <textarea class="input" v-model="form.hero.subtitle" rows="3" />
        </div>
        <div class="grid two-cols">
          <div class="stack">
            <label>Primärer CTA-Text</label>
            <input class="input" v-model="form.hero.primaryText" placeholder="z.B. Jetzt registrieren" />
          </div>
          <div class="stack">
            <label>Primärer CTA-Link</label>
            <input class="input" v-model="form.hero.primaryLink" placeholder="z.B. /login" />
          </div>
          <div class="stack">
            <label>Sekundärer CTA-Text</label>
            <input class="input" v-model="form.hero.secondaryText" placeholder="z.B. Live-Auktionen ansehen" />
          </div>
          <div class="stack">
            <label>Sekundärer CTA-Link</label>
            <input class="input" v-model="form.hero.secondaryLink" placeholder="z.B. /leads" />
          </div>
        </div>
        <div class="stack">
          <label>Hintergrundbild</label>
          <div class="upload-section">
            <div class="upload-controls">
              <input 
                id="hero-image-file" 
                type="file" 
                accept="image/*" 
                class="file-input" 
                @change="handleHeroImageUpload"
                :disabled="uploadingHeroImage"
              />
              <label for="hero-image-file" class="btn-secondary" :class="{ 'disabled': uploadingHeroImage }">
                {{ uploadingHeroImage ? 'Wird hochgeladen...' : 'Datei auswählen' }}
              </label>
              <input 
                class="input" 
                v-model="form.hero.backgroundImage" 
                placeholder="Oder Bild-URL eingeben (z.B. /images/mainHandshake.jpg)"
                style="flex: 1;"
              />
              <button 
                v-if="form.hero.backgroundImage" 
                type="button" 
                class="btn-secondary" 
                @click="clearHeroImage"
                style="margin-left: 8px;"
              >
                Löschen
              </button>
            </div>
            <small class="muted small">Sie können eine Datei hochladen oder eine URL eingeben. Wenn leer gelassen, wird das Standard-Bild verwendet. (Max. 10MB)</small>
          </div>
          <div v-if="heroImagePreview || form.hero.backgroundImage" class="image-preview">
            <img 
              :src="heroImagePreview || form.hero.backgroundImage" 
              alt="Hero-Bild-Vorschau"
              @error="heroImagePreview = ''"
            />
          </div>
        </div>
        <div class="stack">
          <label>Bild-Opazität (0-1)</label>
          <input 
            type="number" 
            class="input" 
            v-model.number="form.hero.backgroundOpacity" 
            min="0" 
            max="1" 
            step="0.05"
            placeholder="0.75" 
          />
          <small class="muted small">Geben Sie einen Wert zwischen 0 (vollständig transparent) und 1 (vollständig opak) ein.</small>
        </div>
      </article>

      <!-- Features -->
      <article class="card">
        <div class="card-header">
          <div>
            <h3>Hervorgehobene Funktionen</h3>
            <p class="muted small">Bearbeiten Sie die drei Feature-Karten auf der Homepage.</p>
          </div>
          <button class="btn-secondary" type="button" @click="addFeature">Funktion hinzufügen</button>
        </div>
        <div class="stack">
          <label>Titel</label>
          <input class="input" v-model="form.featureHeading" placeholder="z.B. Warum LeadPortal wählen?" />
        </div>
        <div class="feature-list">
          <div class="feature-item" v-for="(feature, index) in form.features" :key="index">
            <div class="feature-header">
              <strong>Funktion {{ index + 1 }}</strong>
              <button
                class="link"
                type="button"
                @click="removeFeature(index)"
                :disabled="form.features.length === 1"
              >
                Löschen
              </button>
            </div>
            <div class="grid two-cols">
              <div class="stack">
                <label>Iconify-ID</label>
                <input class="input" v-model="feature.icon" placeholder="z.B. mdi:shield-check" />
                <small class="muted small">Geben Sie eine Icon-ID im Iconify-Format ein.</small>
              </div>
              <div class="stack">
                <label>Titel</label>
                <input class="input" v-model="feature.title" placeholder="z.B. Verifizierte Qualität" />
              </div>
            </div>
            <div class="stack">
              <label>Beschreibung</label>
              <textarea class="input" v-model="feature.description" rows="2" />
            </div>
          </div>
        </div>
      </article>

      <!-- Showcase -->
      <article class="card">
        <h3>Showcase-Bereich</h3>
        <div class="grid two-cols">
          <div class="stack">
            <label>Überschrift</label>
            <input class="input" v-model="form.showcase.eyebrow" placeholder="z.B. Showcase-Leads" />
          </div>
          <div class="stack">
            <label>Titel</label>
            <input class="input" v-model="form.showcase.title" placeholder="z.B. Aktuelle Auktionen" />
          </div>
        </div>
        <div class="grid two-cols">
          <div class="stack">
            <label>Button-Text</label>
            <input class="input" v-model="form.showcase.ctaText" placeholder="z.B. Alle anzeigen" />
          </div>
          <div class="stack">
            <label>Button-Link</label>
            <input class="input" v-model="form.showcase.ctaLink" placeholder="z.B. /leads" />
          </div>
        </div>
      </article>

      <!-- Stats -->
      <article class="card">
        <div class="card-header">
          <div>
            <h3>Statistiken</h3>
            <p class="muted small">Aktualisieren Sie die Statistik-Karten in der Vertrauensnachricht.</p>
          </div>
          <button class="btn-secondary" type="button" @click="addStat">Statistik hinzufügen</button>
        </div>
        <div class="grid two-cols">
          <div class="stack">
            <label>Überschrift</label>
            <input class="input" v-model="form.statsHeading.eyebrow" placeholder="z.B. Vertrauensvolle Zahlen" />
          </div>
          <div class="stack">
            <label>Titel</label>
            <input class="input" v-model="form.statsHeading.title" placeholder="z.B. Unsere Makler-Community wächst weiter" />
          </div>
        </div>
        <div class="stats-list">
          <div class="stat-item" v-for="(stat, index) in form.stats" :key="index">
            <div class="stat-header">
              <strong>Statistik {{ index + 1 }}</strong>
              <button
                class="link"
                type="button"
                @click="removeStat(index)"
                :disabled="form.stats.length === 1"
              >
                Löschen
              </button>
            </div>
            <div class="grid two-cols">
              <div class="stack">
                <label>Wert</label>
                <input class="input" v-model="stat.value" placeholder="z.B. 2.500+" />
              </div>
              <div class="stack">
                <label>Beschriftung</label>
                <input class="input" v-model="stat.label" placeholder="z.B. Aktive Makler" />
              </div>
            </div>
          </div>
        </div>
      </article>

      <!-- CTA -->
      <article class="card">
        <h3>Unterer CTA-Bereich</h3>
        <div class="stack">
          <label>Titel</label>
          <input class="input" v-model="form.cta.title" placeholder="z.B. Bereit loszulegen?" />
        </div>
        <div class="stack">
          <label>Beschreibung</label>
          <textarea class="input" v-model="form.cta.subtitle" rows="2" />
        </div>
        <div class="grid two-cols">
          <div class="stack">
            <label>Primärer CTA-Text</label>
            <input class="input" v-model="form.cta.primaryText" placeholder="z.B. Kostenlos registrieren" />
          </div>
          <div class="stack">
            <label>Primärer CTA-Link</label>
            <input class="input" v-model="form.cta.primaryLink" placeholder="z.B. /login" />
          </div>
          <div class="stack">
            <label>Sekundärer CTA-Text</label>
            <input class="input" v-model="form.cta.secondaryText" placeholder="z.B. Leads durchsuchen" />
          </div>
          <div class="stack">
            <label>Sekundärer CTA-Link</label>
            <input class="input" v-model="form.cta.secondaryLink" placeholder="z.B. /leads" />
          </div>
        </div>
      </article>
    </div>

    <!-- Reset to Defaults Confirmation Modal -->
    <div v-if="showResetModal" class="modal-overlay" @click="showResetModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Auf Standard zurücksetzen</h2>
          <button class="close-btn" @click="showResetModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="warning-message">
            <Icon icon="mdi:alert-triangle" width="48" height="48" />
            <div>
              <h3>Achtung!</h3>
              <p>Diese Aktion <strong>löscht alle Homepage-Einstellungen</strong> und lädt die Standardeinstellungen.</p>
              <p>Diese Aktion <strong>kann nicht rückgängig gemacht werden</strong>. Möchten Sie wirklich fortfahren?</p>
            </div>
          </div>
          <div class="default-sections-info">
            <h4>Zurückzusetzende Einstellungen:</h4>
            <ul>
              <li><strong>Hero-Bereich:</strong> Haupttitel und Einführungstexte</li>
              <li><strong>Funktionen:</strong> Hervorgehobene Feature-Karten</li>
              <li><strong>Showcase:</strong> Lead-Showcase-Bereich</li>
              <li><strong>Statistiken:</strong> Vertrauensvolle Zahlen</li>
              <li><strong>CTA-Bereich:</strong> Untere Call-to-Action-Buttons</li>
            </ul>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="showResetModal = false">Abbrechen</button>
            <button class="btn btn-danger" @click="confirmReset" :disabled="saving">
              {{ saving ? 'Wird zurückgesetzt...' : 'Ja, zurücksetzen' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section {
  width: 100%;
  margin: 0;
  padding: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-outline {
  background: #fff;
  color: #111827;
  border: 1px solid #d1d5db;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-outline:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-outline:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.muted {
  color: #64748b;
}

.small {
  font-size: 0.85rem;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: 0 18px 36px -28px rgba(15, 23, 42, 0.35);
}

.card h3 {
  margin: 0;
  color: #0f172a;
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.grid.two-cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input {
  width: 90%;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

textarea.input {
  resize: vertical;
  min-height: 80px;
}

.btn {
  background: #0f172a;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn:hover:not(:disabled) {
  background: #1f2937;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.link {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-weight: 600;
}

.feature-list,
.stats-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item,
.stat-item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item .grid.two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
  width: 100%;
}

.stat-item .stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.stat-item .stack label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 2px;
}

.stat-item .stack .input {
  width: 90%;
  box-sizing: border-box;
}

.feature-header,
.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.message {
  border-radius: 12px;
  padding: 14px 18px;
  font-weight: 500;
}

.message.info {
  background: #eff6ff;
  color: #1d4ed8;
}

.message.error {
  background: #fef2f2;
  color: #b91c1c;
}

.message.success {
  background: #ecfdf5;
  color: #047857;
}

@media (max-width: 768px) {
  .grid.two-cols {
    grid-template-columns: 1fr;
  }
  .section{
    padding: 0!important;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .header-actions .btn,
  .header-actions .btn-secondary,
  .header-actions .btn-outline {
    flex: 1;
    min-width: 0;
  }

  .card {
    padding: 20px;
  }
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
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  color: #374151;
  background: #f3f4f6;
}

.modal-body {
  padding: 24px;
}

.warning-message {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 24px;
  padding: 16px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
}

.warning-message svg {
  color: #f59e0b;
  flex-shrink: 0;
}

.warning-message h3 {
  margin: 0 0 8px 0;
  color: #92400e;
  font-size: 1.125rem;
  font-weight: 600;
}

.warning-message p {
  margin: 0 0 8px 0;
  color: #92400e;
  line-height: 1.5;
}

.warning-message p:last-child {
  margin-bottom: 0;
}

.default-sections-info {
  margin-bottom: 24px;
}

.default-sections-info h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
}

.default-sections-info ul {
  margin: 0;
  padding-left: 20px;
  color: #6b7280;
}

.default-sections-info li {
  margin-bottom: 6px;
  line-height: 1.4;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-danger {
  background: #dc2626;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.file-input {
  display: none;
}

.image-preview {
  margin-top: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  max-width: 400px;
  background: #f8fafc;
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
  max-height: 200px;
  object-fit: cover;
}

.btn-secondary.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal {
    max-width: none;
  }
  
  .warning-message {
    flex-direction: column;
    text-align: center;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .form-actions .btn {
    width: 100%;
  }

  .upload-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .upload-controls .btn-secondary,
  .upload-controls .input {
    width: 100%;
    margin-left: 0 !important;
  }
}
</style>
