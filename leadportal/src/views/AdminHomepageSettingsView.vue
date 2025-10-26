<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useAlert } from '@/composables/useAlert'
import { Icon } from '@iconify/vue'

const defaultContent = {
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

const form = ref(JSON.parse(JSON.stringify(defaultContent)))
const loading = ref(false)
const saving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const showResetModal = ref(false)
const { showAlert } = useAlert()

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function mergeContent(data) {
  return {
    hero: { ...defaultContent.hero, ...(data?.hero || {}) },
    featureHeading: data?.featureHeading || defaultContent.featureHeading,
    features: Array.isArray(data?.features) && data.features.length ? data.features : [...defaultContent.features],
    showcase: { ...defaultContent.showcase, ...(data?.showcase || {}) },
    statsHeading: { ...defaultContent.statsHeading, ...(data?.statsHeading || {}) },
    stats: Array.isArray(data?.stats) && data.stats.length ? data.stats : [...defaultContent.stats],
    cta: { ...defaultContent.cta, ...(data?.cta || {}) }
  }
}

async function loadHomepageSettings() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const { data } = await axios.get('/api/settings/homepage', { headers: authHeaders() })
    form.value = mergeContent(data)
  } catch (error) {
    console.error('Homepage settings load error:', error)
    errorMessage.value = 'Ana sayfa ayarları yüklenemedi.'
  } finally {
    loading.value = false
  }
}

function addFeature() {
  form.value.features.push({
    icon: 'mdi:information',
    title: '',
    description: ''
  })
}

function removeFeature(index) {
  if (form.value.features.length > 1) {
    form.value.features.splice(index, 1)
  }
}

function addStat() {
  form.value.stats.push({
    value: '',
    label: ''
  })
}

function removeStat(index) {
  if (form.value.stats.length > 1) {
    form.value.stats.splice(index, 1)
  }
}

function resetToDefaults() {
  showResetModal.value = true
}

async function confirmReset() {
  try {
    form.value = JSON.parse(JSON.stringify(defaultContent))
    successMessage.value = 'Ayarlar varsayılan değerlere sıfırlandı. Kaydediliyor...'
    errorMessage.value = ''
    showResetModal.value = false
    
    // Otomatik kaydet
    await saveHomepageSettings()
  } catch (error) {
    console.error('Reset error:', error)
    errorMessage.value = 'Ayarlar sıfırlanırken hata oluştu.'
  }
}

async function saveHomepageSettings() {
  saving.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const payload = {
      hero: form.value.hero,
      featureHeading: form.value.featureHeading,
      features: form.value.features,
      showcase: form.value.showcase,
      statsHeading: form.value.statsHeading,
      stats: form.value.stats,
      cta: form.value.cta
    }

    const { data } = await axios.post('/api/settings/homepage', payload, { headers: authHeaders() })
    successMessage.value = data?.message || 'Ana sayfa ayarları kaydedildi.'
    form.value = mergeContent(data?.homepage)
  } catch (error) {
    console.error('Homepage settings save error:', error)
    errorMessage.value = error.response?.data?.message || 'Ayarlar kaydedilemedi.'
  } finally {
    saving.value = false
  }
}

onMounted(loadHomepageSettings)
</script>

