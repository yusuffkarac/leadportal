<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import api from '@/utils/axios.js'
import { formatPrice } from '@/utils/currency.js'
import { useAlert } from '../composables/useAlert'
import { io } from 'socket.io-client'
import LeadCard from '@/components/LeadCard.vue'
import InstantBuyModal from '@/components/InstantBuyModal.vue'

const { success, error } = useAlert()

// Socket.IO bağlantısı
const socket = io('/', { path: '/socket.io' })

// Instant Buy Modal
const showInstantBuyModal = ref(false)
const selectedLead = ref(null)

// Posta kodu -> { lat, lon, name } eşlemesi için Map tutulur
const zipcodeIndex = ref(new Map())

const showcaseLeads = ref([])
const isLoadingShowcase = ref(false)
const showcaseError = ref('')
const settings = ref({ defaultCurrency: 'EUR', insuranceTypes: [] })
const showRightScrollHint = ref(false)
const showLeftScrollHint = ref(false)

const defaultHomepageContent = {
  hero: {
    eyebrow: 'Sigorta lead pazaryeri',
    title: "Almanya'nın önde gelen",
    highlight: 'sigorta lead',
    titleSuffix: 'pazaryeri',
    subtitle: 'LeadPortal, sigorta brokerleri için profesyonel açık artırma altyapısı, doğrulanmış lead kalitesi ve canlı teklif takibi sunar.',
    primaryText: 'Şimdi kaydol',
    primaryLink: '/login',
    secondaryText: 'Canlı açık artırmaları gör',
    secondaryLink: '/leads'
  },
  featureHeading: "LeadPortal'ı neden seçmelisiniz?",
  features: [
    {
      icon: 'mdi:scale-balance',
      title: 'Adil Açık Artırmalar',
      description: 'Şeffaf kurallar ve gerçek zamanlı teklifler ile esnek açık artırma modelleri.'
    },
    {
      icon: 'mdi:shield-check',
      title: 'Onaylı Kalite',
      description: 'Her lead yayına alınmadan önce kalite ve doğruluk kontrollerinden geçer.'
    },
    {
      icon: 'mdi:account-group',
      title: 'Güvenilir İş Ortağı',
      description: 'Broker topluluğumuz için doğrulama süreci ve puanlama sistemi.'
    }
  ],
  showcase: {
    eyebrow: 'Vitrin leadler',
    title: 'Aktüel açık artırmalar',
    ctaText: 'Hepsini gör',
    ctaLink: '/leads'
  },
  statsHeading: {
    eyebrow: 'Güven veren rakamlar',
    title: 'Broker topluluğumuz büyümeye devam ediyor'
  },
  stats: [
    { value: '2.500+', label: 'Aktif Broker' },
    { value: '15.000+', label: 'Satılan Lead' },
    { value: '98%', label: 'Memnuniyet' },
    { value: '€2.1M', label: 'Toplam Hacim' }
  ],
  cta: {
    title: 'Başlamak için hazır mısınız?',
    subtitle: 'LeadPortal topluluğuna katılın, doğrulanmış leadlere erişin ve işinizi güvenle büyütün.',
    primaryText: 'Ücretsiz kaydol',
    primaryLink: '/login',
    secondaryText: 'Leadleri incele',
    secondaryLink: '/leads'
  }
}

const homepageContent = ref(JSON.parse(JSON.stringify(defaultHomepageContent)))

function normalizeInsuranceTypes(rawTypes) {
  if (!rawTypes || rawTypes.length === 0) {
    return [
      { name: 'Hayvan', icon: 'mdi:paw' },
      { name: 'Araba', icon: 'mdi:car' },
      { name: 'Sağlık', icon: 'mdi:heart' }
    ]
  }

  const defaultIcons = {
    Hayvan: 'mdi:paw',
    Araba: 'mdi:car',
    Sağlık: 'mdi:heart'
  }

  if (typeof rawTypes[0] === 'string') {
    return rawTypes.map(typeName => ({
      name: typeName,
      icon: defaultIcons[typeName] || 'mdi:file'
    }))
  }

  return rawTypes.map(type =>
    typeof type === 'object'
      ? { name: type.name, icon: type.icon?.includes(':') ? type.icon : `mdi:${type.icon || 'file'}` }
      : { name: String(type), icon: defaultIcons[String(type)] || 'mdi:file' }
  )
}

