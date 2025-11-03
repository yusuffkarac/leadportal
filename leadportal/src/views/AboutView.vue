<template>
  <div class="about-page">
    <div class="page-content">
      <!-- Hero Section -->
      <div v-if="loading" class="loading-section">
        <div class="loading-spinner"></div>
        <p>Sayfa yükleniyor...</p>
      </div>
      <div v-else class="about-hero">
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">{{ getSectionTitle('hero', 'LeadPortal Hakkında') }}</h1>
            <p class="hero-description">
              {{ getSectionContent('hero', 'Almanya\'nın önde gelen lead pazar yeri. Sigorta brokerleri için profesyonel açık artırma platformu.') }}
            </p>
            <div class="hero-stats" v-if="getSectionData('stats', 'stats')">
              <div class="stat-item" v-for="stat in getSectionData('stats', 'stats')" :key="stat.label">
                <span class="stat-number">{{ stat.number }}</span>
                <span class="stat-label">{{ stat.label }}</span>
              </div>
            </div>
            <div v-else class="hero-stats">
              <div class="stat-item">
                <span class="stat-number">500+</span>
                <span class="stat-label">Aktif Broker</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">10,000+</span>
                <span class="stat-label">Başarılı Lead</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">€2M+</span>
                <span class="stat-label">Toplam Ciro</span>
              </div>
            </div>
          </div>
          <div class="hero-image">
            <img :src="getSectionImage('hero', '/images/about-hero-team.jpg')" alt="LeadPortal Team" />
          </div>
        </div>
      </div>

      <!-- Features Section -->
      <div class="features-section">
        <div class="features-background"></div>
        <div class="features-content">
          <h2 class="section-title">Neden LeadPortal?</h2>
          <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <Icon icon="mdi:gavel" width="48" height="48" />
            </div>
            <h3 class="feature-title">Adil Açık Artırmalar</h3>
            <p class="feature-description">
              Maksimum esneklik için üç farklı açık artırma modeli ile şeffaf müzayedeler
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <Icon icon="mdi:shield-check" width="48" height="48" />
            </div>
            <h3 class="feature-title">Kontrollü Kalite</h3>
            <p class="feature-description">
              Tüm lead'ler yayınlanmadan önce kalite ve eksiksizlik açısından kontrol edilir
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <Icon icon="mdi:account-group" width="48" height="48" />
            </div>
            <h3 class="feature-title">Güvenilir</h3>
            <p class="feature-description">
              Maksimum güvenlik için değerlendirme sistemi ve tüm katılımcıların doğrulanması
            </p>
          </div>
          </div>
        </div>
      </div>

      <!-- Stats Section -->
      <div class="stats-section">
        <div class="stats-background"></div>
        <div class="stats-content">
          <h2 class="section-title">Sayılara Güvenin</h2>
          <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">2,500+</div>
            <div class="stat-label">Aktif Broker</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">15,000+</div>
            <div class="stat-label">Satılan Lead</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">98%</div>
            <div class="stat-label">Memnuniyet Oranı</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">€2.1M</div>
            <div class="stat-label">Toplam Ciro</div>
          </div>
          </div>
        </div>
      </div>

      <!-- How It Works Section -->
      <div class="how-it-works-section">
        <h2 class="section-title">Nasıl Çalışır?</h2>
        <div class="how-it-works-content">
          <div class="steps-grid">
          <div class="step-card">
            <div class="step-number">1</div>
            <h3 class="step-title">Lead Oluştur</h3>
            <p class="step-description">
              Sigorta brokerleri kaliteli lead'lerini platforma yükler ve açık artırmaya çıkarır
            </p>
          </div>
          <div class="step-card">
            <div class="step-number">2</div>
            <h3 class="step-title">Teklif Ver</h3>
            <p class="step-description">
              Diğer brokerler lead'ler için teklif verir ve en yüksek teklifi veren kazanır
            </p>
          </div>
          <div class="step-card">
            <div class="step-number">3</div>
            <h3 class="step-title">Lead'i Al</h3>
            <p class="step-description">
              Kazanan broker lead bilgilerini alır ve müşteri ile iletişime geçer
            </p>
          </div>
          </div>
          <div class="how-it-works-image">
            <img src="/images/about-how-it-works.jpg" alt="How It Works" />
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="cta-section">
        <h2 class="cta-title">Hemen Başlayın</h2>
        <p class="cta-description">
          LeadPortal'a katılın ve sigorta brokerliği işinizi büyütün
        </p>
        <div class="cta-buttons">
          <router-link to="/" class="btn btn-primary">Kayıt Ol</router-link>
          <router-link to="/" class="btn btn-secondary">Canlı Müzayedeleri İzle</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-page {
    min-height: 100vh;
  background: var(--bg);
}

