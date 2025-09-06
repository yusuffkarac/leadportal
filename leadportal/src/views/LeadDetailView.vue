<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { io } from 'socket.io-client'

const route = useRoute()
const leadId = route.params.id
const lead = ref(null)
const amount = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const socket = io('/', {
  path: '/socket.io',
  transports: ['websocket'],
  auth: { token: localStorage.getItem('token') }
})

async function loadLead() {
  const { data } = await axios.get(`/api/leads/${leadId}`, { headers: authHeaders() })
  // Lead'in aktif durumunu endsAt tarihine göre güncelle
  const now = new Date()
  const endDate = new Date(data.endsAt)
  const isExpired = endDate < now
  
  lead.value = {
    ...data,
    isActive: data.isActive && !isExpired
  }
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function setQuickBid(multiplier) {
  const current = lead.value?.bids?.[0]?.amount ?? lead.value?.startPrice ?? 0
  const increment = lead.value?.minIncrement ?? 1
  const quickAmount = current + (increment * multiplier)
  amount.value = quickAmount.toString()
}

async function placeBid() {
  errorMessage.value = ''
  const numeric = Number(amount.value)
  if (!numeric || Number.isNaN(numeric)) {
    errorMessage.value = 'Lütfen geçerli bir sayı girin.'
    return
  }
  const current = lead.value?.bids?.[0]?.amount ?? lead.value?.startPrice ?? 0
  const minNext = current + (lead.value?.minIncrement ?? 1)
  if (numeric < minNext) {
    errorMessage.value = `Minimum teklif ${minNext} olmalı.`
    return
  }
  try {
    isSubmitting.value = true
    await axios.post('/api/bids', { leadId, amount: numeric }, { headers: authHeaders() })
    // Socket yayınını bekle; optimistik ekleme yok → çift kayıt önlenir
    amount.value = ''
  } catch (e) {
    const msg = e?.response?.data?.error || 'Teklif verilemedi'
    errorMessage.value = msg
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  socket.emit('join-lead', leadId)
  socket.on('bid:new', (payload) => {
    if (payload.leadId !== leadId) return
    const exists = lead.value?.bids?.some(b => b.id === payload.bid.id)
    if (!exists) {
      lead.value?.bids?.unshift(payload.bid)
    }
  })
  socket.on('lead:update', (payload) => {
    if (payload.leadId !== leadId) return
    // Lead temel bilgilerini güncelle (bids server tarafında dahil değilse koru)
    const currentBids = lead.value?.bids || []
    lead.value = { ...lead.value, ...payload.lead, bids: currentBids }
  })
  loadLead()
})

onUnmounted(() => {
  socket.close()
})
</script>

<template>
  <div v-if="lead" class="modern-lead-detail">
    <div class="page-content">
      <!-- Hero Section -->
      <div class="lead-hero">
        <div class="lead-header">
          <div class="lead-title-section">
            <div class="lead-status">
              <span class="status-indicator" :class="lead.isActive ? 'active' : 'inactive'"></span>
              <span class="status-text">{{ lead.isActive ? 'Aktif Artırma' : 'Tamamlandı' }}</span>
            </div>
            <h1 class="lead-title">{{ lead.title }}</h1>
            <p class="lead-description">{{ lead.description || 'Açıklama bulunmuyor' }}</p>
          </div>
          
          <div class="lead-stats-section">
            <div class="current-bid-card">
              <div class="bid-amount">₺{{ lead.bids?.[0]?.amount || lead.startPrice }}</div>
              <div class="bid-label">Güncel Teklif</div>
            </div>
            
            <div class="stats-row">
              <div class="stat-card">
                <div class="stat-value">{{ lead.bids?.length || 0 }}</div>
                <div class="stat-label">Teklif</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">₺{{ lead.minIncrement }}</div>
                <div class="stat-label">Min Artış</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="content-grid">
        <!-- Bids Section -->
        <div class="bids-panel">
          <div class="panel-header">
            <h2>Teklif Geçmişi</h2>
            <span class="bid-count">{{ lead.bids?.length || 0 }} teklif</span>
          </div>
          
          <div v-if="!lead.bids?.length" class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m0-7v7m0-7l3-3m-3 3l-3-3m8 3h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2m0-7v7m0-7l3-3m-3 3l-3-3"/>
              </svg>
            </div>
            <h3>Henüz teklif yok</h3>
            <p>İlk teklifi siz verin ve bu artırmayı başlatın!</p>
          </div>
          
          <div v-else class="bids-timeline">
            <div class="bid-card" v-for="(bid, index) in lead.bids" :key="bid.id" :class="{ 'top-bid': index === 0 }">
              <div class="bid-rank">
                <span class="rank-number">{{ index + 1 }}</span>
                <span class="rank-label">.</span>
              </div>
              <div class="bid-info">
                <div class="bid-amount">₺{{ bid.amount }}</div>
                <div class="bid-user">{{ bid.user?.email || 'Anonim' }}</div>
              </div>
              <div class="bid-time">
                <div class="time-text">{{ new Date(bid.createdAt).toLocaleDateString('tr-TR') }}</div>
                <div class="time-detail">{{ new Date(bid.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bid Form Panel -->
        <div class="bid-form-panel">
          <div class="form-header">
            <h2>Teklif Ver</h2>
            <p>En yüksek teklifi sen ver ve kazan!</p>
          </div>
          
          <div class="form-content">
            <div class="input-group">
              <label class="input-label">Teklif Miktarı</label>
              <div class="amount-input">
                <span class="currency">₺</span>
                <input 
                  type="number" 
                  v-model="amount" 
                  :placeholder="`${(lead.bids?.[0]?.amount ?? lead.startPrice) + lead.minIncrement}`"
                  class="amount-field"
                  @keyup.enter="placeBid"
                />
              </div>
              <div class="input-info">
                <span class="min-bid">Minimum: ₺{{ (lead.bids?.[0]?.amount ?? lead.startPrice) + lead.minIncrement }}</span>
              </div>
            </div>
            
            <!-- Hızlı Teklif Butonları -->
            <div class="quick-bid-section">
              <label class="quick-bid-label">Hızlı Teklif</label>
              <div class="quick-bid-buttons">
                <button 
                  class="quick-bid-btn" 
                  @click="setQuickBid(1)"
                  :disabled="!lead.isActive"
                >
                  +₺{{ lead.minIncrement }}
                </button>
                <button 
                  class="quick-bid-btn" 
                  @click="setQuickBid(2)"
                  :disabled="!lead.isActive"
                >
                  +₺{{ lead.minIncrement * 2 }}
                </button>
                <button 
                  class="quick-bid-btn" 
                  @click="setQuickBid(5)"
                  :disabled="!lead.isActive"
                >
                  +₺{{ lead.minIncrement * 5 }}
                </button>
                <button 
                  class="quick-bid-btn" 
                  @click="setQuickBid(10)"
                  :disabled="!lead.isActive"
                >
                  +₺{{ lead.minIncrement * 10 }}
                </button>
              </div>
            </div>
            
            <button 
              class="submit-bid-btn" 
              :disabled="isSubmitting || !lead.isActive" 
              @click="placeBid"
            >
              <svg v-if="!isSubmitting" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span v-if="!lead.isActive">Artırma Bitti</span>
              <span v-else-if="isSubmitting">Gönderiliyor...</span>
              <span v-else>Teklif Ver</span>
            </button>
            
            <div v-if="errorMessage" class="error-alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ errorMessage }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="loading-container">
    <div class="loading-spinner"></div>
    <p>Lead bilgileri yükleniyor...</p>
  </div>
</template>