async function loadHomepageSettings() {
  try {
    const response = await api.get('/settings/homepage')
    const data = response.data || {}

    homepageContent.value = {
      hero: { ...defaultHomepageContent.hero, ...(data.hero || {}) },
      featureHeading: data.featureHeading || defaultHomepageContent.featureHeading,
      features:
        Array.isArray(data.features) && data.features.length ? data.features : [...defaultHomepageContent.features],
      showcase: { ...defaultHomepageContent.showcase, ...(data.showcase || {}) },
      statsHeading: { ...defaultHomepageContent.statsHeading, ...(data.statsHeading || {}) },
      stats: Array.isArray(data.stats) && data.stats.length ? data.stats : [...defaultHomepageContent.stats],
      cta: { ...defaultHomepageContent.cta, ...(data.cta || {}) }
    }

    settings.value = {
      defaultCurrency: data.defaultCurrency || 'EUR',
      insuranceTypes: normalizeInsuranceTypes(data.insuranceTypes || [])
    }
  } catch (error) {
    console.error('Ana sayfa ayarları yüklenemedi:', error)
    settings.value = {
      defaultCurrency: 'EUR',
      insuranceTypes: normalizeInsuranceTypes()
    }
    homepageContent.value = JSON.parse(JSON.stringify(defaultHomepageContent))
  }
}

async function loadShowcaseLeads() {
  showcaseError.value = ''
  isLoadingShowcase.value = true

  try {
    const { data } = await api.get('/leads', { params: { showcase: true } })
    const now = Date.now()
    showcaseLeads.value = data.map(lead => {
      const endTime = new Date(lead.endsAt).getTime()
      const isExpired = Number.isFinite(endTime) ? endTime < now : false
      return {
        ...lead,
        isExpired: isExpired,
        isActive: lead.isActive && !isExpired
      }
    })

    // Tüm vitrin lead'lerin odalarına katıl (canlı güncellemeler için)
    for (const lead of showcaseLeads.value) {
      socket.emit('join-lead', lead.id)
    }
  } catch (error) {
    console.error('Vitrin leadleri alınamadı:', error)
    showcaseError.value = 'Vitrin leadleri yüklenirken bir hata oluştu.'
  } finally {
    isLoadingShowcase.value = false
  }
}

// Zipcode verisini public/zipcodes.json üzerinden yükler ve Map'e dönüştürür
async function ensureZipcodesLoaded() {
  if (zipcodeIndex.value.size > 0) return
  try {
    const res = await fetch('/zipcodes.json')
    const arr = await res.json()
    const m = new Map()
    for (const z of arr) {
      if (z.postal) m.set(String(z.postal), { lat: Number(z.lat), lon: Number(z.lon), name: z.name })
    }
    zipcodeIndex.value = m
  } catch (e) {
    console.error('Zipcodes yüklenemedi', e)
  }
}

function getInsuranceTypeIcon(typeName) {
  if (!typeName) return 'mdi:file'
  const typeObj = settings.value.insuranceTypes.find(t => t.name === typeName)
  return typeObj?.icon || 'mdi:file'
}

function formatTimeRemaining(endsAt) {
  const now = new Date()
  const endTime = new Date(endsAt)
  const diff = endTime - now

  if (diff <= 0) return 'Süresi doldu'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (days > 0) {
    if (hours > 0) {
      return `${days} gün ${hours} saat`
    } else {
      return `${days} gün`
    }
  } else if (hours > 0) {
    if (minutes > 0) {
      return `${hours} saat ${minutes} dakika`
    } else {
      return `${hours} saat`
    }
  } else if (minutes > 0) {
    // 1 saatten az kaldığında dakika ve saniye göster
    return `${minutes}d ${seconds}s`
  } else {
    // 1 dakikadan az kaldığında sadece saniye göster
    return `${seconds}s`
  }
}

const hasShowcaseLeads = computed(() => showcaseLeads.value.length > 0)
const displayShowcaseLeads = computed(() => showcaseLeads.value)
const hasMoreThanThreeLeads = computed(() => showcaseLeads.value.length > 3)

