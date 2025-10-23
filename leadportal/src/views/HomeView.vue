<script setup>
import { ref, onMounted, computed } from 'vue'
import { Icon } from '@iconify/vue'
import api from '@/utils/axios.js'
import { formatPrice } from '@/utils/currency.js'

const showcaseLeads = ref([])
const isLoadingShowcase = ref(false)
const showcaseError = ref('')
const settings = ref({ defaultCurrency: 'TRY', insuranceTypes: [] })
const showScrollIndicator = ref(true)

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
      defaultCurrency: data.defaultCurrency || 'TRY',
      insuranceTypes: normalizeInsuranceTypes(data.insuranceTypes || [])
    }
  } catch (error) {
    console.error('Ana sayfa ayarları yüklenemedi:', error)
    settings.value = {
      defaultCurrency: 'TRY',
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
      return {
        ...lead,
        isExpired: Number.isFinite(endTime) ? endTime < now : false
      }
    })
  } catch (error) {
    console.error('Vitrin leadleri alınamadı:', error)
    showcaseError.value = 'Vitrin leadleri yüklenirken bir hata oluştu.'
  } finally {
    isLoadingShowcase.value = false
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

  if (Number.isNaN(diff) || diff <= 0) return 'Süresi doldu'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return hours > 0 ? `${days} gün ${hours} saat` : `${days} gün`
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours} saat ${minutes} dakika` : `${hours} saat`
  }
  return `${minutes} dakika`
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

function handleScroll(event) {
  const container = event.target
  if (container.scrollLeft > 10) {
    showScrollIndicator.value = false
  } else {
    showScrollIndicator.value = true
  }
}

onMounted(async () => {
  await loadHomepageSettings()
  await loadShowcaseLeads()
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
        <div class="showcase-scroll-container" @scroll="handleScroll">
          <div class="showcase-grid">
          <article
            v-for="lead in displayShowcaseLeads"
            :key="lead.id"
            class="showcase-card"
          >
            <header class="showcase-card-header">
              <div class="showcase-tags">
                <span class="tag">Açık</span>
                <span v-if="lead.instantBuyPrice" class="tag success">Hemen Al</span>
              </div>
              <button class="card-link" type="button" @click="window.open(`/lead/${lead.id}`, '_blank')">
                Detaya git
                <Icon icon="mdi:arrow-top-right" height="18" />
              </button>
            </header>

            <div class="showcase-title">
              <Icon
                v-if="lead.insuranceType"
                class="insurance-icon"
                :icon="getInsuranceTypeIcon(lead.insuranceType)"
                height="20"
                width="20"
              />
              <div>
                <h3>{{ lead.title }}</h3>
                <p class="muted-text">
                  {{ lead.insuranceType || 'Sigorta türü belirtilmedi' }}
                </p>
              </div>
            </div>

            <p class="showcase-description">
              {{ lead.description || 'Bu lead için açıklama henüz eklenmedi.' }}
            </p>

            <dl class="showcase-meta">
              <div>
                <dt>Güncel Teklif</dt>
                <dd>
                  <strong>
                    <span v-if="lead.bids && lead.bids.length">
                      {{ formatPrice(lead.bids[0].amount, settings.defaultCurrency) }}
                    </span>
                    <span v-else>{{ formatPrice(lead.startPrice, settings.defaultCurrency) }}</span>
                  </strong>
                </dd>
              </div>
              <div>
                <dt>Teklif</dt>
                <dd>{{ lead.bids ? lead.bids.length : 0 }}</dd>
              </div>
              <div>
                <dt>Kalan Süre</dt>
                <dd>{{ formatTimeRemaining(lead.endsAt) }}</dd>
              </div>
            </dl>

            <footer class="showcase-footer">
              <div v-if="lead.instantBuyPrice" class="instant-buy">
                <span>Anında satın al</span>
                <strong>{{ formatPrice(lead.instantBuyPrice, settings.defaultCurrency) }}</strong>
              </div>
              <a class="ghost-link" :href="`/lead/${lead.id}`">
                Teklif ver
                <Icon icon="mdi:arrow-right" height="18" />
              </a>
            </footer>
          </article>
        </div>
      </div>
      <div v-if="hasMoreThanThreeLeads && showScrollIndicator" class="scroll-indicator">
        <Icon icon="mdi:chevron-right" height="32" width="32" />
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
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 80px;
  max-width: 1180px;
  margin: 0 auto;
  padding: 48px 24px 96px;
  box-sizing: border-box;
}

.hero {
  position: relative;
  background: linear-gradient(145deg, #eef2ff, #f8fafc);
  border: 1px solid #e2e8f0;
  border-radius: 36px;
  padding: 72px 24px;
  overflow: hidden;
}

.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(96, 165, 250, 0.25), transparent 55%),
    radial-gradient(circle at bottom left, rgba(37, 99, 235, 0.2), transparent 50%);
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
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
  box-shadow: 0 24px 48px -36px rgba(15, 23, 42, 0.35);
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

.scroll-indicator {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 64px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.95) 30%);
  pointer-events: none;
  z-index: 10;
  color: #1d4ed8;
  opacity: 0.8;
  animation: pulse-scroll 2s ease-in-out infinite;
}

@keyframes pulse-scroll {
  0%, 100% {
    opacity: 0.5;
    transform: translateY(-50%) translateX(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-50%) translateX(4px);
  }
}

.showcase-scroll-container {
  overflow-x: auto;
  overflow-y: visible;
  scrollbar-width: none;
  scrollbar-color: #cbd5e1 #f1f5f9;
  padding-bottom: 8px;
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

.showcase-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 28px 10px -36px rgba(15, 23, 42, 0.28);
}

.showcase-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.showcase-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #e2e8f0;
  color: #0f172a;
}

.tag.success {
  background: #dcfce7;
  color: #047857;
}

.card-link {
  border: none;
  background: transparent;
  color: #1d4ed8;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.showcase-title {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.insurance-icon {
  color: #1d4ed8;
}

.showcase-title h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}

.muted-text {
  color: #64748b;
  font-size: 0.85rem;
  margin: 4px 0 0;
}

.showcase-description {
  margin: 0;
  color: #475569;
  line-height: 1.5;
}

.showcase-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
}

.showcase-meta dt {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
  margin-bottom: 4px;
  color: #94a3b8;
}

.showcase-meta dd {
  margin: 0;
  font-weight: 600;
  color: #0f172a;
}

.showcase-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.instant-buy {
  background: #f1f5f9;
  padding: 10px 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.instant-buy span {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}

.instant-buy strong {
  color: #0f172a;
  font-size: 1rem;
}

.ghost-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #1d4ed8;
  font-weight: 600;
  text-decoration: none;
}

.stats {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 28px;
  padding: 48px 32px;
  display: flex;
  flex-direction: column;
  gap: 32px;
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
  border: 1px solid #e0e7ff;
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  box-shadow: 0 24px 48px -40px rgba(29, 78, 216, 0.4);
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
  background: #0f172a;
  color: #fff;
  border-radius: 28px;
  padding: 48px 40px;
  width: 100%;
  max-width: 980px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
  box-shadow: 0 40px 60px -48px rgba(15, 23, 42, 0.7);
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

  .showcase-meta {
    grid-template-columns: 1fr;
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
