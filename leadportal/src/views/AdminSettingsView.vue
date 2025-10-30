<template>
  <div class="admin-settings-page">
    <div class="page-content">
      <div class="page-header">
        <h1>Ayarlar</h1>
        <p class="page-subtitle">Sistem, firma ve iletişim ayarlarını buradan yönetin</p>
      </div>

      <!-- Tabs -->
      <div class="tabs-container">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Firma Ayarları Tab -->
        <div v-show="activeTab === 'company'" class="tab-panel">
          <div class="grid">
            <!-- Marka -->
            <section class="card">
              <header class="card-header">
                <div>
                  <h2>Marka</h2>
                  <p>Logo ve firma adı ayarları</p>
                </div>
              </header>

              <div class="card-body">
                <div class="field">
                  <label>Firma Adı</label>
                  <input v-model="companyName" type="text" class="input" placeholder="Örnek: LeadPortal">
                </div>

                <div class="field">
                  <label>Logo URL</label>
                  <input
                    v-model="logoUrlInput"
                    type="text"
                    class="input"
                    :disabled="logoUploadedViaFile"
                    placeholder="https://.../logo.png"
                  >
                  <small class="help">Boş bırakılırsa varsayılan logo kullanılır</small>
                </div>

                <div class="field">
                  <label>Logo Yükle</label>
                  <div class="upload">
                    <input id="company-logo-file" class="file" type="file" accept="image/*" @change="onLogoFileChange">
                    <label for="company-logo-file" class="btn btn-outline">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Dosya Seç
                    </label>
                    <span class="file-name" v-if="logoFileName">{{ logoFileName }}</span>
                    <span class="file-name muted" v-else>Seçilmedi</span>
                    <button v-if="logoUploadedViaFile" type="button" class="btn btn-danger" @click="clearLogoFile">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Kaldır
                    </button>
                  </div>
                </div>

                <div class="field" v-if="companyLogoUrl">
                  <label>Logo Önizleme</label>
                  <div class="preview">
                    <img :src="companyLogoUrl" alt="Logo Preview" />
                  </div>
                </div>

                <div class="field">
                  <label>Favicon URL</label>
                  <input
                    v-model="faviconUrlInput"
                    type="text"
                    class="input"
                    :disabled="faviconUploadedViaFile"
                    placeholder="https://.../favicon.ico"
                  >
                  <small class="help">Boş bırakılırsa varsayılan favicon kullanılır</small>
                </div>

                <div class="field">
                  <label>Favicon Yükle</label>
                  <div class="upload">
                    <input id="favicon-file" class="file" type="file" accept="image/*,.ico" @change="onFaviconFileChange">
                    <label for="favicon-file" class="btn btn-outline">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Favicon Seç
                    </label>
                    <span class="file-name" v-if="faviconFileName">{{ faviconFileName }}</span>
                    <span class="file-name muted" v-else>Seçilmedi</span>
                    <button v-if="faviconUploadedViaFile" type="button" class="btn btn-danger" @click="clearFaviconFile">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Kaldır
                    </button>
                  </div>
                </div>

                <div class="field" v-if="faviconUrl || faviconUrlInput">
                  <label>Favicon Önizleme</label>
                  <div class="preview favicon-preview">
                    <img :src="faviconUrlInput || faviconUrl" alt="Favicon Preview" />
                  </div>
                </div>
              </div>

              <footer class="card-footer">
                <button class="btn btn-primary" @click="saveBranding" :disabled="savingBranding">
                  <span v-if="savingBranding" class="spinner-sm"></span>
                  <span v-else>Kaydet</span>
                </button>
              </footer>
            </section>

            <!-- Footer Ayarları -->
            <section class="card">
              <header class="card-header">
                <div>
                  <h2>Footer Ayarları</h2>
                  <p>İletişim, linkler ve yasal bilgiler</p>
                </div>
              </header>

              <div class="card-body">
                <!-- Marka Bilgileri -->
                <div class="section-group">
                  <h3>Marka Bilgileri</h3>
                  <div class="field">
                    <label>Firma Açıklaması</label>
                    <textarea v-model="footerDescription" class="textarea" rows="3" placeholder="Almanya'nın önde gelen lead pazar yeri..."></textarea>
                  </div>
                  <div class="field">
                    <label>Telefon</label>
                    <input v-model="footerPhone" type="text" class="input" placeholder="+90 (212) 123 45 67">
                  </div>
                  <div class="field">
                    <label>E-posta</label>
                    <input v-model="footerEmail" type="email" class="input" placeholder="info@example.com">
                  </div>
                </div>

                <!-- Hizmetler Linkleri -->
                <div class="section-group">
                  <h3>Hizmetler Linkleri</h3>
                  <div class="links-container">
                    <div v-for="(link, index) in servicesLinks" :key="index" class="link-item">
                      <input v-model="link.text" type="text" class="input" placeholder="Link metni">
                      <input v-model="link.url" type="text" class="input" placeholder="URL">
                      <button type="button" class="btn btn-danger btn-sm" @click="removeServiceLink(index)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    <button type="button" class="btn btn-outline btn-sm" @click="addServiceLink">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Hizmet Linki Ekle
                    </button>
                  </div>
                </div>

                <!-- Destek Linkleri -->
                <div class="section-group">
                  <h3>Destek Linkleri</h3>
                  <div class="links-container">
                    <div v-for="(link, index) in supportLinks" :key="index" class="link-item">
                      <input v-model="link.text" type="text" class="input" placeholder="Link metni">
                      <input v-model="link.url" type="text" class="input" placeholder="URL">
                      <button type="button" class="btn btn-danger btn-sm" @click="removeSupportLink(index)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    <button type="button" class="btn btn-outline btn-sm" @click="addSupportLink">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Destek Linki Ekle
                    </button>
                  </div>
                </div>

                <!-- Yasal Linkleri -->
                <div class="section-group">
                  <h3>Yasal Linkleri</h3>
                  <div class="links-container">
                    <div v-for="(link, index) in legalLinks" :key="index" class="link-item">
                      <input v-model="link.text" type="text" class="input" placeholder="Link metni">
                      <input v-model="link.url" type="text" class="input" placeholder="URL">
                      <button type="button" class="btn btn-danger btn-sm" @click="removeLegalLink(index)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    <button type="button" class="btn btn-outline btn-sm" @click="addLegalLink">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Yasal Link Ekle
                    </button>
                  </div>
                </div>

                <!-- Sosyal Medya -->
                <div class="section-group">
                  <h3>Sosyal Medya</h3>
                  <div class="field">
                    <label>Facebook URL</label>
                    <input v-model="socialMedia.facebook" type="url" class="input" placeholder="https://facebook.com/yourpage">
                  </div>
                  <div class="field">
                    <label>Twitter URL</label>
                    <input v-model="socialMedia.twitter" type="url" class="input" placeholder="https://twitter.com/yourpage">
                  </div>
                  <div class="field">
                    <label>LinkedIn URL</label>
                    <input v-model="socialMedia.linkedin" type="url" class="input" placeholder="https://linkedin.com/company/yourpage">
                  </div>
                  <div class="field">
                    <label>Instagram URL</label>
                    <input v-model="socialMedia.instagram" type="url" class="input" placeholder="https://instagram.com/yourpage">
                  </div>
                </div>

                <!-- Alt Bilgi -->
                <div class="section-group">
                  <h3>Alt Bilgi</h3>
                  <div class="field">
                    <label>Telif Hakkı Notu</label>
                    <input v-model="footerNote" type="text" class="input" placeholder="© 2024 Firma. Tüm hakları saklıdır.">
                  </div>
                  <div class="field">
                    <label>Ticaret Sicil No</label>
                    <input v-model="tradeRegisterNumber" type="text" class="input" placeholder="İstanbul Ticaret Sicil No: 12345">
                  </div>
                </div>
              </div>

              <footer class="card-footer">
                <button class="btn btn-primary" @click="saveFooter" :disabled="savingFooter">
                  <span v-if="savingFooter" class="spinner-sm"></span>
                  <span v-else>Footer'ı Kaydet</span>
                </button>
              </footer>
            </section>
          </div>
        </div>

        <!-- Uygulama Ayarları Tab -->
        <div v-show="activeTab === 'application'" class="tab-panel">
          <div class="settings-sections">
            <!-- SMTP Ayarları -->
            <div class="settings-section">
              <div class="section-header-main">
                <h2>SMTP Ayarları</h2>
                <p>Uygulamanın e-posta gönderebilmesi için sunucu bilgileri</p>
              </div>
              <div class="settings-content">
                <div class="setting-group">
                  <label class="setting-label">SMTP Sunucu</label>
                  <input v-model="settings.smtpHost" type="text" placeholder="smtp.example.com" />
                </div>
                <div class="setting-group">
                  <label class="setting-label">Port</label>
                  <input v-model.number="settings.smtpPort" type="number" min="1" />
                </div>
                <div class="setting-group">
                  <label class="setting-label">Kullanıcı Adı</label>
                  <input v-model="settings.smtpUser" type="text" placeholder="user@example.com" />
                </div>
                <div class="setting-group">
                  <label class="setting-label">Parola</label>
                  <input v-model="settings.smtpPass" type="password" />
                </div>
                <div class="setting-group">
                  <label class="setting-label">Gönderen Adı</label>
                  <input v-model="settings.smtpFromName" type="text" placeholder="LeadPortal" />
                </div>
                <div class="setting-group">
                  <div class="toggle-container">
                    <label class="setting-label">TLS kullan</label>
                    <input type="checkbox" v-model="settings.smtpUseTLS" />
                  </div>
                </div>
                <div class="setting-group">
                  <div class="toggle-container">
                    <label class="setting-label">SSL kullan</label>
                    <input type="checkbox" v-model="settings.smtpUseSSL" />
                  </div>
                </div>
                <div>
                  <button class="btn btn-primary" @click="saveGeneralSettings" :disabled="savingGeneral">
                    <span v-if="savingGeneral" class="spinner-sm"></span>
                    <span v-else>SMTP Kaydet</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Lead ID Format -->
            <div class="settings-section">
              <div class="section-header-main">
                <h2>Lead ID Formatı</h2>
                <p>Lead'lerin nasıl numaralandırılacağını belirleyin</p>
              </div>
              
              <div class="settings-content">
                <div class="setting-group">
                  <label class="setting-label">ID Formatı</label>
                  <div class="format-options">
                    <label class="format-option" :class="{ active: settings.leadIdFormat === 'numeric' }">
                      <input 
                        type="radio" 
                        v-model="settings.leadIdFormat" 
                        value="numeric"
                        @change="updateSettings"
                      >
                      <div class="option-content">
                        <div class="option-title">Sayısal (1, 2, 3...)</div>
                        <div class="option-preview">Örnek: 1, 2, 3, 1001</div>
                      </div>
                    </label>

                    <label class="format-option" :class="{ active: settings.leadIdFormat === 'prefixed-numeric' }">
                      <input 
                        type="radio" 
                        v-model="settings.leadIdFormat" 
                        value="prefixed-numeric"
                        @change="updateSettings"
                      >
                      <div class="option-content">
                        <div class="option-title">Ön Ekli Sayısal (LEAD-1, LEAD-2...)</div>
                        <div class="option-preview">Örnek: LEAD-1, LEAD-2, LEAD-1001</div>
                      </div>
                    </label>

                    <label class="format-option" :class="{ active: settings.leadIdFormat === 'date-numeric' }">
                      <input 
                        type="radio" 
                        v-model="settings.leadIdFormat" 
                        value="date-numeric"
                        @change="updateSettings"
                      >
                      <div class="option-content">
                        <div class="option-title">Tarihli Sayısal (20241201-1, 20241201-2...)</div>
                        <div class="option-preview">Örnek: 20241201-1, 20241201-2</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div v-if="settings.leadIdFormat === 'prefixed-numeric'" class="setting-group">
                  <label class="setting-label">Ön Ek</label>
                  <input 
                    v-model="settings.leadPrefix" 
                    type="text" 
                    class="form-input"
                    placeholder="LEAD"
                    @input="updateSettings"
                  >
                </div>

                <div class="setting-group">
                  <label class="setting-label">Başlangıç Numarası</label>
                  
                  <input 
                    v-model.number="settings.startingNumber" 
                    type="number" 
                    class="form-input"
                    min="1"
                    @input="updateSettings"
                  >
                  
                  <small class="form-help">Yeni lead'ler bu numaradan başlayacak</small>
                </div>

                <div class="setting-group">
                  <label class="setting-label">Önizleme</label>
                  <div class="preview-box">
                    <div class="preview-item" v-for="i in 3" :key="i">
                      {{ generatePreviewId(i) }}
                    </div>
                  </div>
                </div>
                
                <div class="save-section" style="justify-content:flex-end;">
                  <button class="btn btn-primary" @click="saveLeadIdSettings" :disabled="savingLeadId">
                    <span v-if="savingLeadId" class="spinner-sm"></span>
                    <span v-else>Lead ID Ayarlarını Kaydet</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Insurance Types -->
            <div class="settings-section">
              <div class="section-header-main">
                <h2>Sigorta Türleri</h2>
                <p>Lead'lerde kullanılacak sigorta türlerini yönetin</p>
              </div>
              
              <div class="settings-content">
                <div class="setting-group">
                  <label class="setting-label">Mevcut Sigorta Türleri</label>
                  <div class="insurance-types-list">
                    <div v-for="(type, index) in settings.insuranceTypes" :key="index" class="insurance-type-item-with-icon">
                      <div class="icon-preview">
                        <Icon :icon="(type && type.icon) ? type.icon : 'mdi:file'" width="20" height="20" />
                      </div>
                      <input 
                        v-model="settings.insuranceTypes[index].name" 
                        type="text" 
                        class="insurance-type-input" 
                        placeholder="Tür Adı"
                      />
                      <div class="icon-picker">
                        <button type="button" class="icon-picker-trigger" @click="toggleIconPicker(index)">
                          <Icon :icon="settings.insuranceTypes[index].icon || 'mdi:file'" width="18" height="18" />
                          <span>{{ settings.insuranceTypes[index].icon || 'İkon seçin' }}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>
                      <Teleport to="body">
                        <div v-if="iconPickerOpenIndex === index" class="icon-picker-modal-overlay" @click="closeIconPicker">
                          <div class="icon-picker-modal-content" @click.stop>
                            <IconifyPicker v-model="settings.insuranceTypes[index].icon" @close="closeIconPicker" />
                          </div>
                        </div>
                      </Teleport>
                      <button @click="removeInsuranceType(index)" class="btn-remove" type="button">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <button @click="addInsuranceType" class="btn btn-secondary" type="button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Yeni Sigorta Türü Ekle
                  </button>
                </div>
                
                <div class="setting-actions">
                  <button class="btn btn-primary" @click="saveInsuranceTypes" :disabled="savingInsuranceTypes">
                    <span v-if="savingInsuranceTypes" class="spinner-sm"></span>
                    <span v-else>Sigorta Türlerini Kaydet</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Genel Ayarlar -->
            <div class="settings-section">
              <div class="section-header-main">
                <h2>Genel Ayarlar</h2>
                <p>Diğer sistem ayarları</p>
              </div>

              <div class="settings-content">
                <div class="setting-group">
                  <label class="setting-label">Varsayılan Para Birimi</label>
                  <select v-model="settings.defaultCurrency" class="form-select" @change="updateSettings">
                    <option value="EUR">Euro (€)</option>
                    <option value="TRY">Türk Lirası (₺)</option>
                    <option value="USD">Amerikan Doları ($)</option>
                  </select>
                </div>

                <div class="setting-group">
                  <label class="setting-label">Varsayılan Açık Artırma Süresi (Gün)</label>
                  <input
                    v-model.number="settings.defaultAuctionDays"
                    type="number"
                    class="form-input"
                    min="1"
                    max="30"
                    @input="updateSettings"
                  >
                </div>

                <div class="setting-group">
                  <label class="setting-label">Varsayılan Minimum Artış</label>
                  <input
                    v-model.number="settings.defaultMinIncrement"
                    type="number"
                    class="form-input"
                    min="1"
                    step="0.01"
                    @input="updateSettings"
                  >
                </div>

                <div class="setting-group">
                  <label class="setting-label">Teklif Verme Saatleri Kısıtlaması</label>
                  <div class="toggle-container">
                    <label class="toggle-switch">
                      <input
                        type="checkbox"
                        v-model="settings.enableBiddingHours"
                        @change="updateSettings"
                      >
                      <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-label">
                      {{ settings.enableBiddingHours ? 'Açık' : 'Kapalı' }}
                    </span>
                  </div>
                  <small class="form-help">
                    Teklif verme saatlerini kısıtlamak için bu seçeneği aktif edin
                  </small>
                </div>

                <div v-if="settings.enableBiddingHours" class="setting-group">
                  <label class="setting-label">Teklif Verme Başlangıç Saati</label>
                  <input
                    v-model="settings.biddingStartHour"
                    type="time"
                    class="form-input"
                    @input="updateSettings"
                  >
                  <small class="form-help">
                    Kullanıcılar bu saatten itibaren teklif verebilir
                  </small>
                </div>

                <div v-if="settings.enableBiddingHours" class="setting-group">
                  <label class="setting-label">Teklif Verme Bitiş Saati</label>
                  <input
                    v-model="settings.biddingEndHour"
                    type="time"
                    class="form-input"
                    @input="updateSettings"
                  >
                  <small class="form-help">
                    Kullanıcılar bu saate kadar teklif verebilir
                  </small>
                </div>

                <div class="setting-group">
                  <label class="setting-label">Bakım Modu</label>
                  <div class="toggle-container">
                    <label class="toggle-switch">
                      <input
                        type="checkbox"
                        v-model="settings.maintenanceMode"
                        @change="updateSettings"
                      >
                      <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-label">
                      {{ settings.maintenanceMode ? 'Açık' : 'Kapalı' }}
                    </span>
                  </div>
                  <small class="form-help">
                    Bakım modu açıkken sadece admin kullanıcıları sisteme erişebilir
                  </small>
                </div>

                <div v-if="settings.maintenanceMode" class="setting-group">
                  <label class="setting-label">Bakım Mesajı</label>
                  <textarea
                    v-model="settings.maintenanceMessage"
                    class="form-textarea"
                    rows="3"
                    placeholder="Kullanıcılara gösterilecek bakım mesajı"
                    @input="updateSettings"
                  ></textarea>
                  <small class="form-help">
                    Bu mesaj bakım modu sırasında kullanıcılara gösterilir
                  </small>
                </div>
                
                <div class="save-section" style="justify-content:flex-end;">
                  <button class="btn btn-primary" @click="saveGeneralSettings" :disabled="savingGeneral">
                    <span v-if="savingGeneral" class="spinner-sm"></span>
                    <span v-else>Genel Ayarları Kaydet</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div v-if="message" class="message" :class="messageType">{{ message }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import api from '@/utils/axios.js'
import { Icon } from '@iconify/vue'
import IconifyPicker from '@/components/IconifyPicker.vue'
import { useAlert } from '@/composables/useAlert.js'

const { success, error } = useAlert()


// Tab icons as render functions
const BuildingIcon = () => h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M3 21h18' }),
  h('path', { d: 'M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1' }),
  h('path', { d: 'M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16' })
])