const hero = computed(() => homepageContent.value.hero)
const featureHeading = computed(() => homepageContent.value.featureHeading)
const featureList = computed(() => homepageContent.value.features)
const showcaseContent = computed(() => homepageContent.value.showcase)
const statsHeading = computed(() => homepageContent.value.statsHeading)
const statsList = computed(() => homepageContent.value.stats)
const ctaContent = computed(() => homepageContent.value.cta)

// Drag-to-scroll için state'ler
const scrollContainer = ref(null)
const isDragging = ref(false)
const startX = ref(0)
const scrollLeft = ref(0)
const hasMoved = ref(false)

function handleScroll(event) {
  const container = event.target
  if (!container) return
  
  const scrollLeft = container.scrollLeft
  const scrollWidth = container.scrollWidth
  const clientWidth = container.clientWidth
  const remaining = scrollWidth - clientWidth - scrollLeft
  
  // Sağda kaydırılacak alan varsa sağ oku göster
  showRightScrollHint.value = remaining > 8
  // Solda kaydırılacak alan varsa sol oku göster
  showLeftScrollHint.value = scrollLeft > 8
}

// Showcase slider'ı sağa kaydır
function scrollShowcaseRight() {
  if (!scrollContainer.value) return
  scrollContainer.value.scrollBy({ left: 400, behavior: 'smooth' })
}

// Showcase slider'ı sola kaydır
function scrollShowcaseLeft() {
  if (!scrollContainer.value) return
  scrollContainer.value.scrollBy({ left: -400, behavior: 'smooth' })
}

function handleMouseDown(e) {
  if (!scrollContainer.value) return
  isDragging.value = true
  hasMoved.value = false
  const rect = scrollContainer.value.getBoundingClientRect()
  startX.value = e.pageX - rect.left
  scrollLeft.value = scrollContainer.value.scrollLeft
  scrollContainer.value.style.cursor = 'grabbing'
  scrollContainer.value.style.userSelect = 'none'
}

function handleMouseMove(e) {
  if (!isDragging.value || !scrollContainer.value) return
  e.preventDefault()
  const rect = scrollContainer.value.getBoundingClientRect()
  const x = e.pageX - rect.left
  const walk = (x - startX.value) * 1.5 // Scroll hızı çarpanı
  scrollContainer.value.scrollLeft = scrollLeft.value - walk
  hasMoved.value = true
}

function handleMouseUp() {
  if (!scrollContainer.value) return
  isDragging.value = false
  scrollContainer.value.style.cursor = 'grab'
  scrollContainer.value.style.userSelect = ''
}

// Touch events için
function handleTouchStart(e) {
  if (!scrollContainer.value) return
  isDragging.value = true
  hasMoved.value = false
  const rect = scrollContainer.value.getBoundingClientRect()
  startX.value = e.touches[0].pageX - rect.left
  scrollLeft.value = scrollContainer.value.scrollLeft
}

function handleTouchMove(e) {
  if (!isDragging.value || !scrollContainer.value) return
  e.preventDefault()
  const rect = scrollContainer.value.getBoundingClientRect()
  const x = e.touches[0].pageX - rect.left
  const walk = (x - startX.value) * 1.5
  scrollContainer.value.scrollLeft = scrollLeft.value - walk
  hasMoved.value = true
}

function handleTouchEnd() {
  isDragging.value = false
}

// Click olayını sadece drag yoksa işle
function handleCardClick(lead, event) {
  if (hasMoved.value) {
    event?.preventDefault()
    event?.stopPropagation()
    hasMoved.value = false
    return
  }
  navigateToLead(lead)
}

function openLeadDetail(leadId) {
  window.open(`/lead/${leadId}`, '_blank')
}

function navigateToLead(lead) {
  window.location.href = `/lead/${lead.id}`
}

// Placeholder functions for LeadCard component events
function showDescription(lead, event) {
  event?.stopPropagation()
  // Description modal could be implemented here if needed
  console.log('Show description for lead:', lead.id)
}

