<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const leads = ref([])
const showNewLeadModal = ref(false)
const showEditLeadModal = ref(false)
const editingLead = ref(null)

// New Lead Form
const newLead = ref({
  title: '',
  description: '',
  startPrice: '',
  minIncrement: '',
  buyNowPrice: '',
  endsAt: ''
})

// Edit Lead Form
const editLead = ref({
  title: '',
  description: '',
  startPrice: '',
  minIncrement: '',
  buyNowPrice: '',
  endsAt: '',
  isActive: true
})

const errorMessage = ref('')
const successMessage = ref('')

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchMine() {
  const { data } = await axios.get('/api/leads/admin/list', { headers: authHeaders() })
  // Lead'lerin aktif durumunu endsAt tarihine göre güncelle
  leads.value = data.map(lead => {
    const now = new Date()
    const endDate = new Date(lead.endsAt)
    const isExpired = endDate < now
    
    return {
      ...lead,
      isActive: lead.isActive && !isExpired
    }
  })
}

function openNewLeadModal() {
  showNewLeadModal.value = true
  newLead.value = {
    title: '',
    description: '',
    startPrice: '',
    minIncrement: '',
    buyNowPrice: '',
    endsAt: ''
  }
  errorMessage.value = ''
  successMessage.value = ''
}

function closeNewLeadModal() {
  showNewLeadModal.value = false
  errorMessage.value = ''
  successMessage.value = ''
}

function openEditLeadModal(lead) {
  showEditLeadModal.value = true
  editingLead.value = lead
  editLead.value = {
    title: lead.title,
    description: lead.description || '',
    startPrice: lead.startPrice.toString(),
    minIncrement: lead.minIncrement.toString(),
    buyNowPrice: lead.instantBuyPrice ? lead.instantBuyPrice.toString() : '',
    endsAt: lead.endsAt ? new Date(lead.endsAt).toISOString().slice(0, 16) : '',
    isActive: lead.isActive
  }
  errorMessage.value = ''
  successMessage.value = ''
}

function closeEditLeadModal() {
  showEditLeadModal.value = false
  editingLead.value = null
  errorMessage.value = ''
  successMessage.value = ''
}

async function createLead() {
  try {
    errorMessage.value = ''
    
    // Validation
    if (!newLead.value.title.trim()) {
      errorMessage.value = 'Başlık gerekli'
      return
    }
    if (!newLead.value.startPrice || parseFloat(newLead.value.startPrice) <= 0) {
      errorMessage.value = 'Geçerli başlangıç fiyatı girin'
      return
    }
    if (!newLead.value.minIncrement || parseFloat(newLead.value.minIncrement) <= 0) {
      errorMessage.value = 'Geçerli minimum artış girin'
      return
    }
    if (!newLead.value.endsAt) {
      errorMessage.value = 'Bitiş tarihi gerekli'
      return
    }

    const leadData = {
      ...newLead.value,
      startPrice: parseFloat(newLead.value.startPrice),
      minIncrement: parseFloat(newLead.value.minIncrement),
      instantBuyPrice: newLead.value.buyNowPrice ? parseFloat(newLead.value.buyNowPrice) : null,
      endsAt: new Date(newLead.value.endsAt).toISOString()
    }

    await axios.post('/api/leads', leadData, { headers: authHeaders() })
    
    successMessage.value = 'Lead başarıyla oluşturuldu!'
    await fetchMine()
    
    setTimeout(() => {
      closeNewLeadModal()
    }, 1500)
    
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Lead oluşturulamadı'
  }
}

async function updateLead() {
  try {
    errorMessage.value = ''
    
    // Validation
    if (!editLead.value.title.trim()) {
      errorMessage.value = 'Başlık gerekli'
      return
    }
    if (!editLead.value.startPrice || parseFloat(editLead.value.startPrice) <= 0) {
      errorMessage.value = 'Geçerli başlangıç fiyatı girin'
      return
    }
    if (!editLead.value.minIncrement || parseFloat(editLead.value.minIncrement) <= 0) {
      errorMessage.value = 'Geçerli minimum artış girin'
      return
    }
    if (!editLead.value.endsAt) {
      errorMessage.value = 'Bitiş tarihi gerekli'
      return
    }

    const leadData = {
      ...editLead.value,
      startPrice: parseFloat(editLead.value.startPrice),
      minIncrement: parseFloat(editLead.value.minIncrement),
      instantBuyPrice: editLead.value.buyNowPrice ? parseFloat(editLead.value.buyNowPrice) : null,
      endsAt: new Date(editLead.value.endsAt).toISOString()
    }

    await axios.put(`/api/leads/${editingLead.value.id}`, leadData, { headers: authHeaders() })
    
    successMessage.value = 'Lead başarıyla güncellendi!'
    await fetchMine()
    
    setTimeout(() => {
      closeEditLeadModal()
    }, 1500)
    
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Lead güncellenemedi'
  }
}

onMounted(fetchMine)
</script>

