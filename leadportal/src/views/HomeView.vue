<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import axios from 'axios'
import { io } from 'socket.io-client'

const leads = ref([])
const socket = io('/', { path: '/socket.io' })

// Zaman hesaplama fonksiyonu
function formatTimeRemaining(endsAt) {
  const now = new Date()
  const endTime = new Date(endsAt)
  const diff = endTime - now
  
  if (diff <= 0) return 'Süresi doldu'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours}s ${minutes}d`
  } else {
    return `${minutes}d`
  }
}

async function fetchLeads() {
  const { data } = await axios.get('/api/leads', {
    headers: authHeaders()
  })
  // Lead'lerin aktif durumunu endsAt tarihine göre güncelle
  leads.value = data.map(lead => {
    const now = new Date()
    const endDate = new Date(lead.endsAt)
    const isExpired = endDate < now
    
    return {
      ...lead,
      isActive: lead.isActive && !isExpired,
      isExpired: isExpired // Geçmiş lead'leri işaretle
    }
  })
  // Tüm listelenen lead odalarına katıl, canlı güncellemeleri al
  for (const l of leads.value) {
    socket.emit('join-lead', l.id)
  }
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

onMounted(() => {
  fetchLeads()
  // Her yeni teklifte ilgili kartı anında güncelle
  socket.on('bid:new', ({ leadId, bid }) => {
    const idx = leads.value.findIndex(l => l.id === leadId)
    if (idx !== -1) {
      const current = leads.value[idx]
      const existing = current.bids || []
      leads.value[idx] = { ...current, bids: [bid, ...existing] }
    }
  })
  
  // Her dakika zamanı güncelle
  const timeInterval = setInterval(() => {
    // Vue reactivity için leads array'ini güncelle
    leads.value = [...leads.value]
  }, 60000)
  
  onUnmounted(() => {
    clearInterval(timeInterval)
    socket.close()
  })
})
</script>

<template>
  <section>
    <div class="page-content">
      <div class="page-header">
        <h1>Aktif Açık Artırmalar</h1>
        <!-- <p class="page-subtitle">Canlı teklifler ve açık artırmalar</p> -->
      </div>
      
      <div v-if="!leads.length" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>Şu anda görüntülenecek lead yok</h3>
        <p>Yeni açık artırmalar eklendiğinde burada görünecek</p>
      </div>
      
      <div v-else class="auctions-grid">
      <div class="auction-card" v-for="lead in leads" :key="lead.id">
        <div class="card-header">
          <div class="card-title">
            <h3>{{ lead.title }}</h3>
            <span class="status-badge" :class="lead.isExpired ? 'expired' : 'active'">
              {{ lead.isExpired ? 'Geçmiş' : 'Aktif' }}
            </span>
          </div>
          <div class="current-bid">
            <div class="bid-amount">
              <span v-if="lead.bids && lead.bids.length">₺{{ lead.bids[0].amount }}</span>
              <span v-else>₺{{ lead.startPrice }}</span>
            </div>
            <div class="bid-label">Güncel Teklif</div>
          </div>
        </div>
        
        <div class="card-description">
          {{ lead.description || 'Açıklama bulunmuyor' }}
        </div>
        
        <div class="card-details">
          <div class="detail-item">
            <svg class="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            <span class="detail-text">{{ formatTimeRemaining(lead.endsAt) }}</span>
          </div>
          <div class="detail-item">
            <svg class="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="detail-text">{{ lead.bids ? lead.bids.length : 0 }} teklif</span>
          </div>
          <div class="detail-item">
            <svg class="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span class="detail-text">+₺{{ lead.minIncrement }}</span>
          </div>
        </div>
        
        <div class="card-footer">
          <router-link 
            class="bid-btn" 
            :class="{ 'bid-btn-disabled': lead.isExpired }"
            :to="lead.isExpired ? '#' : `/lead/${lead.id}`"
            @click="lead.isExpired && $event.preventDefault()"
          >
            {{ lead.isExpired ? 'Süresi Doldu' : 'Teklif Ver' }}
          </router-link>
        </div>
      </div>
    </div>
    </div>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          Almanya'nın önde gelen<br>
          lead pazar yeri
        </h1>
        <p class="hero-description">
          Sigorta brokerleri için profesyonel açık artırma platformu. Sağlık, evcil hayvan ve
          araç sigortaları için yüksek kaliteli potansiyel müşterileri alıp satın.
        </p>
        <div class="hero-buttons">
          <button class="btn btn-primary">Şimdi kaydolun</button>
          <button class="btn btn-secondary">Canlı müzayedeleri izleyin</button>
        </div>
      </div>
    </section>
  </section>
</template>