function openInstantBuyModal(lead, event) {
  event?.stopPropagation()
  // For SOFORT_KAUF check startPrice, for AUCTION check instantBuyPrice
  if (lead.leadType === 'SOFORT_KAUF') {
    // SOFORT_KAUF always has startPrice, no need to check
    selectedLead.value = lead
    showInstantBuyModal.value = true
  } else if (lead.instantBuyPrice) {
    // AUCTION must have instantBuyPrice set
    selectedLead.value = lead
    showInstantBuyModal.value = true
  }
}

function closeInstantBuyModal() {
  showInstantBuyModal.value = false
  selectedLead.value = null
}

async function handleInstantBuySuccess() {
  // Lead'leri yeniden yükle
  await loadShowcaseLeads()
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function submitQuickBid(lead, amount) {
  if (!amount || amount <= 0) {
    error('Lütfen geçerli bir teklif miktarı girin')
    return
  }

  try {
    const response = await api.post(`/bids`, {
      leadId: lead.id,
      maxBid: Math.round(Number(amount))
    }, { headers: authHeaders() })

    if (response.status === 201) {
      const data = response.data || {}
      await loadShowcaseLeads()
      if (data.isLeader) {
        const currency = settings.value?.defaultCurrency || 'EUR'
        success(`Tebrikler! Şu anda lidersiniz. Görünür fiyat: ${formatPrice(data.visiblePrice, currency)}`)
      } else {
        error('Teklifiniz alındı, ancak başka bir kullanıcının maksimumu daha yüksek. Lider olmak için daha yüksek bir maksimum teklif verin.')
      }
    }
  } catch (err) {
    const errorData = err.response?.data
    error(errorData?.error || 'Teklif verme işlemi başarısız')
  }
}

onMounted(async () => {
  await Promise.all([
    loadHomepageSettings(),
    ensureZipcodesLoaded()
  ])
  await loadShowcaseLeads()

  // Scroll durumunu kontrol et (DOM render edildikten sonra)
  await nextTick()
  if (scrollContainer.value) {
    handleScroll({ target: scrollContainer.value })
    scrollContainer.value.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', () => {
      if (scrollContainer.value) {
        handleScroll({ target: scrollContainer.value })
      }
    })
  }

  // Her yeni teklifte ilgili kartı anında güncelle
  socket.on('bid:new', ({ leadId, bid }) => {
    const idx = showcaseLeads.value.findIndex(l => l.id === leadId)
    if (idx !== -1) {
      const current = showcaseLeads.value[idx]
      const existing = current.bids || []
      showcaseLeads.value[idx] = { ...current, bids: [bid, ...existing] }
    }
  })

  // Her saniye zamanı güncelle (geri sayım için)
  const timeInterval = setInterval(() => {
    // Vue reactivity için leads array'ini güncelle
    showcaseLeads.value = [...showcaseLeads.value]
  }, 1000) // 1 saniyede bir güncelle

  // Global mouse event listener'ları (drag sırasında mouse container dışına taşınsa bile çalışsın)
  const globalMouseMove = (e) => {
    if (isDragging.value) {
      handleMouseMove(e)
    }
  }
  const globalMouseUp = () => {
    if (isDragging.value) {
      handleMouseUp()
    }
  }

  document.addEventListener('mousemove', globalMouseMove)
  document.addEventListener('mouseup', globalMouseUp)

  onUnmounted(() => {
    clearInterval(timeInterval)
    document.removeEventListener('mousemove', globalMouseMove)
    document.removeEventListener('mouseup', globalMouseUp)
    if (scrollContainer.value) {
      scrollContainer.value.removeEventListener('scroll', handleScroll)
    }
    window.removeEventListener('resize', handleScroll)
    socket.close()
  })
})
</script>