const SettingsIcon = () => h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('circle', { cx: 12, cy: 12, r: 3 }),
  h('path', { d: 'M12 1v6m0 6v6M6.34 6.34l4.24 4.24m5.66 0l4.24-4.24M1 12h6m6 0h6M6.34 17.66l4.24-4.24m5.66 0l4.24 4.24' })
])

const tabs = [
  { id: 'company', label: 'Firma Ayarları', icon: BuildingIcon },
  { id: 'application', label: 'Uygulama Ayarları', icon: SettingsIcon }
]

const activeTab = ref('company')
const message = ref('')
const messageType = ref('')

// Company Settings
const companyName = ref('LeadPortal')
const companyLogoUrl = ref('')
const logoUrlInput = ref('')
const logoFileName = ref('')
const logoUploadedViaFile = ref(false)

const faviconUrl = ref('')
const faviconUrlInput = ref('')
const faviconFileName = ref('')
const faviconUploadedViaFile = ref(false)

const savingBranding = ref(false)

const footerPhone = ref('')
const footerEmail = ref('')
const footerNote = ref('')
const footerDescription = ref('')
const tradeRegisterNumber = ref('')
const savingFooter = ref(false)

const servicesLinks = ref([])
const supportLinks = ref([])
const legalLinks = ref([])