<template>
  <section class="section" style="max-width: 1400px; margin: 0 auto;">
    <header class="section-header">
      <div>
        <h2>Ana Sayfa Ayarları</h2>
        <p class="muted">
          Ana sayfada görünen hero, vitrin, özellik ve CTA metinlerini bu alandan düzenleyebilirsiniz.
        </p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="resetToDefaults" :disabled="saving">
          Varsayılana Sıfırla
        </button>
        <button class="btn" @click="saveHomepageSettings" :disabled="saving">
          {{ saving ? 'Kaydediliyor…' : 'Ayarları Kaydet' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="message info">Ayarlar yükleniyor…</div>
    <div v-if="errorMessage" class="message error">{{ errorMessage }}</div>
    <div v-if="successMessage" class="message success" style='margin-bottom:1%'>{{ successMessage }}</div>

    

    <div class="settings-grid">
      <!-- Hero -->
      <article class="card">
        <h3>Hero Alanı</h3>
        <div class="grid two-cols">
          <div class="stack">
            <label>Üst Başlık</label>
            <input class="input" v-model="form.hero.eyebrow" placeholder="Örn. Sigorta lead pazaryeri" />
          </div>
          <div class="stack">
            <label>Başlık (sol)</label>
            <input class="input" v-model="form.hero.title" placeholder="Örn. Almanya'nın önde gelen" />
          </div>
          <div class="stack">
            <label>Vurgulu Kelime</label>
            <input class="input" v-model="form.hero.highlight" placeholder="Örn. sigorta lead" />
          </div>
          <div class="stack">
            <label>Başlık (sağ)</label>
            <input class="input" v-model="form.hero.titleSuffix" placeholder="Örn. pazaryeri" />
          </div>
        </div>
        <div class="stack">
          <label>Açıklama</label>
          <textarea class="input" v-model="form.hero.subtitle" rows="3" />
        </div>
        <div class="grid two-cols">
          <div class="stack">
            <label>Birincil CTA Metni</label>
            <input class="input" v-model="form.hero.primaryText" placeholder="Örn. Şimdi kaydol" />
          </div>
          <div class="stack">
            <label>Birincil CTA Bağlantısı</label>
            <input class="input" v-model="form.hero.primaryLink" placeholder="Örn. /login" />
          </div>
          <div class="stack">
            <label>İkincil CTA Metni</label>
            <input class="input" v-model="form.hero.secondaryText" placeholder="Örn. Canlı açık artırmaları gör" />
          </div>
          <div class="stack">
            <label>İkincil CTA Bağlantısı</label>
            <input class="input" v-model="form.hero.secondaryLink" placeholder="Örn. /leads" />
          </div>
        </div>
      </article>

      <!-- Features -->
      <article class="card">
        <div class="card-header">
          <div>
            <h3>Öne Çıkan Özellikler</h3>
            <p class="muted small">Ana sayfadaki üçlü özellik kartlarını düzenleyin.</p>
          </div>
          <button class="btn-secondary" type="button" @click="addFeature">Özellik Ekle</button>
        </div>
        <div class="stack">
          <label>Başlık</label>
          <input class="input" v-model="form.featureHeading" placeholder="Örn. LeadPortal'ı neden seçmelisiniz?" />
        </div>
        <div class="feature-list">
          <div class="feature-item" v-for="(feature, index) in form.features" :key="index">
            <div class="feature-header">
              <strong>Özellik {{ index + 1 }}</strong>
              <button
                class="link"
                type="button"
                @click="removeFeature(index)"
                :disabled="form.features.length === 1"
              >
                Sil
              </button>
            </div>
            <div class="grid two-cols">
              <div class="stack">
                <label>Iconify ID</label>
                <input class="input" v-model="feature.icon" placeholder="Örn. mdi:shield-check" />
                <small class="muted small">Iconify formatında bir ikon ID'si girin.</small>
              </div>
              <div class="stack">
                <label>Başlık</label>
                <input class="input" v-model="feature.title" placeholder="Örn. Onaylı Kalite" />
              </div>
            </div>
            <div class="stack">
              <label>Açıklama</label>
              <textarea class="input" v-model="feature.description" rows="2" />
            </div>
          </div>
        </div>
      </article>

      <!-- Showcase -->
      <article class="card">
        <h3>Vitrin Bölümü</h3>
        <div class="grid two-cols">
          <div class="stack">
            <label>Üst Başlık</label>
            <input class="input" v-model="form.showcase.eyebrow" placeholder="Örn. Vitrin leadler" />
          </div>
          <div class="stack">
            <label>Başlık</label>
            <input class="input" v-model="form.showcase.title" placeholder="Örn. Aktüel açık artırmalar" />
          </div>
        </div>
        <div class="grid two-cols">
          <div class="stack">
            <label>Buton Metni</label>
            <input class="input" v-model="form.showcase.ctaText" placeholder="Örn. Hepsini gör" />
          </div>
          <div class="stack">
            <label>Buton Bağlantısı</label>
            <input class="input" v-model="form.showcase.ctaLink" placeholder="Örn. /leads" />
          </div>
        </div>
      </article>

      <!-- Stats -->
      <article class="card">
        <div class="card-header">
          <div>
            <h3>İstatistikler</h3>
            <p class="muted small">Güven mesajındaki istatistik kartlarını güncelleyin.</p>
          </div>
          <button class="btn-secondary" type="button" @click="addStat">İstatistik Ekle</button>
        </div>
        <div class="grid two-cols">
          <div class="stack">
            <label>Üst Başlık</label>
            <input class="input" v-model="form.statsHeading.eyebrow" placeholder="Örn. Güven veren rakamlar" />
          </div>
          <div class="stack">
            <label>Başlık</label>
            <input class="input" v-model="form.statsHeading.title" placeholder="Örn. Broker topluluğumuz büyümeye devam ediyor" />
          </div>
        </div>
        <div class="stats-list">
          <div class="stat-item" v-for="(stat, index) in form.stats" :key="index">
            <div class="stat-header">
              <strong>İstatistik {{ index + 1 }}</strong>
              <button
                class="link"
                type="button"
                @click="removeStat(index)"
                :disabled="form.stats.length === 1"
              >
                Sil
              </button>
            </div>
            <div class="grid two-cols">
              <div class="stack">
                <label>Değer</label>
                <input class="input" v-model="stat.value" placeholder="Örn. 2.500+" />
              </div>
              <div class="stack">
                <label>Etiket</label>
                <input class="input" v-model="stat.label" placeholder="Örn. Aktif Broker" />
              </div>
            </div>
          </div>
        </div>
      </article>

      <!-- CTA -->
      <article class="card">
        <h3>Alt CTA Alanı</h3>
        <div class="stack">
          <label>Başlık</label>
          <input class="input" v-model="form.cta.title" placeholder="Örn. Başlamak için hazır mısınız?" />
        </div>
        <div class="stack">
          <label>Açıklama</label>
          <textarea class="input" v-model="form.cta.subtitle" rows="2" />
        </div>
        <div class="grid two-cols">
          <div class="stack">
            <label>Birincil CTA Metni</label>
            <input class="input" v-model="form.cta.primaryText" placeholder="Örn. Ücretsiz kaydol" />
          </div>
          <div class="stack">
            <label>Birincil CTA Bağlantısı</label>
            <input class="input" v-model="form.cta.primaryLink" placeholder="Örn. /login" />
          </div>
          <div class="stack">
            <label>İkincil CTA Metni</label>
            <input class="input" v-model="form.cta.secondaryText" placeholder="Örn. Leadleri incele" />
          </div>
          <div class="stack">
            <label>İkincil CTA Bağlantısı</label>
            <input class="input" v-model="form.cta.secondaryLink" placeholder="Örn. /leads" />
          </div>
        </div>
      </article>
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
              <p>Bu işlem <strong>tüm ana sayfa ayarlarını silecek</strong> ve varsayılan ayarları yükleyecektir.</p>
              <p>Bu işlem <strong>geri alınamaz</strong>. Devam etmek istediğinizden emin misiniz?</p>
            </div>
          </div>
          <div class="default-sections-info">
            <h4>Sıfırlanacak ayarlar:</h4>
            <ul>
              <li><strong>Hero Alanı:</strong> Ana başlık ve tanıtım metinleri</li>
              <li><strong>Özellikler:</strong> Öne çıkan özellik kartları</li>
              <li><strong>Vitrin:</strong> Lead vitrin bölümü</li>
              <li><strong>İstatistikler:</strong> Güven veren rakamlar</li>
              <li><strong>CTA Alanı:</strong> Alt çağrı butonları</li>
            </ul>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="showResetModal = false">İptal</button>
            <button class="btn btn-danger" @click="confirmReset" :disabled="saving">
              {{ saving ? 'Sıfırlanıyor...' : 'Evet, Sıfırla' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.muted {
  color: #64748b;
}

.small {
  font-size: 0.85rem;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: 0 18px 36px -28px rgba(15, 23, 42, 0.35);
}

.card h3 {
  margin: 0;
  color: #0f172a;
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.grid.two-cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input {
  width: 90%;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

textarea.input {
  resize: vertical;
  min-height: 80px;
}

.btn {
  background: #0f172a;
  color: #fff;
  border: none;
  padding: 12px 20px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px -18px rgba(15, 23, 42, 0.5);
}

.btn-secondary {
  background: #e6ecff;
  color: #1d4ed8;
  border: none;
  padding: 10px 16px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #d8e2ff;
}

.link {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-weight: 600;
}

.feature-list,
.stats-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item,
.stat-item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item .grid.two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
  width: 100%;
}

.stat-item .stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.stat-item .stack label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 2px;
}

.stat-item .stack .input {
  width: 90%;
  box-sizing: border-box;
}

.feature-header,
.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.message {
  border-radius: 12px;
  padding: 14px 18px;
  font-weight: 500;
}

.message.info {
  background: #eff6ff;
  color: #1d4ed8;
}

.message.error {
  background: #fef2f2;
  color: #b91c1c;
}

.message.success {
  background: #ecfdf5;
  color: #047857;
}

@media (max-width: 768px) {
  .grid.two-cols {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
    gap: 8px;
  }

  .header-actions .btn,
  .header-actions .btn-secondary {
    flex: 1;
    min-width: 0;
  }

  .card {
    padding: 20px;
  }
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
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  color: #374151;
  background: #f3f4f6;
}

.modal-body {
  padding: 24px;
}

.warning-message {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 24px;
  padding: 16px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
}

.warning-message svg {
  color: #f59e0b;
  flex-shrink: 0;
}

.warning-message h3 {
  margin: 0 0 8px 0;
  color: #92400e;
  font-size: 1.125rem;
  font-weight: 600;
}

.warning-message p {
  margin: 0 0 8px 0;
  color: #92400e;
  line-height: 1.5;
}

.warning-message p:last-child {
  margin-bottom: 0;
}

.default-sections-info {
  margin-bottom: 24px;
}

.default-sections-info h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
}

.default-sections-info ul {
  margin: 0;
  padding-left: 20px;
  color: #6b7280;
}

.default-sections-info li {
  margin-bottom: 6px;
  line-height: 1.4;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-danger {
  background: #dc2626;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal {
    max-width: none;
  }
  
  .warning-message {
    flex-direction: column;
    text-align: center;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .form-actions .btn {
    width: 100%;
  }
}
</style>