.loading-section {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 60px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid var(--text);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-section p {
  color: var(--primary);
  font-size: 1.125rem;
  margin: 0;
}

.page-content {
  max-width: 90%;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Hero Section */
/* .about-hero {
  margin-bottom: 64px;
} */

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 60px;
  align-items: center;
}

.hero-text {
  text-align: left;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 16px;
  line-height: 1.2;
}

.hero-stats {
  display: flex;
  gap: 40px;
  margin-top: 40px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.hero-image img {
  width: 100%;
  height: 400px;
  object-fit: cover;
  border-radius: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .hero-content,
  .how-it-works-content {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  
  .hero-stats {
    justify-content: center;
    gap: 20px;
  }
  
  .hero-text {
    text-align: center;
  }
}

.hero-description {
  font-size: 1.125rem;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

/* Section Titles */
.section-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  text-align: center;
  margin: 0 0 48px;
}

/* Features Section */
.features-section {
  margin-bottom: 80px;
  position: relative;
  padding: 80px 0;
  border-radius: 16px;
  overflow: hidden;
}

.features-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/images/about-features-background.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.1;
  z-index: 1;
}

.features-content {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 16px;
  margin: 0 20px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
}

.feature-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px 24px;
  text-align: center;
  box-shadow: var(--shadow);
  transition: all 0.2s ease;
}

.feature-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.feature-icon {
  color: var(--primary);
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 12px;
}

.feature-description {
  font-size: 0.875rem;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

/* Stats Section */
.stats-section {
  margin-bottom: 80px;
  position: relative;
  padding: 80px 0;
  border-radius: 16px;
  overflow: hidden;
}

.stats-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/images/about-stats-background.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.1;
  z-index: 1;
}

.stats-content {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 16px;
  margin: 0 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 32px;
}

.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary);
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--muted);
  font-weight: 500;
}

/* How It Works Section */
.how-it-works-section {
  margin-bottom: 80px;
}

.how-it-works-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 60px;
  align-items: center;
}

.steps-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

.how-it-works-image img {
  width: 100%;
  height: 400px;
  object-fit: cover;
  border-radius: 12px;
}

.step-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px 24px;
  text-align: center;
  box-shadow: var(--shadow);
  position: relative;
}

.step-number {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 32px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.125rem;
}

.step-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin: 16px 0 12px;
}

.step-description {
  font-size: 0.875rem;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

/* CTA Section */
.cta-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 48px 32px;
  text-align: center;
  box-shadow: var(--shadow);
}

.cta-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 16px;
}

.cta-description {
  font-size: 1.125rem;
  color: var(--muted);
  margin: 0 0 32px;
  line-height: 1.6;
}

.cta-buttons {
    display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Responsive Design */
@media (max-width: 768px) {
  .page-content {
    padding: 24px 16px;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .section-title {
    font-size: 1.75rem;
  }
  
  .features-grid,
  .stats-grid,
  .steps-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .stats-section,
  .cta-section {
    padding: 32px 20px;
  }
  
  .cta-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .cta-buttons .btn {
    width: 100%;
    max-width: 280px;
  }
}
</style>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'
import { Icon } from '@iconify/vue'

// Data
const aboutSections = ref({})
const loading = ref(false)

// Load About sections from API
async function loadAboutSections() {
  try {
    loading.value = true
    const response = await axios.get('about')
    aboutSections.value = response.data
  } catch (error) {
    console.error('Hakkında bölümleri yüklenemedi:', error)
    // Fallback to empty object if API fails
    aboutSections.value = {}
  } finally {
    loading.value = false
  }
}

// Helper functions
function getSection(sectionName, index = 0) {
  const sections = aboutSections.value[sectionName]
  return sections && sections[index] ? sections[index] : null
}

function getSectionTitle(sectionName, fallback = '', index = 0) {
  const section = getSection(sectionName, index)
  return section?.title || fallback
}

function getSectionSubtitle(sectionName, fallback = '', index = 0) {
  const section = getSection(sectionName, index)
  return section?.subtitle || fallback
}

function getSectionContent(sectionName, fallback = '', index = 0) {
  const section = getSection(sectionName, index)
  return section?.content || fallback
}

function getSectionImage(sectionName, fallback = '', index = 0) {
  const section = getSection(sectionName, index)
  return section?.imageUrl || fallback
}

function getSectionData(sectionName, key = null, index = 0) {
  const section = getSection(sectionName, index)
  if (!section?.data) return null
  return key ? section.data[key] : section.data
}

onMounted(() => {
  loadAboutSections()
})
</script>