const socialMedia = ref({
  facebook: '',
  twitter: '',
  linkedin: '',
  instagram: ''
})

// Application Settings
const settings = ref({
  leadIdFormat: 'numeric',
  customFormat: 'L{YYYY}{MM}{DD}-{NUM}',
  leadPrefix: 'LEAD',
  startingNumber: 1,
  numberType: 'sequential',
  defaultCurrency: 'EUR',
  defaultAuctionDays: 7,
  defaultMinIncrement: 10,
  insuranceTypes: [
    { name: 'Hayvan', icon: 'mdi:paw' },
    { name: 'Araba', icon: 'mdi:car' },
    { name: 'Sağlık', icon: 'mdi:heart' }
  ],
  enableBiddingHours: false,
  biddingStartHour: '08:00',
  biddingEndHour: '20:00',
  maintenanceMode: false,
  maintenanceMessage: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
  smtpHost: '',
  smtpPort: 465,
  smtpUser: '',
  smtpPass: '',
  smtpFromName: 'LeadPortal',
  smtpUseTLS: false,
  smtpUseSSL: true
})

// Iconify tabanlı picker kontrol durumu
const iconPickerOpenIndex = ref(null)

function toggleIconPicker(index) {
  iconPickerOpenIndex.value = iconPickerOpenIndex.value === index ? null : index
}

