<template>
  <div class="admin-faq-page">
    <div class="page-content">
      <div class="page-header">
        <h1>FAQ Yönetimi</h1>
        <div class="header-actions">
          <button class="btn btn-secondary" @click="showResetModal = true">
            <Icon icon="mdi:refresh" width="20" height="20" />
            Varsayılana Sıfırla
          </button>
          <button class="btn btn-primary" @click="showCreateModal = true">
            <Icon icon="mdi:plus" width="20" height="20" />
            Yeni FAQ Ekle
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label>Kategori:</label>
          <select v-model="selectedCategory" @change="filterFAQs">
            <option value="">Tüm Kategoriler</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ getCategoryDisplayName(category) }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>Durum:</label>
          <select v-model="selectedStatus" @change="filterFAQs">
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
            @input="filterFAQs"
            placeholder="Soru veya cevap ara..."
          />
        </div>
      </div>

      <!-- FAQ List -->
      <div class="faq-list">
        <div v-if="loading" class="loading">Yükleniyor...</div>
        <div v-else-if="filteredFAQs.length === 0" class="no-data">
          Hiç FAQ bulunamadı.
        </div>
        <div v-else>
          <div class="faq-item" v-for="faq in filteredFAQs" :key="faq.id">
            <div class="faq-header">
              <div class="faq-info">
                <span class="category-badge" :class="getCategoryClass(faq.category)">
                  {{ getCategoryDisplayName(faq.category) }}
                </span>
                <span class="status-badge" :class="{ active: faq.isActive, inactive: !faq.isActive }">
                  {{ faq.isActive ? 'Aktif' : 'Pasif' }}
                </span>
                <span class="sort-order">Sıra: {{ faq.sortOrder }}</span>
              </div>
              <div class="faq-actions">
                <button class="btn btn-sm btn-secondary" @click="editFAQ(faq)">
                  <Icon icon="mdi:pencil" width="16" height="16" />
                  Düzenle
                </button>
                <button class="btn btn-sm btn-danger" @click="deleteFAQ(faq)">
                  <Icon icon="mdi:delete" width="16" height="16" />
                  Sil
                </button>
              </div>
            </div>
            <div class="faq-content">
              <h3>{{ faq.question }}</h3>
              <p>{{ faq.answer }}</p>
            </div>
            <div class="faq-meta">
              <span>Oluşturulma: {{ formatDate(faq.createdAt) }}</span>
              <span v-if="faq.updatedAt !== faq.createdAt">
                Güncelleme: {{ formatDate(faq.updatedAt) }}
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
          <h2>{{ showCreateModal ? 'Yeni FAQ Ekle' : 'FAQ Düzenle' }}</h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveFAQ">
            <div class="form-group">
              <label>Kategori *</label>
              <select v-model="formData.category" required>
                <option value="">Kategori Seçin</option>
                <option value="general">Genel Sorular</option>
                <option value="bidding">Teklif Verme</option>
                <option value="account">Hesap Yönetimi</option>
                <option value="payment">Ödeme</option>
              </select>
            </div>
            <div class="form-group">
              <label>Soru *</label>
              <input type="text" v-model="formData.question" required />
            </div>
            <div class="form-group">
              <label>Cevap *</label>
              <textarea v-model="formData.answer" required rows="4"></textarea>
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
          <h2>FAQ Sil</h2>
          <button class="close-btn" @click="showDeleteModal = false">×</button>
        </div>
        <div class="modal-body">
          <p>Bu FAQ'ı silmek istediğinizden emin misiniz?</p>
          <p><strong>{{ faqToDelete?.question }}</strong></p>
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
            <Icon icon="mdi:alert-triangle" width="48" height="48" />
            <div>
              <h3>Dikkat!</h3>
              <p>Bu işlem <strong>tüm mevcut FAQ'ları silecek</strong> ve varsayılan FAQ'ları yükleyecektir.</p>
              <p>Bu işlem <strong>geri alınamaz</strong>. Devam etmek istediğinizden emin misiniz?</p>
            </div>
          </div>
          <div class="default-faqs-info">
            <h4>Yüklenecek varsayılan FAQ'lar:</h4>
            <ul>
              <li><strong>Genel Sorular:</strong> 4 FAQ</li>
              <li><strong>Teklif Verme:</strong> 4 FAQ</li>
              <li><strong>Hesap Yönetimi:</strong> 4 FAQ</li>
              <li><strong>Ödeme:</strong> 4 FAQ</li>
            </ul>
            <p class="total-count">Toplam: <strong>16 FAQ</strong></p>
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
import { ref, onMounted, computed } from 'vue'
import axios from '@/utils/axios'
import { Icon } from '@iconify/vue'