<template>
  <div class="home-page">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-inner">
        <p class="eyebrow">{{ hero.eyebrow }}</p>
        <h1 id="hero-title">
          {{ hero.title }}
          <span>{{ hero.highlight }}</span>
          {{ hero.titleSuffix }}
        </h1>
        <p class="hero-subtitle">{{ hero.subtitle }}</p>
        <div class="hero-actions">
          <a class="btn-primary" :href="hero.primaryLink || '/login'">
            {{ hero.primaryText }}
          </a>
          <a
            v-if="hero.secondaryText"
            class="btn-secondary"
            :href="hero.secondaryLink || '/leads'"
          >
            {{ hero.secondaryText }}
          </a>
        </div>
      </div>
    </section>

    <section class="features" aria-labelledby="features-title">
      <h2 id="features-title">{{ featureHeading }}</h2>
      <div class="features-grid">
        <article
          v-for="(feature, index) in featureList"
          :key="feature.title || index"
          class="feature-card"
        >
          <div class="feature-icon">
            <Icon :icon="feature.icon" height="22" width="22" />
          </div>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </article>
      </div>
    </section>

    <section class="showcase" aria-labelledby="showcase-title">
      <div class="section-header">
        <div>
          <p class="eyebrow">{{ showcaseContent.eyebrow }}</p>
          <h2 id="showcase-title">{{ showcaseContent.title }}</h2>
        </div>
        <a
          v-if="showcaseContent.ctaText"
          class="section-action"
          :href="showcaseContent.ctaLink || '/leads'"
        >
          {{ showcaseContent.ctaText }}
          <Icon icon="mdi:arrow-right" height="18" />
        </a>
      </div>

      <div v-if="isLoadingShowcase" class="showcase-state">Vitrin leadleri yükleniyor…</div>
      <div v-else-if="showcaseError" class="showcase-state error">{{ showcaseError }}</div>
      <div v-else-if="hasShowcaseLeads" class="showcase-wrapper">
        <div
          ref="scrollContainer"
          class="showcase-scroll-container"
          :class="{ 'is-dragging': isDragging }"
          @scroll="handleScroll"
          @mousedown="handleMouseDown"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <div class="showcase-grid">
            <LeadCard
              v-for="lead in displayShowcaseLeads"
              :key="lead.id"
              :lead="lead"
              :settings="settings"
              :show-quick-bid="!lead.isExpired && lead.isActive && !lead.isScheduled"
              :zipcode-index="zipcodeIndex"
              @click="handleCardClick(lead, $event)"
              @show-description="showDescription"
              @instant-buy="openInstantBuyModal"
              @submit-bid="submitQuickBid"
            />
          </div>
        </div>
        <div class="showcase-scroll-buttons">
          <button
            v-if="hasMoreThanThreeLeads && showLeftScrollHint"
            class="scroll-indicator scroll-indicator-left"
            @click="scrollShowcaseLeft"
            type="button"
            aria-label="Sola kaydır"
          >
            <Icon icon="mdi:chevron-left" height="32" width="32" />
          </button>
          <button
            v-if="hasMoreThanThreeLeads && showRightScrollHint"
            class="scroll-indicator scroll-indicator-right"
            @click="scrollShowcaseRight"
            type="button"
            aria-label="Sağa kaydır"
          >
            <Icon icon="mdi:chevron-right" height="32" width="32" />
          </button>
        </div>
    </div>
      <div v-else class="showcase-state">
        Henüz vitrine alınmış lead bulunmuyor. Yeni fırsatlar eklendikçe burada görünecek.
      </div>
    </section>

    <section class="stats" aria-labelledby="stats-title">
      <p class="eyebrow">{{ statsHeading.eyebrow }}</p>
      <h2 id="stats-title">{{ statsHeading.title }}</h2>
      <div class="stats-grid">
        <div v-for="(stat, index) in statsList" :key="stat.label || index" class="stat-card">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </div>
      </div>
    </section>

    <section class="cta" aria-labelledby="cta-title">
      <div class="cta-card">
        <div>
          <h2 id="cta-title">{{ ctaContent.title }}</h2>
          <p>{{ ctaContent.subtitle }}</p>
        </div>
        <div class="cta-actions">
          <a class="btn-primary" :href="ctaContent.primaryLink || '/login'">
            {{ ctaContent.primaryText }}
          </a>
          <a
            v-if="ctaContent.secondaryText"
            class="btn-outline"
            :href="ctaContent.secondaryLink || '/leads'"
          >
            {{ ctaContent.secondaryText }}
          </a>
        </div>
      </div>
    </section>

    <!-- Instant Buy Modal -->
    <InstantBuyModal
      :show="showInstantBuyModal"
      :lead="selectedLead"
      :currency="settings.defaultCurrency"
      @close="closeInstantBuyModal"
      @success="handleInstantBuySuccess"
    />
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 64px;
  max-width: 80%;
  margin: 0 auto;
  padding: 40px 24px 80px;
  box-sizing: border-box;
}