function closeIconPicker() {
  iconPickerOpenIndex.value = null
}

// Seçim IconifyPicker üzerinden yapılır

const savingGeneral = ref(false)
const savingLeadId = ref(false)
const savingInsuranceTypes = ref(false)

// Load branding settings
async function loadFromStorage() {
  try {
    const response = await api.get('/settings/branding')
    const brandingSettings = response.data
    
    if (brandingSettings) {
      companyName.value = brandingSettings.companyName || 'LeadPortal'
      companyLogoUrl.value = brandingSettings.companyLogoUrl || ''
      logoUrlInput.value = companyLogoUrl.value && !companyLogoUrl.value.startsWith('data:') ? companyLogoUrl.value : ''
      logoUploadedViaFile.value = !!(companyLogoUrl.value && companyLogoUrl.value.startsWith('data:'))
      logoFileName.value = logoUploadedViaFile.value ? 'Yüklendi (data URL)' : ''

      faviconUrl.value = brandingSettings.faviconUrl || ''
      faviconUrlInput.value = faviconUrl.value && !faviconUrl.value.startsWith('data:') ? faviconUrl.value : ''
      faviconUploadedViaFile.value = !!(faviconUrl.value && faviconUrl.value.startsWith('data:'))
      faviconFileName.value = faviconUploadedViaFile.value ? 'Yüklendi (sıkıştırılmış)' : ''

      footerPhone.value = brandingSettings.footerPhone || ''
      footerEmail.value = brandingSettings.footerEmail || ''
      footerNote.value = brandingSettings.footerNote || ''
      footerDescription.value = brandingSettings.footerDescription || ''
      tradeRegisterNumber.value = brandingSettings.tradeRegisterNumber || ''
      
      servicesLinks.value = brandingSettings.servicesLinks || []
      supportLinks.value = brandingSettings.supportLinks || []
      legalLinks.value = brandingSettings.legalLinks || []
      
      socialMedia.value = brandingSettings.socialMedia || { facebook: '', twitter: '', linkedin: '', instagram: '' }
    }
  } catch (error) {
    console.error('Ayarlar yüklenemedi:', error)
  }
}

