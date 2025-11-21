<template>
  <div class="admin-custom-pages-page">
    <div class="page-content">
      <div class="page-header">
        <div>
          <h1>Seitenverwaltung</h1>
          <p class="page-subtitle">Erstellen und verwalten Sie dynamische Seiten</p>
        </div>
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
          <button class="btn btn-primary" @click="addNewPage">
            <Icon icon="mdi:plus" width="20" height="20" />
            Neue Seite hinzufügen
          </button>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="tabs-container" v-if="pages.length > 0">
        <div class="tabs-nav">
          <button
            v-for="(page, index) in pages"
            :key="page.id"
            class="tab-button"
            :class="{ active: activeTabIndex === index }"
            @click="activeTabIndex = index"
          >
            <span>{{ page.title || 'Neue Seite' }}</span>
            <button
              class="tab-close-btn"
              @click.stop="deletePage(page.id, index)"
              v-if="pages.length > 1"
            >
              <Icon icon="mdi:close" width="14" height="14" />
            </button>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <div v-if="activePage" class="page-form">
            <div class="form-section">
              <div class="field">
                <label>Titel *</label>
                <input
                  v-model="activePage.title"
                  type="text"
                  class="input"
                  placeholder="z.B.: Nutzungsbedingungen"
                  @input="generateSlug"
                />
              </div>

              <div class="field">
                <label>Slug (URL) *</label>
                <input
                  v-model="activePage.slug"
                  type="text"
                  class="input"
                  placeholder="nutzungsbedingungen"
                />
                <small class="help">URL-freundliches Format: Kleinbuchstaben, Zahlen und Bindestriche</small>
              </div>

              <div class="field">
                <label>Inhalt</label>
                <div ref="editorContainer" class="editor-container"></div>
                <small class="help">Bearbeiten Sie Ihren Inhalt mit dem Rich-Text-Editor</small>
              </div>

              <div class="field">
                <label>Fotos</label>
                <div class="image-upload-area">
                  <input
                    type="file"
                    ref="imageInput"
                    multiple
                    accept="image/*"
                    @change="handleImageUpload"
                    style="display: none"
                  />
                  <button
                    type="button"
                    class="btn btn-outline"
                    @click="$refs.imageInput.click()"
                    :disabled="uploadingImages"
                  >
                    <Icon icon="mdi:image-plus" width="16" height="16" />
                    {{ uploadingImages ? 'Wird hochgeladen...' : 'Foto hinzufügen' }}
                  </button>
                  <div v-if="activePage.images && activePage.images.length > 0" class="image-gallery">
                    <div
                      v-for="(image, idx) in activePage.images"
                      :key="idx"
                      class="image-item"
                    >
                      <img :src="image" :alt="`Image ${idx + 1}`" />
                      <button
                        class="image-remove-btn"
                        @click="removeImage(idx)"
                        type="button"
                      >
                        <Icon icon="mdi:close" width="16" height="16" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="field">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="activePage.isActive"
                  />
                  <span>Seite aktiv</span>
                </label>
              </div>

              <div class="form-actions">
                <button
                  class="btn btn-outline"
                  @click="goToPage"
                  :disabled="!activePage.slug || activePage.id?.startsWith('new-')"
                  title="Seite anzeigen"
                >
                  <Icon icon="mdi:open-in-new" width="16" height="16" />
                  Weiterleiten
                </button>
                <button
                  class="btn btn-primary"
                  @click="savePage"
                  :disabled="saving || !activePage.title || !activePage.slug"
                >
                  <span v-if="saving" class="spinner-sm"></span>
                  <span v-else>Speichern</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <Icon icon="mdi:file-document-outline" width="64" height="64" />
        <h2>Noch keine Seiten vorhanden</h2>
        <p>Klicken Sie auf die Schaltfläche oben, um eine neue Seite hinzuzufügen</p>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Seite löschen</h2>
          <button class="close-btn" @click="showDeleteModal = false">×</button>
        </div>
        <div class="modal-body">
          <p>Möchten Sie diese Seite wirklich löschen?</p>
          <p><strong>{{ pageToDelete?.title }}</strong></p>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="showDeleteModal = false">Abbrechen</button>
            <button class="btn btn-danger" @click="confirmDelete" :disabled="deleting">
              {{ deleting ? 'Wird gelöscht...' : 'Löschen' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import axios from '@/utils/axios'
import { Icon } from '@iconify/vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { useExportImport } from '@/composables/useExportImport.js'
import { useAlert } from '@/composables/useAlert.js'

const { success, error: showError } = useAlert()

// Data
const pages = ref([])
const activeTabIndex = ref(0)
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const uploadingImages = ref(false)
const showDeleteModal = ref(false)
const pageToDelete = ref(null)
const deleteIndex = ref(-1)

// Editor
const editorContainer = ref(null)
let quillEditor = null

// Computed
const activePage = ref(null)

// Methods
function generateSlug() {
  if (activePage.value && activePage.value.title) {
    activePage.value.slug = activePage.value.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
}

async function loadPages() {
  try {
    loading.value = true
    const response = await axios.get('custom-pages')
    pages.value = response.data || []
    
    if (pages.value.length > 0) {
      activeTabIndex.value = 0
      await nextTick()
      setActivePage(0)
    }
  } catch (error) {
    console.error('Seiten konnten nicht geladen werden:', error)
    showError('Seiten konnten nicht geladen werden')
  } finally {
    loading.value = false
  }
}

function addNewPage() {
  const newPage = {
    id: 'new-' + Date.now(),
    title: '',
    content: '',
    images: [],
    slug: '',
    isActive: true
  }
  pages.value.push(newPage)
  activeTabIndex.value = pages.value.length - 1
  nextTick(() => {
    setActivePage(activeTabIndex.value)
  })
}

function setActivePage(index) {
  if (index >= 0 && index < pages.value.length) {
    // Save current editor content before switching
    if (quillEditor && activePage.value) {
      activePage.value.content = quillEditor.root.innerHTML
    }
    
    activePage.value = pages.value[index]
    
    // Initialize or update Quill editor
    nextTick(() => {
      if (editorContainer.value) {
        if (!quillEditor) {
          quillEditor = new Quill(editorContainer.value, {
            theme: 'snow',
            modules: {
              toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'image'],
                ['clean']
              ]
            }
          })
          
          // Watch for content changes
          quillEditor.on('text-change', () => {
            if (activePage.value) {
              activePage.value.content = quillEditor.root.innerHTML
            }
          })
        }
        
        // Update editor content when switching tabs
        if (quillEditor && activePage.value) {
          quillEditor.root.innerHTML = activePage.value.content || ''
        }
      }
    })
  }
}

async function handleImageUpload(event) {
  const files = event.target.files
  if (!files || files.length === 0) return

  uploadingImages.value = true
  try {
    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i])
    }

    const response = await axios.post('custom-pages/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (activePage.value) {
      if (!activePage.value.images) {
        activePage.value.images = []
      }
      activePage.value.images = [...activePage.value.images, ...response.data.images]
    }
  } catch (error) {
    console.error('Fehler beim Hochladen des Fotos:', error)
    showError('Fotos konnten nicht hochgeladen werden')
  } finally {
    uploadingImages.value = false
    if (event.target) {
      event.target.value = ''
    }
  }
}