.hero {
  position: relative;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  padding: 64px 32px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent 60%),
    radial-gradient(circle at bottom left, rgba(37, 99, 235, 0.08), transparent 50%);
  pointer-events: none;
}

.hero-inner {
  max-width: 760px;
  margin: 0 auto;
  text-align: center;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 600;
  font-size: 0.75rem;
  color: #475569;
}

.hero h1 {
  font-size: clamp(2.4rem, 5vw, 3.6rem);
  line-height: 1.05;
  margin: 0;
  color: #0f172a;
}

.hero h1 span {
  color: #1d4ed8;
}

.hero-subtitle {
  margin: 0;
  max-width: 640px;
  line-height: 1.7;
  font-size: 1.05rem;
  color: #475569;
}

.hero-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-primary,
.btn-secondary,
.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 999px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.btn-primary {
  background: #0f172a;
  color: #fff;
  box-shadow: 0 18px 40px -24px rgba(15, 23, 42, 0.6);
}

.btn-secondary {
  background: #e8ecff;
  color: #1d4ed8;
  border: 1px solid #c7d2fe;
}

.btn-outline {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.btn-primary:hover,
.btn-secondary:hover,
.btn-outline:hover {
  transform: translateY(-2px);
}

.features {
  display: flex;
  flex-direction: column;
  gap: 32px;
  text-align: center;
}

.features h2 {
  margin: 0;
  font-size: clamp(2rem, 3.5vw, 2.6rem);
  color: #0f172a;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.feature-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #eef2ff;
  color: #1d4ed8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-card h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #0f172a;
}

.feature-card p {
  margin: 0;
  color: #475569;
  line-height: 1.5;
}

.showcase {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.section-header h2 {
  margin: 4px 0 0;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  color: #0f172a;
}

.section-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #1d4ed8;
  font-weight: 600;
  text-decoration: none;
}

.showcase-state {
  background: #fff;
  border: 1px dashed #cbd5f5;
  border-radius: 24px;
  padding: 40px;
  text-align: center;
  color: #475569;
}

.showcase-state.error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.showcase-wrapper {
  position: relative;
}

.showcase-scroll-buttons {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.scroll-indicator {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 64px;
  height: 100%;
  display: flex;
  align-items: center;
  pointer-events: auto;
  z-index: 10;
  color: #1d4ed8;
  opacity: 0.8;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s ease;
  background: transparent;
}

.scroll-indicator-left {
  left: 0;
  justify-content: flex-start;
  padding-left: 12px;
  background: linear-gradient(to left, transparent, rgba(255, 255, 255, 0.95) 30%);
  animation: pulse-scroll-left 2s ease-in-out infinite;
}

.scroll-indicator-right {
  right: 0;
  justify-content: flex-end;
  padding-right: 12px;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.95) 30%);
  animation: pulse-scroll-right 2s ease-in-out infinite;
}

.scroll-indicator:hover {
  opacity: 1;
}

@keyframes pulse-scroll-right {
  0%, 100% {
    opacity: 0.5;
    transform: translateY(-50%) translateX(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-50%) translateX(4px);
  }
}

@keyframes pulse-scroll-left {
  0%, 100% {
    opacity: 0.5;
    transform: translateY(-50%) translateX(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-50%) translateX(-4px);
  }
}

.showcase-scroll-container {
  overflow-x: auto;
  overflow-y: visible;
  scrollbar-width: none;
  scrollbar-color: #cbd5e1 #f1f5f9;
  padding-bottom: 8px;
  cursor: grab;
  user-select: none;
}

.showcase-scroll-container.is-dragging {
  cursor: grabbing;
}

.showcase-scroll-container.is-dragging * {
  pointer-events: none;
}

.showcase-scroll-container::-webkit-scrollbar {
  height: 8px;
}

.showcase-scroll-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 8px;
}

.showcase-scroll-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 8px;
}