// Load application settings
async function loadSettings() {
  try {
    const response = await api.get('/settings')
    if (response.data) {
      settings.value = { ...settings.value, ...response.data }
      
      // Eski format compatibility kontrolü (Iconify şemasına çevir)
      if (settings.value.insuranceTypes && Array.isArray(settings.value.insuranceTypes)) {
        const firstItem = settings.value.insuranceTypes[0]
        
        if (typeof firstItem === 'string') {
          // String array formatında, yeni (Iconify) formata çevir
          const defaultIcons = {
            'Hayvan': 'mdi:paw',
            'Araba': 'mdi:car',
            'Sağlık': 'mdi:heart'
          }
          settings.value.insuranceTypes = settings.value.insuranceTypes.map(name => ({
            name: name,
            icon: defaultIcons[name] || 'mdi:file'
          }))
        } else if (firstItem && typeof firstItem === 'object') {
          // Object: eksik/yanlış alanları tamamla (FA -> Iconify dönüşüm)
          const faToMdi = {
            'fa-paw': 'mdi:paw',
            'fa-car': 'mdi:car',
            'fa-heart': 'mdi:heart',
            'fa-file': 'mdi:file',
            'fa-file-alt': 'mdi:file',
            'fa-briefcase': 'mdi:briefcase',
            'fa-home': 'mdi:home',
            'fa-user': 'mdi:account'
          }
          settings.value.insuranceTypes = settings.value.insuranceTypes.map(type => {
            const n = (type.name || '').trim()
            let icon = (type.icon || '').trim()
            if (icon.includes(':')) {
              // already iconify
            } else if (/^fa[- ]/i.test(icon)) {
              icon = faToMdi[icon] || ''
            } else if (icon) {
              icon = `mdi:${icon}`
            } else {
              icon = 'mdi:file'
            }
            return { name: n, icon }
          })
        }
      }
    }
  } catch (error) {
    console.error('Ayarlar yüklenemedi:', error)
  }
}

// Logo handlers
function onLogoFileChange(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    companyLogoUrl.value = reader.result
    logoUrlInput.value = ''
    logoUploadedViaFile.value = true
    logoFileName.value = file.name
  }
  reader.readAsDataURL(file)
}

function clearLogoFile() {
  companyLogoUrl.value = ''
  logoUrlInput.value = ''
  logoUploadedViaFile.value = false
  logoFileName.value = ''
  const input = document.getElementById('company-logo-file')
  if (input) input.value = ''
}

// Favicon handlers
function onFaviconFileChange(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 32, 32)
      
      const compressedDataUrl = canvas.toDataURL('image/png', 0.8)
      
      faviconUrl.value = compressedDataUrl
      faviconUrlInput.value = ''
      faviconUploadedViaFile.value = true
      faviconFileName.value = file.name
    }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
}

function clearFaviconFile() {
  faviconUrl.value = ''
  faviconUrlInput.value = ''
  faviconUploadedViaFile.value = false
  faviconFileName.value = ''
  const input = document.getElementById('favicon-file')
  if (input) input.value = ''
}

// Link management
function addServiceLink() {
  servicesLinks.value.push({ text: '', url: '' })
}

