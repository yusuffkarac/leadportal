<template>
  <div class="about-page">
    <div class="page-content">
      <!-- Hero Section -->
      <div class="about-hero">
        <h1 class="hero-title">LeadPortal Hakkında</h1>
        <p class="hero-description">
          Almanya'nın önde gelen lead pazar yeri. Sigorta brokerleri için profesyonel açık artırma platformu.
        </p>
      </div>

      <!-- Features Section -->
      <div class="features-section">
        <h2 class="section-title">Neden LeadPortal?</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <h3 class="feature-title">Adil Açık Artırmalar</h3>
            <p class="feature-description">
              Maksimum esneklik için üç farklı açık artırma modeli ile şeffaf müzayedeler
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <h3 class="feature-title">Kontrollü Kalite</h3>
            <p class="feature-description">
              Tüm lead'ler yayınlanmadan önce kalite ve eksiksizlik açısından kontrol edilir
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                <path d="M6 21v-2a4 4 0 0 1 4-4h.5"/>
              </svg>
            </div>
            <h3 class="feature-title">Güvenilir</h3>
            <p class="feature-description">
              Maksimum güvenlik için değerlendirme sistemi ve tüm katılımcıların doğrulanması
            </p>
          </div>
        </div>
      </div>

      <!-- Stats Section -->
      <div class="stats-section">
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
            <div class="stat-value">₺2.1M</div>
            <div class="stat-label">Toplam Ciro</div>
          </div>
        </div>
      </div>

      <!-- How It Works Section -->
      <div class="how-it-works-section">
        <h2 class="section-title">Nasıl Çalışır?</h2>
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

.page-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Hero Section */
.about-hero {
  text-align: center;
  margin-bottom: 64px;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 16px;
  line-height: 1.2;
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
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 48px 32px;
  margin-bottom: 80px;
  box-shadow: var(--shadow);
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

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
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