function removeImage(index) {
  if (activePage.value && activePage.value.images) {
    activePage.value.images.splice(index, 1)
  }
}

function deletePage(pageId, index) {
  pageToDelete.value = pages.value[index]
  deleteIndex.value = index
  showDeleteModal.value = true
}

async function confirmDelete() {
  try {
    deleting.value = true
    
    // If it's a new page (not saved yet), just remove from array
    if (pageToDelete.value.id.startsWith('new-')) {
      pages.value.splice(deleteIndex.value, 1)
      if (activeTabIndex.value >= pages.value.length) {
        activeTabIndex.value = Math.max(0, pages.value.length - 1)
      }
      if (pages.value.length > 0) {
        setActivePage(activeTabIndex.value)
      } else {
        activePage.value = null
        if (quillEditor) {
          quillEditor = null
        }
      }
    } else {
      await axios.delete(`custom-pages/${pageToDelete.value.id}`)
      await loadPages()
    }
    
    showDeleteModal.value = false
    pageToDelete.value = null
  } catch (error) {
    console.error('Seite konnte nicht gelöscht werden:', error)
    showError('Seite konnte nicht gelöscht werden')
  } finally {
    deleting.value = false
  }
}

async function savePage() {
  if (!activePage.value || !activePage.value.title || !activePage.value.slug) {
    showError('Titel und Slug sind erforderlich')
    return
  }

  try {
    saving.value = true
    
    // Get content from editor
    if (quillEditor) {
      activePage.value.content = quillEditor.root.innerHTML
    }

    const payload = {
      title: activePage.value.title,
      content: activePage.value.content || null,
      images: activePage.value.images && activePage.value.images.length > 0 
        ? activePage.value.images 
        : null,
      slug: activePage.value.slug,
      isActive: activePage.value.isActive
    }

    if (activePage.value.id.startsWith('new-')) {
      // Create new page
      const response = await axios.post('custom-pages', payload)
      activePage.value.id = response.data.page.id
    } else {
      // Update existing page
      await axios.put(`custom-pages/${activePage.value.id}`, payload)
    }

    await loadPages()
    success('Seite erfolgreich gespeichert')
  } catch (error) {
    console.error('Seite konnte nicht gespeichert werden:', error)
    const errorMsg = error.response?.data?.message || 'Seite konnte nicht gespeichert werden'
    showError(errorMsg)
  } finally {
    saving.value = false
  }
}