function removeServiceLink(index) {
  servicesLinks.value.splice(index, 1)
}

function addSupportLink() {
  supportLinks.value.push({ text: '', url: '' })
}

function removeSupportLink(index) {
  supportLinks.value.splice(index, 1)
}

function addLegalLink() {
  legalLinks.value.push({ text: '', url: '' })
}

function removeLegalLink(index) {
  legalLinks.value.splice(index, 1)
}

// Save branding
function updateFavicon(url) {
  if (!url) return
  
  try {
    if (url.startsWith('data:')) {
      createFaviconFromDataUrl(url)
      return
    }
    
    setFaviconLink(url)
  } catch (error) {
    console.error('Favicon güncellenirken hata:', error)
  }
}

function createFaviconFromDataUrl(dataUrl) {
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, 32, 32)
    
    const faviconUrl = canvas.toDataURL('image/png')
    setFaviconLink(faviconUrl)
  }
  img.src = dataUrl
}

function setFaviconLink(url) {
  const existingLinks = document.querySelectorAll("link[rel*='icon']")
  existingLinks.forEach(link => link.remove())
  
  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/png'
  link.href = url
  link.setAttribute('data-dynamic', 'true')
  
  if (!url.includes('?') && !url.startsWith('data:') && !url.startsWith('blob:')) {
    link.href += '?v=' + Date.now()
  }
  
  document.getElementsByTagName('head')[0].appendChild(link)
}

async function saveBranding() {
  try {
    savingBranding.value = true
    message.value = ''
    
    const finalLogoUrl = logoUrlInput.value || companyLogoUrl.value
    const finalFaviconUrl = faviconUrlInput.value || faviconUrl.value
    
    if (finalFaviconUrl && finalFaviconUrl.startsWith('data:')) {
      const sizeInBytes = new Blob([finalFaviconUrl]).size
      const sizeInMB = sizeInBytes / (1024 * 1024)
      
      if (sizeInMB > 2) {
        const errorMsg = 'Favicon çok büyük, lütfen daha küçük bir resim seçin (max 2MB)'
        error(errorMsg)
        message.value = errorMsg
        messageType.value = 'error'
        return
      }
    }
    
    const response = await api.post('/settings/branding', {
      companyName: companyName.value || 'LeadPortal',
      companyLogoUrl: finalLogoUrl || '',
      faviconUrl: finalFaviconUrl || ''
    })
    
    if (response.data.settings) {
      localStorage.setItem('branding_cache', JSON.stringify(response.data.settings))
      localStorage.setItem('branding_cache_timestamp', Date.now().toString())
    }
    
    if (finalFaviconUrl) {
      updateFavicon(finalFaviconUrl)
    }
    
    window.dispatchEvent(new Event('settings-change'))
    success('Marka ayarları başarıyla kaydedildi!')
    message.value = 'Marka ayarları kaydedildi!'
    messageType.value = 'success'
  } catch (e) {
    const errorMsg = 'Marka ayarları kaydedilemedi'
    error(errorMsg)
    message.value = errorMsg
    messageType.value = 'error'
    console.error('Branding save error:', e)
  } finally {
    savingBranding.value = false
  }
}

async function saveFooter() {
  try {
    savingFooter.value = true
    message.value = ''
    
    const response = await api.post('/settings/branding', {
      footerPhone: footerPhone.value || '',
      footerEmail: footerEmail.value || '',
      footerNote: footerNote.value || '',
      footerDescription: footerDescription.value || '',
      tradeRegisterNumber: tradeRegisterNumber.value || '',
      servicesLinks: servicesLinks.value,
      supportLinks: supportLinks.value,
      legalLinks: legalLinks.value,
      socialMedia: socialMedia.value
    })
    
    if (response.data.settings) {
      localStorage.setItem('branding_cache', JSON.stringify(response.data.settings))
      localStorage.setItem('branding_cache_timestamp', Date.now().toString())
    }
    
    window.dispatchEvent(new Event('settings-change'))
    success('Footer ayarları başarıyla kaydedildi!')
    message.value = 'Footer ayarları kaydedildi!'
    messageType.value = 'success'
  } catch (e) {
    const errorMsg = 'Footer ayarları kaydedilemedi'
    error(errorMsg)
    message.value = errorMsg
    messageType.value = 'error'
    console.error('Footer save error:', e)
  } finally {
    savingFooter.value = false
  }
}

// Application settings
function generatePreviewId(index) {
  let num = settings.value.startingNumber + index - 1
  
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  
  switch (settings.value.leadIdFormat) {
    case 'numeric':
      return num.toString()
    case 'prefixed-numeric':
      return `${settings.value.leadPrefix}-${num}`
    case 'date-numeric':
      return `${year}${month}${day}-${num}`
    default:
      return num.toString()
  }
}

async function updateSettings() {
  // Önizleme için
}

async function saveGeneralSettings() {
  try {
    savingGeneral.value = true
    message.value = ''
    await api.post('/settings', settings.value)
    success('Genel ayarlar başarıyla kaydedildi!')
    message.value = 'Genel ayarlar kaydedildi!'
    messageType.value = 'success'
  } catch (err) {
    const errorMsg = err.response?.data?.message || 'Genel ayarlar kaydedilemedi'
    error(errorMsg)
    message.value = errorMsg
    messageType.value = 'error'
  } finally {
    savingGeneral.value = false
  }
}

