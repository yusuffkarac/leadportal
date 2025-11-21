<template>
  <div class="admin-about-page admin-page">
    <div class="page-content">
      <div class="page-header">
        <h1>Über-Seiten-Verwaltung</h1>
        <div class="header-actions">
          <button 
            class="btn btn-outline" 
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
            class="btn btn-outline" 
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
          <button class="btn btn-secondary" @click="showResetModal = true">
            <Icon icon="mdi:refresh" width="20" height="20" />
            Auf Standard zurücksetzen
          </button>
          <button class="btn btn-primary" style="display: none!important;" @click="showCreateModal = true">
            <Icon icon="mdi:plus" width="20" height="20" />
            Neuen Abschnitt hinzufügen
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label>Abschnitt:</label>
          <select v-model="selectedSection" @change="filterSections">
            <option value="">Alle Abschnitte</option>
            <option v-for="section in sections" :key="section" :value="section">
              {{ getSectionDisplayName(section) }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status:</label>
          <select v-model="selectedStatus" @change="filterSections">
            <option value="">Alle</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Suche:</label>
          <input 
            type="text" 
            v-model="searchQuery" 
            @input="filterSections"
            placeholder="Titel oder Inhalt suchen..."
          />
        </div>
      </div>

      <!-- About Sections List -->
      <div class="sections-list">
        <div v-if="loading" class="loading">Wird geladen...</div>
        <div v-else-if="filteredSections.length === 0" class="no-data">
          Keine Abschnitte gefunden.
        </div>
        <div v-else>
          <div class="section-item" v-for="section in filteredSections" :key="section.id">
            <div class="section-header">
              <div class="section-info">
                <span class="section-badge" :class="getSectionClass(section.section)">
                  {{ getSectionDisplayName(section.section) }}
                </span>
                <span class="status-badge" :class="{ active: section.isActive, inactive: !section.isActive }">
                  {{ section.isActive ? 'Aktiv' : 'Inaktiv' }}
                </span>
                <span class="sort-order">Reihenfolge: {{ section.sortOrder }}</span>
              </div>
              <div class="section-actions">
                <button class="btn btn-sm btn-secondary" @click="editSection(section)">
                  <Icon icon="mdi:pencil" width="16" height="16" />
                  Bearbeiten
                </button>
                <button class="btn btn-sm btn-danger" @click="deleteSection(section)">
                  <Icon icon="mdi:delete" width="16" height="16" />
                  Löschen
                </button>
              </div>
            </div>
            <div class="section-content">
              <h3 v-if="section.title">{{ section.title }}</h3>
              <p v-if="section.subtitle" class="subtitle">{{ section.subtitle }}</p>
              <p v-if="section.content">{{ section.content }}</p>
              <div v-if="section.imageUrl" class="image-preview">
                <img :src="section.imageUrl" :alt="section.title" />
              </div>
              <div v-if="section.data" class="data-preview">
                <strong>Benutzerdefinierte Daten:</strong>
                <pre>{{ JSON.stringify(section.data, null, 2) }}</pre>
              </div>
            </div>
            <div class="section-meta">
              <span>Erstellt: {{ formatDate(section.createdAt) }}</span>
              <span v-if="section.updatedAt !== section.createdAt">
                Aktualisiert: {{ formatDate(section.updatedAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ showCreateModal ? 'Neuen Abschnitt hinzufügen' : 'Abschnitt bearbeiten' }}</h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveSection">
            <div class="form-group">
              <label>Abschnittstyp *</label>
              <select v-model="formData.section" required>
                <option value="">Abschnitt auswählen</option>
                <option value="hero">Hero (Haupttitel)</option>
                <option value="mission">Mission</option>
                <option value="vision">Vision</option>
                <option value="team">Team</option>
                <option value="stats">Statistiken</option>
                <option value="features">Funktionen</option>
                <option value="values">Werte</option>
                <option value="history">Geschichte</option>
              </select>
            </div>
            <div class="form-group">
              <label>Titel</label>
              <input type="text" v-model="formData.title" />
            </div>
            <div class="form-group">
              <label>Untertitel</label>
              <input type="text" v-model="formData.subtitle" />
            </div>
            <div class="form-group">
              <label>Inhalt</label> 
              <textarea v-model="formData.content" rows="4"></textarea>
            </div>
            <div class="form-group">
              <label>Bild-URL</label>
              <input v-model="formData.imageUrl" placeholder="https://example.com/image.jpg" />
            </div>
            <div class="form-group">
              <label>Benutzerdefinierte Daten (JSON)</label>
              <textarea v-model="formData.dataString" rows="6" placeholder='{"key": "value"}'></textarea>
              <small>Für strukturierte Daten wie Statistiken, Funktionen im JSON-Format</small>
            </div>
            <div class="form-group">
              <label>Reihenfolge</label>
              <input type="number" v-model.number="formData.sortOrder" min="0" />
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.isActive" />
                <span class="checkmark"></span>
                Aktiv
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" @click="closeModal">Abbrechen</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Wird gespeichert...' : (showCreateModal ? 'Erstellen' : 'Aktualisieren') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Abschnitt löschen</h2>
          <button class="close-btn" @click="showDeleteModal = false">×</button>
        </div>
        <div class="modal-body">
          <p>Möchten Sie diesen Abschnitt wirklich löschen?</p>
          <p><strong>{{ sectionToDelete?.title || getSectionDisplayName(sectionToDelete?.section) }}</strong></p>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="showDeleteModal = false">Abbrechen</button>
            <button class="btn btn-danger" @click="confirmDelete" :disabled="deleting">
              {{ deleting ? 'Wird gelöscht...' : 'Löschen' }}
            </button>
          </div>
        </div>
      </div>
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
              <p>Diese Aktion <strong>löscht alle vorhandenen Abschnitte</strong> und lädt die Standard-Abschnitte.</p>
              <p>Diese Aktion <strong>kann nicht rückgängig gemacht werden</strong>. Möchten Sie wirklich fortfahren?</p>
            </div>
          </div>
          <div class="default-sections-info">
            <h4>Zu ladende Standard-Abschnitte:</h4>
            <ul>
              <li><strong>Hero:</strong> Haupttitel und Einführung</li>
              <li><strong>Mission:</strong> Unternehmensmission</li>
              <li><strong>Vision:</strong> Unternehmensvision</li>
              <li><strong>Statistiken:</strong> Erfolg in Zahlen</li>
              <li><strong>Team:</strong> Teamvorstellung</li>
              <li><strong>Funktionen:</strong> Plattformfunktionen</li>
            </ul>
            <p class="total-count">Gesamt: <strong>6 Abschnitte</strong></p>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="showResetModal = false">Abbrechen</button>
            <button class="btn btn-danger" @click="resetToDefaults" :disabled="resetting">
              {{ resetting ? 'Wird zurückgesetzt...' : 'Ja, zurücksetzen' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'
import { Icon } from '@iconify/vue'
import { useExportImport } from '@/composables/useExportImport.js'

// Data
const aboutSections = ref([])
const filteredSections = ref([])
const sections = ref([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const resetting = ref(false)

// Filters
const selectedSection = ref('')
const selectedStatus = ref('')
const searchQuery = ref('')

// Modals
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showResetModal = ref(false)
const sectionToDelete = ref(null)

// Form
const formData = ref({
  section: '',
  title: '',
  subtitle: '',
  content: '',
  imageUrl: '',
  dataString: '',
  isActive: true,
  sortOrder: 0
})
const editingSection = ref(null)

// Methods
async function loadSections() {
  try {
    loading.value = true
    const response = await axios.get('about/admin')
    aboutSections.value = response.data
    
    // Extract unique sections
    sections.value = [...new Set(aboutSections.value.map(section => section.section))]
    
    filterSections()
  } catch (error) {
    console.error('Abschnitte konnten nicht geladen werden:', error)
    alert('Abschnitte konnten nicht geladen werden')
  } finally {
    loading.value = false
  }
}

function filterSections() {
  let filtered = [...aboutSections.value]
  
  // Section filter
  if (selectedSection.value) {
    filtered = filtered.filter(section => section.section === selectedSection.value)
  }
  
  // Status filter
  if (selectedStatus.value) {
    const isActive = selectedStatus.value === 'active'
    filtered = filtered.filter(section => section.isActive === isActive)
  }
  
  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(section => 
      (section.title && section.title.toLowerCase().includes(query)) ||
      (section.subtitle && section.subtitle.toLowerCase().includes(query)) ||
      (section.content && section.content.toLowerCase().includes(query))
    )
  }
  
  filteredSections.value = filtered
}

function getSectionDisplayName(section) {
  const names = {
    hero: 'Hero (Haupttitel)',
    mission: 'Mission',
    vision: 'Vision',
    team: 'Team',
    stats: 'Statistiken',
    features: 'Funktionen',
    values: 'Werte',
    history: 'Geschichte'
  }
  return names[section] || section
}

function getSectionClass(section) {
  return `section-${section}`
}

function editSection(section) {
  editingSection.value = section
  formData.value = {
    section: section.section,
    title: section.title || '',
    subtitle: section.subtitle || '',
    content: section.content || '',
    imageUrl: section.imageUrl || '',
    dataString: section.data ? JSON.stringify(section.data, null, 2) : '',
    isActive: section.isActive,
    sortOrder: section.sortOrder
  }
  showEditModal.value = true
}

function deleteSection(section) {
  sectionToDelete.value = section
  showDeleteModal.value = true
}

async function saveSection() {
  try {
    saving.value = true
    
    // Parse JSON data if provided
    let parsedData = null
    if (formData.value.dataString.trim()) {
      try {
        parsedData = JSON.parse(formData.value.dataString)
      } catch (e) {
        alert('Ungültiges JSON-Format')
        return
      }
    }
    
    const payload = {
      ...formData.value,
      data: parsedData
    }
    delete payload.dataString
    
    if (showCreateModal.value) {
      await axios.post('about/admin', payload)
    } else {
      await axios.put(`about/admin/${editingSection.value.id}`, payload)
    }
    
    await loadSections()
    closeModal()
  } catch (error) {
    console.error('Abschnitt konnte nicht gespeichert werden:', error)
    alert('Abschnitt konnte nicht gespeichert werden')
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  try {
    deleting.value = true
    await axios.delete(`about/admin/${sectionToDelete.value.id}`)
    await loadSections()
    showDeleteModal.value = false
    sectionToDelete.value = null
  } catch (error) {
    console.error('Abschnitt konnte nicht gelöscht werden:', error)
    alert('Abschnitt konnte nicht gelöscht werden')
  } finally {
    deleting.value = false
  }
}

async function resetToDefaults() {
  try {
    resetting.value = true
    const response = await axios.post('about/admin/reset-defaults')
    await loadSections()
    showResetModal.value = false
    alert(`Erfolgreich! ${response.data.count} Standard-Abschnitte geladen.`)
  } catch (error) {
    console.error('Standard-Abschnitte konnten nicht geladen werden:', error)
    alert('Standard-Abschnitte konnten nicht geladen werden')
  } finally {
    resetting.value = false
  }
}

function closeModal() {
  showCreateModal.value = false
  showEditModal.value = false
  editingSection.value = null
  formData.value = {
    section: '',
    title: '',
    subtitle: '',
    content: '',
    imageUrl: '',
    dataString: '',
    isActive: true,
    sortOrder: 0
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('de-DE')
}

// Export/Import Functions
async function getAllAboutData() {
  try {
    const response = await axios.get('about/admin')
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      sections: response.data || []
    }
  } catch (err) {
    console.error('Fehler beim Abrufen der Abschnitte:', err)
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      sections: aboutSections.value
    }
  }
}

async function setAllAboutData(data) {
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('Ungültiges Datenformat')
    }

    // Bölümleri yükle
    if (data.sections && Array.isArray(data.sections)) {
      for (const section of data.sections) {
        if (section.id) {
          await axios.put(`about/admin/${section.id}`, section)
        } else {
          await axios.post('about/admin', section)
        }
      }
    }

    // Sayfayı yeniden yükle
    await loadSections()
  } catch (err) {
    console.error('Fehler beim Laden der Abschnitte:', err)
    throw err
  }
}

function validateAboutData(data) {
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
  getData: getAllAboutData,
  setData: setAllAboutData,
  validateData: validateAboutData,
  fileName: 'about-settings',
  fileExtension: 'json'
})

onMounted(() => {
  loadSections()
})
</script>

<style scoped>
.admin-about-page {
  width: 100%;
  margin: 0;
  padding: 0;
}

.page-content {
  max-width: 100%;
  margin: 0;
  padding: 0;
}

.page-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-shrink: 0;
}

.btn-outline {
  background: #fff;
  color: #111827;
  border: 1px solid #d1d5db;
}

.btn-outline:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-outline:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.filters {
  background: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  min-width: 200px;
}

.sections-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-item {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
  margin-bottom: 1.5rem;
}

.section-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.section-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.section-hero { background: #dbeafe; color: #1e40af; }
.section-mission { background: #dcfce7; color: #166534; }
.section-vision { background: #fef3c7; color: #92400e; }
.section-team { background: #fce7f3; color: #be185d; }
.section-stats { background: #f3e8ff; color: #7c3aed; }
.section-features { background: #ecfdf5; color: #059669; }
.section-values { background: #fef2f2; color: #dc2626; }
.section-history { background: #f0f9ff; color: #0284c7; }

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #dc2626;
}

.sort-order {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.section-actions {
  display: flex;
  gap: 8px;
}

.section-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.section-content .subtitle {
  font-size: 1rem;
  color: #6b7280;
  font-style: italic;
  margin-bottom: 12px;
}

.section-content p {
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 16px;
}

.image-preview img {
  max-width: 200px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 16px;
}

.data-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
}

.data-preview pre {
  font-size: 0.75rem;
  color: #374151;
  margin: 8px 0 0 0;
  white-space: pre-wrap;
}

.section-meta {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  gap: 24px;
  font-size: 0.75rem;
  color: #9ca3af;
}

.loading, .no-data {
  text-align: center;
  padding: 48px;
  color: #6b7280;
  font-size: 1.125rem;
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
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #f3f4f6;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #6b7280;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-group small {
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 4px;
  display: block;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto !important;
  margin: 0;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* Button Styles */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--text);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1f2937;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.875rem;
}

/* Reset Modal Styles */
.warning-message {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 20px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin-bottom: 24px;
}

.warning-message svg {
  color: #dc2626;
  flex-shrink: 0;
  margin-top: 4px;
}

.warning-message h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #dc2626;
  margin: 0 0 8px 0;
}

.warning-message p {
  color: #7f1d1d;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.warning-message p:last-child {
  margin-bottom: 0;
}

.default-sections-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

.default-sections-info h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
}

.default-sections-info ul {
  margin: 0 0 16px 0;
  padding-left: 20px;
}

.default-sections-info li {
  color: #6b7280;
  margin-bottom: 4px;
}

.total-count {
  color: #374151;
  font-weight: 500;
  margin: 0;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

/* Responsive */
@media (max-width: 768px) {
  .admin-about-page {
    padding: 0;
    max-width: 100%;
  }
  
  .filters {
    flex-direction: column;
  }
  
  .filter-group select,
  .filter-group input {
    min-width: auto;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .section-info {
    flex-wrap: wrap;
  }
  
  .section-meta {
    flex-direction: column;
    gap: 8px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: center;
  }
}
.btn-secondary{
  background: var(--text);
  color: white;
}
</style>