<template>
  <section>
    <div class="page-content">
      <div class="page-header">
        <div class="header-content">
          <h1>Tüm Leadler</h1>
          <p class="page-subtitle">Lead yönetimi ve düzenleme</p>
        </div>
        <button class="btn btn-primary" @click="openNewLeadModal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Yeni Lead
        </button>
      </div>
    
    <div v-if="!leads.length" class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>Henüz lead yok</h3>
      <p>İlk lead'inizi oluşturmak için "Yeni Lead" butonuna tıklayın</p>
    </div>
    
    <div v-else class="leads-grid">
      <div class="lead-card" v-for="lead in leads" :key="lead.id">
        <div class="lead-header">
          <div class="lead-title">
            <h3>{{ lead.title }}</h3>
            <span class="status-badge" :class="lead.isActive ? 'active' : 'inactive'">
              {{ lead.isActive ? 'Aktif' : 'Pasif' }}
            </span>
          </div>
          <div class="lead-actions">
            <button class="btn btn-secondary" @click="openEditLeadModal(lead)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Düzenle
            </button>
          </div>
        </div>
        
        <div class="lead-meta">
          <div class="meta-item">
            <svg class="meta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span>Başlangıç: ₺{{ lead.startPrice }}</span>
          </div>
          <div class="meta-item">
            <svg class="meta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{{ lead.bids?.length || 0 }} teklif</span>
          </div>
          <div class="meta-item">
            <svg class="meta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{{ lead.owner?.email || 'Sahip yok' }}</span>
          </div>
        </div>
        
        <div class="lead-stats">
          <div class="stat-item">
            <div class="stat-value">₺{{ lead.bids?.[0]?.amount || lead.startPrice }}</div>
            <div class="stat-label">Güncel Teklif</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">+₺{{ lead.minIncrement }}</div>
            <div class="stat-label">Min Artış</div>
          </div>
          <div v-if="lead.instantBuyPrice" class="stat-item buy-now">
            <div class="stat-value">₺{{ lead.instantBuyPrice }}</div>
            <div class="stat-label">Anında Satın Al</div>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- New Lead Modal -->
    <div v-if="showNewLeadModal" class="modal-backdrop" @click="closeNewLeadModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Yeni Lead Oluştur</h3>
          <button class="modal-close" @click="closeNewLeadModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>Başlık *</label>
            <input 
              v-model="newLead.title" 
              type="text" 
              class="form-input" 
              placeholder="Lead başlığı"
              required
            />
          </div>
          
          <div class="form-group">
            <label>Açıklama</label>
            <textarea 
              v-model="newLead.description" 
              class="form-textarea" 
              placeholder="Lead açıklaması"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Başlangıç Fiyatı (₺) *</label>
              <input 
                v-model="newLead.startPrice" 
                type="number" 
                class="form-input" 
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div class="form-group">
              <label>Minimum Artış (₺) *</label>
              <input 
                v-model="newLead.minIncrement" 
                type="number" 
                class="form-input" 
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>Anında Satın Alma Fiyatı (₺)</label>
            <input 
              v-model="newLead.buyNowPrice" 
              type="number" 
              class="form-input" 
              placeholder="Opsiyonel - boş bırakabilirsiniz"
              min="0"
              step="0.01"
            />
            <small class="form-help">Bu fiyat belirlenirse, kullanıcılar bu fiyattan anında satın alabilir</small>
          </div>
          
          <div class="form-group">
            <label>Bitiş Tarihi *</label>
            <input 
              v-model="newLead.endsAt" 
              type="datetime-local" 
              class="form-input"
              required
            />
          </div>
          
          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
          <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeNewLeadModal">İptal</button>
          <button class="btn btn-primary" @click="createLead">Oluştur</button>
        </div>
      </div>
    </div>

    <!-- Edit Lead Modal -->
    <div v-if="showEditLeadModal" class="modal-backdrop" @click="closeEditLeadModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Lead Düzenle</h3>
          <button class="modal-close" @click="closeEditLeadModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>Başlık *</label>
            <input 
              v-model="editLead.title" 
              type="text" 
              class="form-input" 
              placeholder="Lead başlığı"
              required
            />
          </div>
          
          <div class="form-group">
            <label>Açıklama</label>
            <textarea 
              v-model="editLead.description" 
              class="form-textarea" 
              placeholder="Lead açıklaması"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Başlangıç Fiyatı (₺) *</label>
              <input 
                v-model="editLead.startPrice" 
                type="number" 
                class="form-input" 
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div class="form-group">
              <label>Minimum Artış (₺) *</label>
              <input 
                v-model="editLead.minIncrement" 
                type="number" 
                class="form-input" 
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>Anında Satın Alma Fiyatı (₺)</label>
            <input 
              v-model="editLead.buyNowPrice" 
              type="number" 
              class="form-input" 
              placeholder="Opsiyonel - boş bırakabilirsiniz"
              min="0"
              step="0.01"
            />
            <small class="form-help">Bu fiyat belirlenirse, kullanıcılar bu fiyattan anında satın alabilir</small>
          </div>
          
          <div class="form-group">
            <label>Bitiş Tarihi *</label>
            <input 
              v-model="editLead.endsAt" 
              type="datetime-local" 
              class="form-input"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                v-model="editLead.isActive" 
                type="checkbox" 
                class="form-checkbox"
              />
              <span>Lead aktif</span>
            </label>
          </div>
          
          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
          <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeEditLeadModal">İptal</button>
          <button class="btn btn-primary" @click="updateLead">Güncelle</button>
        </div>
      </div>
    </div>
  </section>
</template>