async function saveLeadIdSettings() {
  try {
    savingLeadId.value = true
    message.value = ''
    await api.post('/settings', settings.value)
    success('Lead ID ayarları başarıyla kaydedildi!')
    message.value = 'Lead ID ayarları kaydedildi!'
    messageType.value = 'success'
  } catch (err) {
    const errorMsg = err.response?.data?.message || 'Lead ID ayarları kaydedilemedi'
    error(errorMsg)
    message.value = errorMsg
    messageType.value = 'error'
  } finally {
    savingLeadId.value = false
  }
}

function addInsuranceType() {
  settings.value.insuranceTypes.push({ name: '', icon: 'fa-file-alt' })
}

function removeInsuranceType(index) {
  if (settings.value.insuranceTypes.length > 1) {
    settings.value.insuranceTypes.splice(index, 1)
  }
}

async function saveInsuranceTypes() {
  try {
    savingInsuranceTypes.value = true
    message.value = ''
    
    // Validate: her type'ın name'i olmalı
    const filteredTypes = settings.value.insuranceTypes.filter(type => 
      type && typeof type === 'object' && type.name && type.name.trim() !== ''
    )
    
    if (filteredTypes.length === 0) {
      error('En az bir sigorta türü olmalıdır')
      message.value = 'En az bir sigorta türü olmalıdır'
      messageType.value = 'error'
      return
    }
    
    // Her type için icon yoksa default icon ekle (Iconify)
    filteredTypes.forEach(type => {
      if (!type.icon || type.icon.trim() === '') {
        type.icon = 'mdi:file'
      }
    })
    
    settings.value.insuranceTypes = filteredTypes
    await api.post('/settings', settings.value)
    success('Sigorta türleri başarıyla kaydedildi!')
    message.value = 'Sigorta türleri kaydedildi!'
    messageType.value = 'success'
  } catch (err) {
    const errorMessage = err.response?.data?.message || 'Sigorta türleri kaydedilemedi'
    error(errorMessage)
    message.value = errorMessage
    messageType.value = 'error'
  } finally {
    savingInsuranceTypes.value = false
  }
}


onMounted(() => {
  loadFromStorage()
  loadSettings()
  
  // Default links
  if (servicesLinks.value.length === 0) {
    servicesLinks.value = [
      { text: 'Canlı Müzayede', url: '#' },
      { text: 'Yaklaşan açık artırmalar', url: '#' },
      { text: 'Doğrudan satın alma', url: '#' },
      { text: 'Gösterge Paneli', url: '#' },
      { text: 'Potansiyel Müşteri Yönetimi', url: '#' }
    ]
  }
  
  if (supportLinks.value.length === 0) {
    supportLinks.value = [
      { text: 'SSS', url: '#' },
      { text: 'Temas etmek', url: '#' },
      { text: 'Yardım Merkezi', url: '#' },
      { text: 'Sistem Durumu', url: '#' }
    ]
  }
  
  if (legalLinks.value.length === 0) {
    legalLinks.value = [
      { text: 'Baskı', url: '#' },
      { text: 'Gizlilik Politikası', url: '#' },
      { text: 'Şartlar ve koşullar', url: '#' },
      { text: 'Cayma hakkı', url: '#' },
      { text: 'Çerez Politikası', url: '#' }
    ]
  }
})
</script>