.showcase-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.showcase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
  grid-auto-flow: column;
  grid-auto-columns: minmax(360px, 1fr);
}

.stats {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  text-align: center;
}

.stats h2 {
  margin: 0;
  font-size: clamp(2rem, 3.2vw, 2.6rem);
  color: #0f172a;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.stat-card strong {
  font-size: 1.8rem;
  color: #1d4ed8;
}

.stat-card span {
  color: #475569;
  font-size: 0.95rem;
}

.cta {
  display: flex;
  justify-content: center;
}

.cta-card {
  background: #1e293b;
  color: #fff;
  border-radius: 20px;
  padding: 40px 32px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid #334155;
}

.cta-card h2 {
  margin: 0 0 12px;
  font-size: clamp(2rem, 3.2vw, 2.6rem);
}

.cta-card p {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  max-width: 420px;
}

.cta-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

@media (max-width: 1024px) {
  .features-grid,
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .showcase-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    grid-auto-columns: minmax(320px, 1fr);
  }

  .cta-card {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }
}

@media (max-width: 768px) {
  .home-page {
    gap: 48px;
    padding: 32px 20px 64px;
  }

  .features-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .showcase-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    grid-auto-columns: minmax(300px, 1fr);
  }

  .scroll-indicator {
    width: 48px;
    padding-right: 8px;
  }

  .hero {
    padding: 56px 20px;
  }

  .hero-inner {
    max-width: 100%;
    gap: 20px;
  }

  .hero-subtitle {
    font-size: 0.95rem;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .showcase-card {
    padding: 24px 20px;
    gap: 18px;
  }

  .showcase-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .showcase-tags {
    gap: 8px;
  }

  .showcase-title {
    gap: 12px;
    align-items: flex-start;
  }

  .showcase-description {
    font-size: 0.95rem;
  }

  .showcase-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .stats {
    padding: 40px 24px;
  }

  .stat-card {
    padding: 20px;
  }

  .cta-card {
    padding: 40px 28px;
    gap: 24px;
  }

  .cta-actions {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 520px) {
  .home-page {
    gap: 40px;
    padding: 24px 16px 56px;
  }

  .hero {
    border-radius: 28px;
    padding: 44px 18px;
    text-align: left;
  }

  .hero-inner {
    align-items: flex-start;
    text-align: left;
  }

  .hero h1 {
    font-size: 2.1rem;
  }

  .hero-subtitle {
    max-width: 100%;
    line-height: 1.5;
  }

  .hero-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions a {
    justify-content: center;
  }

  .feature-card {
    padding: 24px 20px;
    gap: 12px;
  }

  .feature-card h3 {
    font-size: 1.1rem;
  }

  .feature-card p {
    font-size: 0.95rem;
  }

  .showcase-card {
    border-radius: 22px;
  }

  .showcase-meta div {
    padding-right: 8px;
  }

  .showcase-meta dt {
    font-size: 0.65rem;
  }

  .showcase-meta dd {
    font-size: 0.95rem;
  }

  .showcase-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .instant-buy {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .stats {
    border-radius: 24px;
    padding: 32px 20px;
    gap: 24px;
  }

  .stat-card strong {
    font-size: 1.5rem;
  }

  .cta-card {
    border-radius: 24px;
    padding: 32px 20px;
    align-items: flex-start;
  }

  .cta-card p {
    max-width: 100%;
    font-size: 0.95rem;
  }

  .cta-actions {
    flex-direction: column;
    gap: 12px;
  }

  .cta-actions a {
    width: 100%;
    justify-content: center;
  }

  .btn-primary,
  .btn-secondary,
  .btn-outline {
    width: 100%;
  }

  .showcase-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    grid-auto-columns: minmax(280px, 1fr);
  }

  .scroll-indicator {
    width: 40px;
    padding-right: 6px;
  }

  .scroll-indicator :deep(svg) {
    width: 24px;
    height: 24px;
  }

  .stats-grid {
    gap: 12px;
  }

  .stat-card {
    padding: 18px;
    align-items: flex-start;
    gap: 6px;
    text-align: left;
  }

  .stat-card span {
    font-size: 0.9rem;
  }
}
</style>
