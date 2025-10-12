<template>
  <div class="admin-about-page">
    <div class="page-content">
      <div class="page-header">
        <h1>Hakkında Sayfası Yönetimi</h1>
        <div class="header-actions">
          <button class="btn btn-secondary" @click="showResetModal = true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Varsayılana Sıfırla
          </button>
          <button class="btn btn-primary" style="display: none!important;" @click="showCreateModal = true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Yeni Bölüm Ekle
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label>Bölüm:</label>
          <select v-model="selectedSection" @change="filterSections">
            <option value="">Tüm Bölümler</option>
            <option v-for="section in sections" :key="section" :value="section">
              {{ getSectionDisplayName(section) }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>Durum:</label>
          <select v-model="selectedStatus" @change="filterSections">
            <option value="">Tümü</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Arama:</label>
          <input 
            type="text" 
            v-model="searchQuery" 
            @input="filterSections"
            placeholder="Başlık veya içerik ara..."
          />
        </div>
      </div>

      <!-- About Sections List -->
      <div class="sections-list">
        <div v-if="loading" class="loading">Yükleniyor...</div>
        <div v-else-if="filteredSections.length === 0" class="no-data">
          Hiç bölüm bulunamadı.
        </div>
        <div v-else>
          <div class="section-item" v-for="section in filteredSections" :key="section.id">
            <div class="section-header">
              <div class="section-info">
                <span class="section-badge" :class="getSectionClass(section.section)">
                  {{ getSectionDisplayName(section.section) }}
                </span>
                <span class="status-badge" :class="{ active: section.isActive, inactive: !section.isActive }">
                  {{ section.isActive ? 'Aktif' : 'Pasif' }}
                </span>
                <span class="sort-order">Sıra: {{ section.sortOrder }}</span>
              </div>
              <div class="section-actions">
                <button class="btn btn-sm btn-secondary" @click="editSection(section)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Düzenle
                </button>
                <button class="btn btn-sm btn-danger" @click="deleteSection(section)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                  Sil
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
                <strong>Özel Veri:</strong>
                <pre>{{ JSON.stringify(section.data, null, 2) }}</pre>
              </div>
            </div>
            <div class="section-meta">
              <span>Oluşturulma: {{ formatDate(section.createdAt) }}</span>
              <span v-if="section.updatedAt !== section.createdAt">
                Güncelleme: {{ formatDate(section.updatedAt) }}
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
          <h2>{{ showCreateModal ? 'Yeni Bölüm Ekle' : 'Bölüm Düzenle' }}</h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveSection">
            <div class="form-group">
              <label>Bölüm Türü *</label>
              <select v-model="formData.section" required>
                <option value="">Bölüm Seçin</option>
                <option value="hero">Hero (Ana Başlık)</option>
                <option value="mission">Misyon</option>
                <option value="vision">Vizyon</option>
                <option value="team">Ekip</option>
                <option value="stats">İstatistikler</option>
                <option value="features">Özellikler</option>
                <option value="values">Değerler</option>
                <option value="history">Tarihçe</option>
              </select>
            </div>
            <div class="form-group">
              <label>Başlık</label>
              <input type="text" v-model="formData.title" />
            </div>
            <div class="form-group">
              <label>Alt Başlık</label>
              <input type="text" v-model="formData.subtitle" />
            </div>
            <div class="form-group">
              <label>İçerik</label> 
              <textarea v-model="formData.content" rows="4"></textarea>
            </div>
            <div class="form-group">
              <label>Resim URL'si</label>
              <input v-model="formData.imageUrl" placeholder="https://example.com/image.jpg" />
            </div>
            <div class="form-group">
              <label>Özel Veri (JSON)</label>
              <textarea v-model="formData.dataString" rows="6" placeholder='{"key": "value"}'></textarea>
              <small>İstatistikler, özellikler gibi yapılandırılmış veriler için JSON formatında</small>
            </div>
            <div class="form-group">
              <label>Sıra Numarası</label>
              <input type="number" v-model.number="formData.sortOrder" min="0" />
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.isActive" />
                <span class="checkmark"></span>
                Aktif
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" @click="closeModal">İptal</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Kaydediliyor...' : (showCreateModal ? 'Oluştur' : 'Güncelle') }}
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
          <h2>Bölüm Sil</h2>
          <button class="close-btn" @click="showDeleteModal = false">×</button>
        </div>
        <div class="modal-body">
          <p>Bu bölümü silmek istediğinizden emin misiniz?</p>
          <p><strong>{{ sectionToDelete?.title || getSectionDisplayName(sectionToDelete?.section) }}</strong></p>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="showDeleteModal = false">İptal</button>
            <button class="btn btn-danger" @click="confirmDelete" :disabled="deleting">
              {{ deleting ? 'Siliniyor...' : 'Sil' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reset to Defaults Confirmation Modal -->
    <div v-if="showResetModal" class="modal-overlay" @click="showResetModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Varsayılana Sıfırla</h2>
          <button class="close-btn" @click="showResetModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="warning-message">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            <div>
              <h3>Dikkat!</h3>
              <p>Bu işlem <strong>tüm mevcut bölümleri silecek</strong> ve varsayılan bölümleri yükleyecektir.</p>
              <p>Bu işlem <strong>geri alınamaz</strong>. Devam etmek istediğinizden emin misiniz?</p>
            </div>
          </div>
          <div class="default-sections-info">
            <h4>Yüklenecek varsayılan bölümler:</h4>
            <ul>
              <li><strong>Hero:</strong> Ana başlık ve tanıtım</li>
              <li><strong>Misyon:</strong> Şirket misyonu</li>
              <li><strong>Vizyon:</strong> Şirket vizyonu</li>
              <li><strong>İstatistikler:</strong> Rakamlarla başarı</li>
              <li><strong>Ekip:</strong> Takım tanıtımı</li>
              <li><strong>Özellikler:</strong> Platform özellikleri</li>
            </ul>
            <p class="total-count">Toplam: <strong>6 Bölüm</strong></p>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="showResetModal = false">İptal</button>
            <button class="btn btn-danger" @click="resetToDefaults" :disabled="resetting">
              {{ resetting ? 'Sıfırlanıyor...' : 'Evet, Sıfırla' }}
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
    console.error('Bölümler yüklenemedi:', error)
    alert('Bölümler yüklenemedi')
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
    hero: 'Hero (Ana Başlık)',
    mission: 'Misyon',
    vision: 'Vizyon',
    team: 'Ekip',
    stats: 'İstatistikler',
    features: 'Özellikler',
    values: 'Değerler',
    history: 'Tarihçe'
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
        alert('Geçersiz JSON formatı')
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
    console.error('Bölüm kaydedilemedi:', error)
    alert('Bölüm kaydedilemedi')
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
    console.error('Bölüm silinemedi:', error)
    alert('Bölüm silinemedi')
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
    alert(`Başarılı! ${response.data.count} varsayılan bölüm yüklendi.`)
  } catch (error) {
    console.error('Varsayılan bölümler yüklenemedi:', error)
    alert('Varsayılan bölümler yüklenemedi')
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
  return new Date(dateString).toLocaleString('tr-TR')
}

onMounted(() => {
  loadSections()
})
</script>

<style scoped>
.admin-about-page {
  min-height: 100vh;
  background: #f8f9fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
    justify-content: flex-start;
  }
}
</style>
