<script setup>
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close'])
const router = useRouter()

const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const hasSearched = ref(false)

// Watch for search query changes and perform search
watch(searchQuery, async (newValue) => {
  if (newValue.trim().length === 0) {
    searchResults.value = []
    hasSearched.value = false
    return
  }

  if (newValue.trim().length < 2) {
    return
  }

  await performSearch(newValue)
})

async function performSearch(query) {
  isSearching.value = true
  hasSearched.value = true

  try {
    const { data } = await api.get('/leads')

    //        lead.description.toLowerCase().includes(searchLower) ||

    // Filter leads by id, title, description or insurance type
    const filtered = data.filter(lead => {
      const searchLower = query.toLowerCase()
      const leadIdStr = String(lead.id || '').toLowerCase()
      return (
        leadIdStr.includes(searchLower) ||
        lead.title.toLowerCase().includes(searchLower) ||
        (lead.insuranceType && lead.insuranceType.toLowerCase().includes(searchLower))
      )
    })

    searchResults.value = filtered
  } catch (error) {
    console.error('Arama hatası:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

function goToLead(leadId) {
  router.push(`/lead/${leadId}`)
  close()
}

function close() {
  emit('close')
  // Reset search state
  setTimeout(() => {
    searchQuery.value = ''
    searchResults.value = []
    hasSearched.value = false
  }, 300)
}

function formatPrice(price) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(price / 100)
}

function getLeadTypeLabel(leadType) {
  return leadType === 'AUCTION' ? 'Açık Artırma' : 'Hemen Al'
}

function getCurrentPrice(lead) {
  if (lead.bids && lead.bids.length > 0) {
    return lead.bids[0].amount
  }
  return lead.startPrice
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop" @click="close">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <div class="modal-header-icon">
            <Icon icon="mdi:magnify" width="32" height="32" />
          </div>
          <h2 class="modal-title">Lead Ara</h2>
          <button class="modal-close-btn" @click="close">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>

        <div class="modal-body">
          <div class="search-input-wrapper">
            <Icon icon="mdi:magnify" width="20" height="20" class="search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="Lead ID veya Başlık ara..."
              autofocus
            />
            <Icon
              v-if="searchQuery"
              icon="mdi:close-circle"
              width="20"
              height="20"
              class="clear-icon"
              @click="searchQuery = ''"
            />
          </div>

          <div class="search-content">
            <div v-if="isSearching" class="search-status">
              <Icon icon="mdi:loading" width="24" height="24" class="spinner" />
              <span>Aranıyor...</span>
            </div>

            <div v-else-if="hasSearched && searchResults.length === 0" class="search-status">
              <Icon icon="mdi:alert-circle-outline" width="24" height="24" />
              <span>Sonuç bulunamadı</span>
            </div>

            <div v-else-if="searchResults.length > 0" class="search-results">
              <div class="results-header">
                <span>{{ searchResults.length }} sonuç bulundu</span>
              </div>
              <div
                v-for="lead in searchResults"
                :key="lead.id"
                class="result-item"
                @click="goToLead(lead.id)"
              >
                <div class="result-header">
                  <div class="result-title-wrapper">
                    <h3 class="result-title">{{ lead.title }}</h3>
                    <span class="lead-id">ID: {{ lead.id }}</span>
                  </div>
                  <span class="lead-type-badge" :class="lead.leadType.toLowerCase()">
                    {{ getLeadTypeLabel(lead.leadType) }}
                  </span>
                </div>
                <p class="result-description">{{ lead.description }}</p>
                <div class="result-footer">
                  <div class="result-info">
                    <Icon icon="mdi:shield-check" width="16" height="16" />
                    <span>{{ lead.insuranceType || 'Belirtilmemiş' }}</span>
                  </div>
                  <div class="result-price">
                    {{ formatPrice(getCurrentPrice(lead)) }}
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="search-prompt">
              <Icon icon="mdi:text-search" width="48" height="48" />
              <p>Lead ID veya başlık ile arama yapın</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 12px;
  color: white;
  flex-shrink: 0;
}

.modal-title {
  flex: 1;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-close-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: #e5e7eb;
  color: #111827;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.search-content {
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  padding: 0.875rem 3rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.2s;
  outline: none;
}

.search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
  position: absolute;
  left: 1rem;
  color: #9ca3af;
}

.clear-icon {
  position: absolute;
  right: 1rem;
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.2s;
}

.clear-icon:hover {
  color: #6b7280;
}

.search-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem 1rem;
  color: #6b7280;
  font-size: 1rem;
  flex: 1;
}

.spinner {
  animation: spin 1s linear infinite;
}

.search-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 1rem;
  color: #9ca3af;
  text-align: center;
  flex: 1;
}

.search-prompt p {
  margin: 0;
  font-size: 1rem;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  overflow-y: auto;
}

.results-header {
  padding: 0.5rem 0;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.result-item {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  border-color: #3b82f6;
  background: #f8fafc;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.1);
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.result-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
  flex: 1;
}

.lead-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}

.lead-type-badge.auction {
  background: #dbeafe;
  color: #1e40af;
}

.lead-type-badge.sofort_kauf {
  background: #d1fae5;
  color: #065f46;
}

.result-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 0.75rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.result-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.result-info {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.result-price {
  font-size: 1rem;
  font-weight: 700;
  color: #3b82f6;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .modal-container {
    max-height: 90vh;
    border-radius: 16px 16px 0 0;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-body {
    padding: 1rem;
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .lead-type-badge {
    align-self: flex-start;
  }
}
</style>