// Data
const faqs = ref([])
const filteredFAQs = ref([])
const categories = ref([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)

// Filters
const selectedCategory = ref('')
const selectedStatus = ref('')
const searchQuery = ref('')

// Modals
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showResetModal = ref(false)
const faqToDelete = ref(null)
const resetting = ref(false)

// Form
const formData = ref({
  question: '',
  answer: '',
  category: '',
  isActive: true,
  sortOrder: 0
})
const editingFAQ = ref(null)

// Methods
async function loadFAQs() {
  try {
    loading.value = true
    const response = await axios.get('faq/admin')
    faqs.value = response.data
    
    // Extract unique categories
    categories.value = [...new Set(faqs.value.map(faq => faq.category))]
    
    filterFAQs()
  } catch (error) {
    console.error('FAQ\'lar yüklenemedi:', error)
    alert('FAQ\'lar yüklenemedi')
  } finally {
    loading.value = false
  }
}

function filterFAQs() {
  let filtered = [...faqs.value]
  
  // Category filter
  if (selectedCategory.value) {
    filtered = filtered.filter(faq => faq.category === selectedCategory.value)
  }
  
  // Status filter
  if (selectedStatus.value) {
    const isActive = selectedStatus.value === 'active'
    filtered = filtered.filter(faq => faq.isActive === isActive)
  }
  
  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(faq => 
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query)
    )
  }
  
  filteredFAQs.value = filtered
}

function getCategoryDisplayName(category) {
  const names = {
    general: 'Genel Sorular',
    bidding: 'Teklif Verme',
    account: 'Hesap Yönetimi',
    payment: 'Ödeme'
  }
  return names[category] || category
}

function getCategoryClass(category) {
  return `category-${category}`
}

function editFAQ(faq) {
  editingFAQ.value = faq
  formData.value = {
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    isActive: faq.isActive,
    sortOrder: faq.sortOrder
  }
  showEditModal.value = true
}

function deleteFAQ(faq) {
  faqToDelete.value = faq
  showDeleteModal.value = true
}

async function saveFAQ() {
  try {
    saving.value = true
    
    if (showCreateModal.value) {
      await axios.post('faq/admin', formData.value)
    } else {
      await axios.put(`faq/admin/${editingFAQ.value.id}`, formData.value)
    }
    
    await loadFAQs()
    closeModal()
  } catch (error) {
    console.error('FAQ kaydedilemedi:', error)
    alert('FAQ kaydedilemedi')
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  try {
    deleting.value = true
    await axios.delete(`faq/admin/${faqToDelete.value.id}`)
    await loadFAQs()
    showDeleteModal.value = false
    faqToDelete.value = null
  } catch (error) {
    console.error('FAQ silinemedi:', error)
    alert('FAQ silinemedi')
  } finally {
    deleting.value = false
  }
}

async function resetToDefaults() {
  try {
    resetting.value = true
    const response = await axios.post('faq/admin/reset-defaults')
    await loadFAQs()
    showResetModal.value = false
    alert(`Başarılı! ${response.data.count} varsayılan FAQ yüklendi.`)
  } catch (error) {
    console.error('Varsayılan FAQ\'lar yüklenemedi:', error)
    alert('Varsayılan FAQ\'lar yüklenemedi')
  } finally {
    resetting.value = false
  }
}

function closeModal() {
  showCreateModal.value = false
  showEditModal.value = false
  editingFAQ.value = null
  formData.value = {
    question: '',
    answer: '',
    category: '',
    isActive: true,
    sortOrder: 0
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('tr-TR')
}

onMounted(() => {
  loadFAQs()
})
</script>

<style scoped>
.admin-faq-page {
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

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.faq-item {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
  margin-bottom:1.4%
}

.faq-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.faq-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.faq-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.category-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.category-general { background: #dbeafe; color: #1e40af; }
.category-bidding { background: #dcfce7; color: #166534; }
.category-account { background: #fef3c7; color: #92400e; }
.category-payment { background: #fce7f3; color: #be185d; }

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

.faq-actions {
  display: flex;
  gap: 8px;
}

.faq-content h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.faq-content p {
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
}

.faq-meta {
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
  max-width: 600px;
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

.default-faqs-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

.default-faqs-info h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
}

.default-faqs-info ul {
  margin: 0 0 16px 0;
  padding-left: 20px;
}

.default-faqs-info li {
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
  
  .faq-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .faq-info {
    flex-wrap: wrap;
  }
  
  .faq-meta {
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