<style scoped>
/* Page */
.admin-settings-page { min-height: 100vh; background: #f8f9fa; padding: 24px; }
.page-content { max-width: 1400px; margin: 0 auto; }
.page-header { margin-bottom: 32px; text-align: center; }
.page-header h1 { font-size: 2.5rem; font-weight: 700; color: #1f2937; margin: 0 0 8px; }
.page-subtitle { font-size: 1rem; color: #6b7280; margin: 0; }

/* Tabs */
.tabs-container {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
  border-bottom: 2px solid #e5e7eb;
  overflow-x: auto;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: #6b7280;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -2px;
  white-space: nowrap;
}

.tab:hover {
  color: #1f2937;
  background: #f9fafb;
}

.tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  background: #eff6ff;
}

/* Tab Content */
.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Grid */
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 24px; }

/* Card */
.card { background: #fff; border: 1px solid #eef2f7; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.04); display: flex; flex-direction: column; }
.card-header { padding: 20px 24px 0; }
.card-header h2 { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0; }
.card-header p { color: #64748b; margin: 8px 0 0; font-size: .9rem; }
.card-body { padding: 20px 24px; display: grid; gap: 16px; }
.card-footer { padding: 16px 24px 24px; display: flex; justify-content: flex-end; }

/* Fields */
.field { display: grid; gap: 6px; }
.field label { font-weight: 600; color: #374151; font-size: .875rem; }
.input { width: 100%; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: .9rem; transition: border-color .2s ease, box-shadow .2s ease; background: #fff; }
.input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }
.help { font-size: .75rem; color: #6b7280; }

/* Upload */
.upload { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.file { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.file-name { font-size: .875rem; color: #374151; }
.file-name.muted { color: #9ca3af; }

/* Preview */
.preview { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
.preview img { height: 56px; object-fit: contain; display: block; }
.favicon-preview img { height: 32px; width: 32px; }

/* Buttons */
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: 1px solid transparent; background: transparent; color: #111827; transition: all .2s ease; font-size: .875rem; }
.btn svg { flex-shrink: 0; }
.btn-primary { background: #3b82f6; color: #fff; border-color: rgba(59,130,246,.9); }
.btn-primary:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 6px 14px rgba(37,99,235,.25); }
.btn-outline { background: #fff; color: #111827; border-color: #d1d5db; }
.btn-outline:hover { background: #f9fafb; border-color: #9ca3af; }
.btn-danger { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.btn-danger:hover { background: #fee2e2; border-color: #fca5a5; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn-sm { padding: 8px 12px; font-size: .8rem; }
.btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
.btn-secondary:hover:not(:disabled) { background: #e5e7eb; border-color: #9ca3af; }

/* Messages */
.message { margin-top: 24px; padding: 12px 16px; border-radius: 8px; font-weight: 600; text-align: center; }
.message.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.message.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

/* Spinner */
.spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.45); border-top-color: white; border-radius: 999px; display: inline-block; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Section Groups */
.section-group { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb; }
.section-group:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.section-group h3 { font-size: 1.125rem; font-weight: 600; color: #374151; margin: 0 0 16px; }

/* Textarea */
.textarea { width: 100%; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: .9rem; transition: border-color .2s ease, box-shadow .2s ease; background: #fff; resize: vertical; min-height: 80px; font-family: inherit; }
.textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }

/* Links Container */
.links-container { display: grid; gap: 12px; }
.link-item { display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: center; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
.link-item .input { margin: 0; }

/* Settings Sections */
.settings-sections { display: flex; flex-direction: column; gap: 32px; }
.settings-section { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border: 1px solid #f1f5f9; }
.section-header-main { margin-bottom: 24px; }
.section-header-main h2 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
.section-header-main p { color: #64748b; font-size: 0.875rem; }
.settings-content { display: flex; flex-direction: column; gap: 24px; }

/* Generic form controls */
.settings-section input[type="text"],
.settings-section input[type="number"],
.settings-section input[type="password"],
.settings-section input[type="email"],
.settings-section select,
.settings-section textarea {
  width: 100%;
  appearance: none;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #111827;
  transition: border-color .15s ease, box-shadow .15s ease;
}

.settings-section input[type="text"]:focus,
.settings-section input[type="number"]:focus,
.settings-section input[type="password"]:focus,
.settings-section input[type="email"]:focus,
.settings-section select:focus,
.settings-section textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.setting-group { display: flex; flex-direction: column; gap: 8px; }
.setting-label { font-weight: 600; color: #374151; font-size: .875rem; }

.format-options { display: flex; flex-direction: column; gap: 12px; }
.format-option { display: flex; align-items: center; gap: 12px; padding: 16px; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; }
.format-option:hover { border-color: #3b82f6; background: #f8fafc; }
.format-option.active { border-color: #3b82f6; background: #eff6ff; }
.format-option input[type="radio"] { margin: 0; }
.option-content { flex: 1; }
.option-title { font-weight: 600; color: #1f2937; margin-bottom: 4px; }
.option-preview { font-size: 0.875rem; color: #6b7280; font-family: monospace; }

.form-input,
.form-select { width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.875rem; transition: all 0.2s ease; }
.form-input:focus,
.form-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.form-help { font-size: 0.75rem; color: #6b7280; margin-top: 4px; }
.form-textarea { width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical; transition: border-color 0.2s ease; }
.form-textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

.preview-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
.preview-item { font-family: monospace; font-size: 0.875rem; color: #374151; padding: 4px 0; border-bottom: 1px solid #e2e8f0; }
.preview-item:last-child { border-bottom: none; }

.toggle-container { display: flex; align-items: center; gap: 12px; }
.toggle-switch { position: relative; display: inline-block; width: 50px; height: 24px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px; }
.toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .toggle-slider { background-color: #3b82f6; }
input:checked + .toggle-slider:before { transform: translateX(26px); }
.toggle-label { font-weight: 500; color: #374151; }

.insurance-types-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.insurance-type-item { display: flex; align-items: center; gap: 12px; }
.insurance-type-item-with-icon { display: grid; grid-template-columns: 40px 1fr 200px 36px; align-items: center; gap: 12px; }
.icon-preview { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: #f3f4f6; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1.2rem; color: var(--primary); flex-shrink: 0; }
.icon-select { padding: 10px 16px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.875rem; transition: border-color 0.2s ease; min-width: 150px; background: white; }
.icon-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.insurance-type-input { padding: 10px 16px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.875rem; transition: border-color 0.2s ease; width: 100%; }
.insurance-type-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.btn-remove { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; flex-shrink: 0; }
.btn-remove:hover { background: #fee2e2; border-color: #fca5a5; }
.setting-actions { display: flex; justify-content: flex-end; }
.save-section { display: flex; justify-content: center; margin-top: 20px; }

/* Icon Picker */
.icon-picker { position: relative; width: 200px; }
.icon-picker-trigger { display: inline-flex; align-items: center; gap: 8px; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer; width: 100%; overflow: hidden; transition: all 0.2s ease; }
.icon-picker-trigger:hover { border-color: #3b82f6; background: #f8fafc; }
.icon-picker-trigger span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }

/* Icon Picker Modal */
.icon-picker-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}

.icon-picker-modal-content {
  max-width: 95vw;
  max-height: 90vh;
  overflow: auto;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Responsive */
@media (max-width: 1024px) {
  .grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .admin-settings-page { padding: 16px; }
  .page-header h1 { font-size: 2rem; }
  .tabs-container { gap: 8px; }
  .tab { padding: 12px 16px; font-size: 0.875rem; }
  .settings-section { padding: 20px; }
  .link-item { grid-template-columns: 1fr; }
  .insurance-type-item-with-icon { grid-template-columns: 40px 1fr 36px; }
  .icon-picker { width: 100%; grid-column: 1 / -1; }
  .icon-picker-modal-overlay { padding: 10px; }
}
</style>
