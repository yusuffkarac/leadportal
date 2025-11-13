<template>
  <div class="faq-page">
    <div class="page-content">
      <div class="page-header">
        <h1>Sıkça Sorulan Sorular</h1>
      </div>

      <!-- Hero Section -->
      <section class="faq-hero">
        <div class="faq-hero-content">
          <div class="faq-hero-text">
            <h2>Yardıma mı ihtiyacınız var?</h2>
            <p>LeadPortal platformumuz hakkında en çok sorulan soruları ve cevaplarını burada bulabilirsiniz. Aradığınızı bulamazsanız bizimle iletişime geçin.</p>
            <div class="faq-stats">
              <div class="stat-item">
                <span class="stat-number">500+</span>
                <span class="stat-label">Aktif Kullanıcı</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">1000+</span>
                <span class="stat-label">Başarılı Açık Artırma</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">24/7</span>
                <span class="stat-label">Destek</span>
              </div>
            </div>
          </div>
          <div class="faq-hero-image">
            <img src="/images/faq-hero-support.jpg" alt="FAQ Hero" />
          </div>
        </div>
      </section>

      <!-- FAQ Categories -->
      <section class="faq-categories">
        <div class="categories-background"></div>
        <div class="categories-content">
          <h3>Kategoriler</h3>
          <div class="category-grid">
          <div class="category-card" @click="scrollToCategory('general')">
            <div class="category-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h4>Genel Sorular</h4>
            <p>Platform hakkında temel bilgiler</p>
          </div>
          
          <div class="category-card" @click="scrollToCategory('bidding')">
            <div class="category-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h4>Teklif Verme</h4>
            <p>Açık artırmalarda teklif verme süreci</p>
          </div>
          
          <div class="category-card" @click="scrollToCategory('account')">
            <div class="category-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h4>Hesap Yönetimi</h4>
            <p>Hesap ayarları ve güvenlik</p>
          </div>
          
          <div class="category-card" @click="scrollToCategory('payment')">
            <div class="category-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <h4>Ödeme</h4>
            <p>Ödeme yöntemleri ve süreçleri</p>
          </div>
          </div>
        </div>
      </section>

      <!-- FAQ Sections -->
      <section class="faq-sections">
        <!-- Loading State -->
        <div v-if="loading" class="loading-section">
          <div class="loading-spinner"></div>
          <p>FAQ'lar yükleniyor...</p>
        </div>
        
        <!-- General Questions -->
        <div v-else-if="generalFAQs.length > 0" id="general" class="faq-section">
          <h3>Genel Sorular</h3>
          <div class="faq-item" v-for="(faq, index) in generalFAQs" :key="faq.id">
            <div class="faq-question" @click="toggleFAQ(index, 'general')">
              <h4>{{ faq.question }}</h4>
              <svg class="faq-icon" :class="{ 'rotated': faq.open }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </div>
            <div class="faq-answer" :class="{ 'open': faq.open }">
              <p>{{ faq.answer }}</p>
            </div>
          </div>
        </div>

        <!-- Bidding Questions -->
        <div v-if="biddingFAQs.length > 0" id="bidding" class="faq-section">
          <h3>Teklif Verme</h3>
          <div class="faq-item" v-for="(faq, index) in biddingFAQs" :key="faq.id">
            <div class="faq-question" @click="toggleFAQ(index, 'bidding')">
              <h4>{{ faq.question }}</h4>
              <svg class="faq-icon" :class="{ 'rotated': faq.open }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </div>
            <div class="faq-answer" :class="{ 'open': faq.open }">
              <p>{{ faq.answer }}</p>
            </div>
          </div>
        </div>

        <!-- Account Questions -->
        <div v-if="accountFAQs.length > 0" id="account" class="faq-section">
          <h3>Hesap Yönetimi</h3>
          <div class="faq-item" v-for="(faq, index) in accountFAQs" :key="faq.id">
            <div class="faq-question" @click="toggleFAQ(index, 'account')">
              <h4>{{ faq.question }}</h4>
              <svg class="faq-icon" :class="{ 'rotated': faq.open }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </div>
            <div class="faq-answer" :class="{ 'open': faq.open }">
              <p>{{ faq.answer }}</p>
            </div>
          </div>
        </div>

        <!-- Payment Questions -->
        <div v-if="paymentFAQs.length > 0" id="payment" class="faq-section">
          <h3>Ödeme</h3>
          <div class="faq-item" v-for="(faq, index) in paymentFAQs" :key="faq.id">
            <div class="faq-question" @click="toggleFAQ(index, 'payment')">
              <h4>{{ faq.question }}</h4>
              <svg class="faq-icon" :class="{ 'rotated': faq.open }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </div>
            <div class="faq-answer" :class="{ 'open': faq.open }">
              <p>{{ faq.answer }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Contact Section -->
      <section class="faq-contact">
        <div class="contact-content">
          <div class="contact-text">
            <h3>Hala sorunuz mu var?</h3>
            <p>FAQ'da aradığınızı bulamadınız mı? Bizimle iletişime geçin, size yardımcı olmaktan mutluluk duyarız.</p>
            <div class="contact-methods">
              <div class="contact-method">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>info@leadportal.com</span>
              </div>
              <div class="contact-method">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span>+90 (212) 555-0123</span>
              </div>
            </div>
          </div>
          <div class="contact-image">
            <img src="/images/faq-contact-support.jpg" alt="Contact Support" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'

// FAQ Data
const generalFAQs = ref([])
const biddingFAQs = ref([])
const accountFAQs = ref([])
const paymentFAQs = ref([])
const loading = ref(false)

// Load FAQs from API
async function loadFAQs() {
  try {
    loading.value = true
    const response = await axios.get('faq')
    const faqData = response.data
    
    // Assign FAQs to categories and add open property
    generalFAQs.value = (faqData.general || []).map(faq => ({ ...faq, open: false }))
    biddingFAQs.value = (faqData.bidding || []).map(faq => ({ ...faq, open: false }))
    accountFAQs.value = (faqData.account || []).map(faq => ({ ...faq, open: false }))
    paymentFAQs.value = (faqData.payment || []).map(faq => ({ ...faq, open: false }))
  } catch (error) {
    console.error('FAQ\'lar yüklenemedi:', error)
    // Fallback to empty arrays if API fails
    generalFAQs.value = []
    biddingFAQs.value = []
    accountFAQs.value = []
    paymentFAQs.value = []
  } finally {
    loading.value = false
  }
}

// Methods
function toggleFAQ(index, category) {
  const faqs = getFAQsByCategory(category)
  faqs.value[index].open = !faqs.value[index].open
}

function getFAQsByCategory(category) {
  switch(category) {
    case 'general': return generalFAQs
    case 'bidding': return biddingFAQs
    case 'account': return accountFAQs
    case 'payment': return paymentFAQs
    default: return generalFAQs
  }
}

function scrollToCategory(categoryId) {
  const element = document.getElementById(categoryId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

// Load FAQs on component mount
onMounted(() => {
  loadFAQs()
})
</script>

<style scoped>
.faq-page {
  min-height: 100vh;
  background: #f8f9fa;
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: var(--page-padding);
}

.page-header {
  text-align: center;
  margin-bottom: 60px;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16px;
}

.page-subtitle {
  font-size: 1.125rem;
  color: var(--primary);
  max-width: 600px;
  margin: 0 auto;
}

/* Hero Section */
.faq-hero {
  background: white;
  border-radius: 16px;
  padding: 60px 40px;
  margin-bottom: 60px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.faq-hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.faq-hero-text h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 20px;
}

.faq-hero-text p {
  font-size: 1.125rem;
  color: var(--primary);
  line-height: 1.7;
  margin-bottom: 40px;
}

.faq-stats {
  display: flex;
  gap: 40px;
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
  color: var(--primary);
  font-weight: 500;
}

.faq-hero-image img {
  width: 100%;
  height: 300px;
  object-fit: cover;
  border-radius: 12px;
}

/* Categories */
.faq-categories {
  margin-bottom: 60px;
  position: relative;
  padding: 80px 0;
  border-radius: 16px;
  overflow: hidden;
}

.categories-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/images/faq-categories-background.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.1;
  z-index: 1;
}

.categories-content {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 16px;
  margin: 0 20px;
}

.faq-categories h3 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 40px;
  text-align: center;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.category-card {
  background: white;
  padding: 32px 24px;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.category-card:hover {
  transform: translateY(-4px);
  border-color: var(--text);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

.category-icon {
  width: 60px;
  height: 60px;
  background: #f3f4f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: var(--text);
}

.category-card h4 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
}

.category-card p {
  color: var(--primary);
  font-size: 0.875rem;
}

/* FAQ Sections */
.faq-sections {
  margin-bottom: 60px;
}

.loading-section {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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

.faq-section {
  background: white;
  border-radius: 16px;
  padding: 40px;
  margin-bottom: 40px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.faq-section h3 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f3f4f6;
}

.faq-item {
  border-bottom: 1px solid #f3f4f6;
  margin-bottom: 16px;
}

.faq-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.faq-question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.faq-question:hover {
  color: var(--text);
}

.faq-question h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: inherit;
  margin: 0;
}

.faq-icon {
  transition: transform 0.3s ease;
  color: var(--primary);
}

.faq-icon.rotated {
  transform: rotate(180deg);
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.faq-answer.open {
  max-height: 200px;
}

.faq-answer p {
  padding: 0 0 20px 0;
  color: var(--primary);
  line-height: 1.7;
  margin: 0;
}

/* Contact Section */
.faq-contact {
  background: white;
  border-radius: 16px;
  padding: 60px 40px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.contact-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.contact-text h3 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 20px;
}

.contact-text p {
  font-size: 1.125rem;
  color: var(--primary);
  line-height: 1.7;
  margin-bottom: 40px;
}

.contact-methods {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.contact-method {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #f8f9fa;
  border-radius: 8px;
  color: #374151;
  font-weight: 500;
}

.contact-method svg {
  color: var(--text);
}

.contact-image img {
  width: 100%;
  height: 300px;
  object-fit: cover;
  border-radius: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .faq-hero-content,
  .contact-content {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  
  .faq-stats {
    justify-content: center;
    gap: 20px;
  }
  
  .category-grid {
    grid-template-columns: 1fr;
  }
  
  .faq-hero,
  .faq-section,
  .faq-contact {
    padding: 40px 20px;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
}
</style>