function goToPage() {
  if (!activePage.value || !activePage.value.slug) {
    showError('Seiten-Slug nicht gefunden')
    return
  }
  
  // In neuem Tab öffnen
  const url = `/${activePage.value.slug}`
  window.open(url, '_blank')
}

// Watch for tab changes
watch(activeTabIndex, (newIndex) => {
  setActivePage(newIndex)
})

// Export/Import Functions
async function getAllPagesData() {
  try {
    const response = await axios.get('custom-pages')
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      pages: response.data || []
    }
  } catch (err) {
    console.error('Fehler beim Abrufen der Seiten:', err)
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      pages: pages.value
    }
  }
}

async function setAllPagesData(data) {
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('Ungültiges Datenformat')
    }

    // Seiten laden
    if (data.pages && Array.isArray(data.pages)) {
      for (const page of data.pages) {
        const payload = {
          title: page.title,
          content: page.content || null,
          images: page.images || null,
          slug: page.slug,
          isActive: page.isActive !== undefined ? page.isActive : true
        }

        if (page.id && !page.id.startsWith('new-')) {
          // Aktuelle Seite aktualisieren
          await axios.put(`custom-pages/${page.id}`, payload)
        } else {
          // Neue Seite erstellen
          await axios.post('custom-pages', payload)
        }
      }
    }

    // Seite neu laden
    await loadPages()
  } catch (err) {
    console.error('Fehler beim Laden der Seiten:', err)
    throw err
  }
}

function validatePagesData(data) {
  if (!data || typeof data !== 'object') {
    return 'Ungültiges Datenformat'
  }
  
  if (!data.version) {
    return 'Fehlende Versionsinformation'
  }
  
  if (!data.pages || !Array.isArray(data.pages)) {
    return 'Ungültiges Seitenformat'
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
  getData: getAllPagesData,
  setData: setAllPagesData,
  validateData: validatePagesData,
  fileName: 'custom-pages',
  fileExtension: 'json'
})

onMounted(() => {
  loadPages()
})

onUnmounted(() => {
  if (quillEditor) {
    quillEditor = null
  }
})
</script>

<style scoped>
.admin-custom-pages-page {
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
  margin: 0 0 8px;
}

.page-subtitle {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Tabs */
.tabs-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 24px;
}

.tabs-nav {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  overflow-x: auto;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: none;
  border: none;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  position: relative;
}

.tab-button:hover {
  color: #475569;
  background: #f1f5f9;
}

.tab-button.active {
  color: #1f2937;
  border-bottom-color: #3b82f6;
  background: white;
}

.tab-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
}

.tab-close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #dc2626;
}

.tab-content {
  padding: 32px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-form {
  max-width: 1000px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: #fff;
}

.input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.help {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Editor */
.editor-container {
  min-height: 300px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

/* Image Upload */
.image-upload-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.image-remove-btn:hover {
  background: rgba(220, 38, 38, 1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-outline:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 64px 32px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-state h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 16px 0 8px;
}

.empty-state p {
  color: #6b7280;
  font-size: 1rem;
}

/* Modal */
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
  max-width: 500px;
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
  line-height: 1;
}

.close-btn:hover {
  color: #6b7280;
}

.modal-body {
  padding: 24px;
}

.modal-body p {
  margin: 8px 0;
  color: #374151;
}
</style>

