<template>
  <div class="admin-settings-page admin-page">
    <div class="page-content">
      <div class="page-header">
        <div class="header-content">
          <div>
            <h1>Einstellungen</h1>
            <p class="page-subtitle">System-, Firmen- und Kommunikationseinstellungen hier verwalten</p>
          </div>
          <div class="header-actions">
            <button 
              class="btn btn-outline" 
              @click="exportSettings" 
              :disabled="isExporting"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span v-if="isExporting">Wird exportiert...</span>
              <span v-else>Export</span>
            </button>
            <button 
              class="btn btn-outline" 
              @click="triggerImport" 
              :disabled="isImporting"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span v-if="isImporting">Wird importiert...</span>
              <span v-else>Import</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-container">
        <div class="tabs-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-button"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" />
            <span>{{ tab.label }}</span>
          </button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Firma Ayarları Tab -->
        <div v-if="activeTab === 'company'" class="tab-panel">
          <div class="grid">
            <!-- Marka -->
            <section class="card">
              <header class="card-header">
                <div>
                  <h2>Marke</h2>
                  <p>Logo- und Firmennameinstellungen</p>
                </div>
              </header>

              <div class="card-body">
                <div class="field">
                  <label>Firmenname</label>
                  <input v-model="companyName" type="text" class="input" placeholder="z.B.: LeadPortal">
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
                  <small class="help">Wenn leer gelassen, wird das Standard-Logo verwendet</small>
                </div>

                <div class="field">
                  <label>Logo hochladen</label>
                  <div class="upload">
                    <input id="company-logo-file" class="file" type="file" accept="image/*" @change="onLogoFileChange">
                    <label for="company-logo-file" class="btn btn-outline">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Datei auswählen
                    </label>
                    <span class="file-name" v-if="logoFileName">{{ logoFileName }}</span>
                    <span class="file-name muted" v-else>Seçilmedi</span>
                    <button v-if="logoUploadedViaFile" type="button" class="btn btn-danger" @click="clearLogoFile">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Entfernen
                    </button>
                  </div>
                </div>

                <div class="field" v-if="companyLogoUrl">
                  <label>Logo-Vorschau</label>
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
                  <small class="help">Wenn leer gelassen, wird das Standard-Favicon verwendet</small>
                </div>

                <div class="field">
                  <label>Favicon hochladen</label>
                  <div class="upload">
                    <input id="favicon-file" class="file" type="file" accept="image/*,.ico" @change="onFaviconFileChange">
                    <label for="favicon-file" class="btn btn-outline">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Favicon auswählen
                    </label>
                    <span class="file-name" v-if="faviconFileName">{{ faviconFileName }}</span>
                    <span class="file-name muted" v-else>Seçilmedi</span>
                    <button v-if="faviconUploadedViaFile" type="button" class="btn btn-danger" @click="clearFaviconFile">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Entfernen
                    </button>
                  </div>
                </div>

                <div class="field" v-if="faviconUrl || faviconUrlInput">
                  <label>Favicon-Vorschau</label>
                  <div class="preview favicon-preview">
                    <img :src="faviconUrlInput || faviconUrl" alt="Favicon Preview" />
                  </div>
                </div>
              </div>

              <footer class="card-footer">
                <button class="btn btn-primary" @click="saveBranding" :disabled="savingBranding">
                  <span v-if="savingBranding" class="spinner-sm"></span>
                  <span v-else>Speichern</span>
                </button>
              </footer>
            </section>

            <!-- Footer Ayarları -->
            <section class="card">
              <header class="card-header">
                <div>
                  <h2>Footer-Einstellungen</h2>
                  <p>Kontakt, Links und rechtliche Informationen</p>
                </div>
              </header>

              <div class="card-body">
                <!-- Marka Bilgileri -->
                <div class="section-group">
                  <h3>Markeninformationen</h3>
                  <div class="field">
                    <label>Firmenbeschreibung</label>
                    <textarea v-model="footerDescription" class="textarea" rows="3" placeholder="Deutschlands führender Lead-Marktplatz..."></textarea>
                  </div>
                  <div class="field">
                    <label>Telefon</label>
                    <input v-model="footerPhone" type="text" class="input" placeholder="+49 (0) 123 456 789">
                  </div>
                  <div class="field">
                    <label>E-Mail</label>
                    <input v-model="footerEmail" type="email" class="input" placeholder="info@example.com">
                  </div>
                </div>

                <!-- Footer Bölümleri (Dinamik) -->
                <div class="section-group">
                  <div class="footer-sections-header">
                    <h3>Footer-Bereiche</h3>
                    <button type="button" class="btn btn-outline btn-sm" @click="addFooterSection">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Neuen Bereich hinzufügen
                    </button>
                  </div>
                  
                  <div class="footer-sections-list">
                    <div v-for="(section, sectionIndex) in footerSections" :key="section.id || sectionIndex" class="footer-section-item">
                      <div class="footer-section-header">
                        <input 
                          v-model="section.title" 
                          type="text" 
                          class="input section-title-input" 
                          placeholder="Bereichstitel"
                        >
                        <button 
                          type="button" 
                          class="btn btn-danger btn-sm" 
                          @click="removeFooterSection(sectionIndex)"
                          :disabled="footerSections.length <= 1"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                          Bereich löschen
                        </button>
                      </div>
                      
                      <div class="links-container">
                        <div v-for="(link, linkIndex) in section.links" :key="linkIndex" class="link-item">
                          <input v-model="link.text" type="text" class="input" placeholder="Link-Text">
                          <input v-model="link.url" type="text" class="input" placeholder="URL">
                          <button type="button" class="btn btn-danger btn-sm" @click="removeLinkFromSection(sectionIndex, linkIndex)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                        <button type="button" class="btn btn-outline btn-sm" @click="addLinkToSection(sectionIndex)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                          Link hinzufügen
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Sosyal Medya -->
                <div class="section-group">
                  <h3>Soziale Medien</h3>
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
                  <h3>Fußzeile</h3>
                  <div class="field">
                    <label>Copyright-Hinweis</label>
                    <input v-model="footerNote" type="text" class="input" placeholder="© 2024 Firma. Alle Rechte vorbehalten.">
                  </div>
                  <div class="field">
                    <label>Handelsregisternummer</label>
                    <input v-model="tradeRegisterNumber" type="text" class="input" placeholder="Handelsregister: HRB 12345">
                  </div>
                </div>
              </div>

              <footer class="card-footer">
                <button class="btn btn-primary" @click="saveFooter" :disabled="savingFooter">
                  <span v-if="savingFooter" class="spinner-sm"></span>
                  <span v-else>Footer speichern</span>
                </button>
              </footer>
            </section>
          </div>
        </div>

        <!-- Uygulama Ayarları Tab -->
        <div v-if="activeTab === 'application'" class="tab-panel">
          <div class="settings-sections">
            <!-- Genel Ayarlar + SMTP Ayarları (Yan Yana) -->
            <div class="settings-grid-row">
              <!-- Genel Ayarlar -->
              <div class="settings-section">
                <div class="section-header-main">
                  <h2>Allgemeine Einstellungen</h2>
                  <p>Weitere Systemeinstellungen</p>
                </div>

                <div class="settings-content">
                  <div class="setting-group">
                    <label class="setting-label">Standardwährung</label>
                    <select v-model="settings.defaultCurrency" class="form-select" @change="updateSettings">
                      <option value="EUR">Euro (€)</option>
                      <option value="TRY">Türkische Lira (₺)</option>
                      <option value="USD">US-Dollar ($)</option>
                    </select>
                  </div>

                  <div class="setting-group">
                    <label class="setting-label">Standard-Auktionsdauer (Tage)</label>
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
                    <label class="setting-label">Standard-Mindesterhöhung</label>
                    <input
                      v-model.number="settings.defaultMinIncrement"
                      type="number"
                      class="form-input"
                      min="1"
                      step="0.01"
                      @input="updateSettings"
                    >
                  </div>

                  <!-- Oturum Zaman Aşımı (Genel Ayarlar içine taşındı) -->
                  <div class="setting-group">
                    <label class="setting-label">Session-Timeout-Dauer (Minuten)</label>
                    <input
                      v-model.number="settings.sessionTimeoutMinutes"
                      type="number"
                      min="1"
                      max="10080"
                      placeholder="120"
                      class="form-input"
                    />
                    <small class="form-help">Wert zwischen 1-10080 Minuten eingeben (1 Minute - 7 Tage)</small>
                  </div>
                  <div class="setting-group">
                    <label class="setting-label">Abmeldungsnachricht</label>
                    <textarea
                      v-model="settings.sessionTimeoutMessage"
                      placeholder="Ihre Sitzung wurde aufgrund von Inaktivität beendet. Bitte melden Sie sich erneut an."
                      rows="4"
                      class="form-textarea"
                    ></textarea>
                    <small class="form-help">Nachricht, die nach der Abmeldung auf der Anmeldeseite angezeigt wird</small>
                  </div>

                  <div class="setting-group">
                    <label class="setting-label">Admin-Menü-Stil</label>
                    <div class="toggle-container">
                      <label class="toggle-switch">
                        <input
                          type="checkbox"
                          v-model="adminMenuStyle"
                          @change="updateAdminMenuStyle"
                        >
                        <span class="toggle-slider"></span>
                      </label>
                      <span class="toggle-label">
                        {{ adminMenuStyle ? 'Linke Sidebar' : 'Oberes Dropdown-Menü (Standard)' }}
                      </span>
                    </div>
                    <small class="form-help">
                      Erscheinungsbild des Admin-Menüs auswählen
                    </small>
                  </div>

                  <div class="setting-group">
                    <label class="setting-label">Gebotszeiten-Beschränkung</label>
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
                        {{ settings.enableBiddingHours ? 'Aktiv' : 'Inaktiv' }}
                      </span>
                    </div>
                    <small class="form-help">
                      Aktivieren Sie diese Option, um Gebotszeiten einzuschränken
                    </small>
                  </div>

                  <div v-if="settings.enableBiddingHours" class="setting-group">
                    <label class="setting-label">Gebotsstartzeit</label>
                    <input
                      v-model="settings.biddingStartHour"
                      type="time"
                      class="form-input"
                      @input="updateSettings"
                    >
                    <small class="form-help">
                      Benutzer können ab dieser Zeit Gebote abgeben
                    </small>
                  </div>

                  <div v-if="settings.enableBiddingHours" class="setting-group">
                    <label class="setting-label">Gebotsendzeit</label>
                    <input
                      v-model="settings.biddingEndHour"
                      type="time"
                      class="form-input"
                      @input="updateSettings"
                    >
                    <small class="form-help">
                      Benutzer können bis zu dieser Zeit Gebote abgeben
                    </small>
                  </div>

                  <div class="setting-group">
                    <label class="setting-label">Wartungsmodus</label>
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
                        {{ settings.maintenanceMode ? 'Aktiv' : 'Inaktiv' }}
                      </span>
                    </div>
                    <small class="form-help">
                      Im Wartungsmodus können nur Admin-Benutzer auf das System zugreifen
                    </small>
                  </div>

                  <div v-if="settings.maintenanceMode" class="setting-group">
                    <label class="setting-label">Wartungsnachricht</label>
                    <textarea
                      v-model="settings.maintenanceMessage"
                      class="form-textarea"
                      rows="3"
                      placeholder="Wartungsnachricht für Benutzer"
                      @input="updateSettings"
                    ></textarea>
                    <small class="form-help">
                      Diese Nachricht wird Benutzern während des Wartungsmodus angezeigt
                    </small>
                  </div>

                  <div class="setting-group">
                    <label class="setting-label">Registrierungsbestätigung erforderlich</label>
                    <div class="toggle-container">
                      <label class="toggle-switch">
                        <input
                          type="checkbox"
                          v-model="settings.requireRegistrationApproval"
                          @change="updateSettings"
                        >
                        <span class="toggle-slider"></span>
                      </label>
                      <span class="toggle-label">
                        {{ settings.requireRegistrationApproval ? 'Aktiv' : 'Inaktiv' }}
                      </span>
                    </div>
                    <small class="form-help">
                      Wenn aktiv, warten neue Benutzerregistrierungen auf Admin-Bestätigung. Wenn inaktiv, können Benutzer sich direkt anmelden.
                    </small>
                  </div>

                  <div v-if="settings.requireRegistrationApproval" class="setting-group">
                    <label class="setting-label">E-Mail-Adresse für Registrierungsbenachrichtigungen</label>
                    <input
                      v-model="settings.registrationApprovalEmail"
                      type="email"
                      class="form-input"
                      placeholder="admin@example.com"
                      @input="updateSettings"
                    >
                    <small class="form-help">
                      Neue Registrierungsanfragen werden an diese E-Mail-Adresse gesendet (optional)
                    </small>
                  </div>

                  <div class="setting-group">
                    <label class="setting-label">Abgelaufene/Verkaufte Leads anzeigen</label>
                    <div class="toggle-container">
                      <label class="toggle-switch">
                        <input
                          type="checkbox"
                          v-model="settings.showExpiredLeads"
                          @change="updateSettings"
                        >
                        <span class="toggle-slider"></span>
                      </label>
                      <span class="toggle-label">
                        {{ settings.showExpiredLeads ? 'Aktiv' : 'Inaktiv' }}
                      </span>
                    </div>
                    <small class="form-help">
                      Wenn aktiv, können Kunden abgelaufene oder verkaufte Leads (als inaktiv) sehen
                    </small>
                  </div>

                  <div class="save-section" style="justify-content:flex-end;">
                    <button class="btn btn-primary" @click="saveGeneralSettings" :disabled="savingGeneral">
                      <span v-if="savingGeneral" class="spinner-sm"></span>
                      <span v-else>Allgemeine Einstellungen speichern</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- SMTP Ayarları -->
              <div class="settings-section">
                <div class="section-header-main">
                  <h2>SMTP-Einstellungen</h2>
                  <p>Serverinformationen für E-Mail-Versand der Anwendung</p>
                </div>
                <div class="settings-content">
                  <div class="setting-group">
                    <label class="setting-label">SMTP-Server</label>
                    <input v-model="settings.smtpHost" type="text" placeholder="smtp.example.com" />
                  </div>
                  <div class="setting-group">
                    <label class="setting-label">Port</label>
                    <input v-model.number="settings.smtpPort" type="number" min="1" />
                  </div>
                  <div class="setting-group">
                    <label class="setting-label">Benutzername</label>
                    <input v-model="settings.smtpUser" type="text" placeholder="user@example.com" />
                  </div>
                  <div class="setting-group">
                    <label class="setting-label">Passwort</label>
                    <input v-model="settings.smtpPass" type="password" />
                  </div>
                  <div class="setting-group">
                    <label class="setting-label">Absendername</label>
                    <input v-model="settings.smtpFromName" type="text" placeholder="LeadPortal" />
                  </div>
                  <div class="setting-group">
                    <div class="toggle-container">
                      <label class="setting-label">TLS verwenden</label>
                      <input type="checkbox" v-model="settings.smtpUseTLS" />
                    </div>
                  </div>
                  <div class="setting-group">
                    <div class="toggle-container">
                      <label class="setting-label">SSL verwenden</label>
                      <input type="checkbox" v-model="settings.smtpUseSSL" />
                    </div>
                  </div>
                  <div>
                    <button class="btn btn-primary" @click="saveGeneralSettings" :disabled="savingGeneral">
                      <span v-if="savingGeneral" class="spinner-sm"></span>
                      <span v-else>SMTP speichern</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Lead ID Format + Sigorta Türleri (Yan Yana) -->
            <div class="settings-grid-row">
              <!-- Lead ID Format -->
              <div class="settings-section">
              <div class="section-header-main">
                <h2>Lead-ID-Format</h2>
                <p>Bestimmen Sie, wie Leads nummeriert werden</p>
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
                        <div class="option-title">Numerisch (1, 2, 3...)</div>
                        <div class="option-preview">Beispiel: 1, 2, 3, 1001</div>
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
                        <div class="option-title">Mit Präfix (LEAD-1, LEAD-2...)</div>
                        <div class="option-preview">Beispiel: LEAD-1, LEAD-2, LEAD-1001</div>
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
                        <div class="option-title">Mit Datum (20241201-1, 20241201-2...)</div>
                        <div class="option-preview">Beispiel: 20241201-1, 20241201-2</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div v-if="settings.leadIdFormat === 'prefixed-numeric'" class="setting-group">
                  <label class="setting-label">Präfix</label>
                  <input 
                    v-model="settings.leadPrefix" 
                    type="text" 
                    class="form-input"
                    placeholder="LEAD"
                    @input="updateSettings"
                  >
                </div>

                <div class="setting-group">
                  <label class="setting-label">Startnummer</label>
                  
                  <input 
                    v-model.number="settings.startingNumber" 
                    type="number" 
                    class="form-input"
                    min="1"
                    @input="updateSettings"
                  >
                  
                  <small class="form-help">Neue Leads beginnen mit dieser Nummer</small>
                </div>

                <div class="setting-group">
                  <label class="setting-label">Vorschau</label>
                  <div class="preview-box">
                    <div class="preview-item" v-for="i in 3" :key="i">
                      {{ generatePreviewId(i) }}
                    </div>
                  </div>
                </div>
                
                <div class="save-section" style="justify-content:flex-end;">
                  <button class="btn btn-primary" @click="saveLeadIdSettings" :disabled="savingLeadId">
                    <span v-if="savingLeadId" class="spinner-sm"></span>
                    <span v-else>Lead-ID-Einstellungen speichern</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Insurance Types -->
            <div class="settings-section">
              <div class="section-header-main">
                <h2>Versicherungstypen</h2>
                <p>Versicherungstypen für Leads verwalten</p>
              </div>
              
              <div class="settings-content">
                <div class="setting-group">
                  <label class="setting-label">Vorhandene Versicherungstypen</label>
                  <div class="insurance-types-list">
                    <div v-for="(type, index) in settings.insuranceTypes" :key="index" class="insurance-type-item-with-icon">
                      <div class="icon-preview" :style="{ backgroundColor: settings.insuranceTypes[index].color || '#f3f4f6' }">
                        <Icon 
                          :icon="(type && type.icon) ? type.icon : 'mdi:file'" 
                          width="20" 
                          height="20" 
                          color="#fff"
                        />
                      </div>
                      <input
                        v-model="settings.insuranceTypes[index].name"
                        type="text"
                        class="insurance-type-input"
                        placeholder="Typname"
                      />
                      <div class="icon-picker">
                        <button type="button" class="icon-picker-trigger" @click="toggleIconPicker(index)">
                          <Icon :icon="settings.insuranceTypes[index].icon || 'mdi:file'" width="18" height="18" />
                          <span>{{ settings.insuranceTypes[index].icon || 'Icon auswählen' }}</span>
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
                      <div class="color-picker-wrapper">
                        <label class="color-picker-label" :title="`Renk: ${settings.insuranceTypes[index].color || '#f3f4f6'}`">
                          <span>Farbe</span>
                          <input
                            v-model="settings.insuranceTypes[index].color"
                            type="color"
                            class="color-picker-input"
                            :title="`Farbe auswählen`"
                          />
                        </label>
                      </div>
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
                    Neuen Versicherungstyp hinzufügen
                  </button>
                </div>
                
                <div class="setting-actions">
                  <button class="btn btn-primary" @click="saveInsuranceTypes" :disabled="savingInsuranceTypes">
                    <span v-if="savingInsuranceTypes" class="spinner-sm"></span>
                    <span v-else>Versicherungstypen speichern</span>
                  </button>
                </div>
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
import { useExportImport } from '@/composables/useExportImport.js'

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
  { id: 'company', label: 'Firmeneinstellungen', icon: BuildingIcon },
  { id: 'application', label: 'Anwendungseinstellungen', icon: SettingsIcon }
]

const activeTab = ref('company')
const message = ref('')
const messageType = ref('')

// Admin menu style - localStorage'dan yükle
const adminMenuStyle = ref(localStorage.getItem('adminMenuStyle') === 'sidebar')

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

// Footer sections - dinamik başlıklar ve linkler
const footerSections = ref([
  { id: 'services', title: 'Hizmetler', links: [] },
  { id: 'support', title: 'Destek', links: [] },
  { id: 'legal', title: 'Yasal', links: [] }
])

// Backward compatibility için eski referanslar (migration için)
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
    { name: 'Tier', icon: 'mdi:paw', color: '#8b5cf6' },
    { name: 'Auto', icon: 'mdi:car', color: '#0ea5e9' },
    { name: 'Gesundheit', icon: 'mdi:heart', color: '#10b981' }
  ],
  enableBiddingHours: false,
  biddingStartHour: '08:00',
  biddingEndHour: '20:00',
  maintenanceMode: false,
  maintenanceMessage: 'Das System wird gewartet. Bitte versuchen Sie es später erneut.',
  smtpHost: '',
  smtpPort: 465,
  smtpUser: '',
  smtpPass: '',
  smtpFromName: 'LeadPortal',
  smtpUseTLS: false,
  smtpUseSSL: true,
  sessionTimeoutMinutes: 120,
  sessionTimeoutMessage: 'Ihre Sitzung wurde aufgrund von Inaktivität beendet. Bitte melden Sie sich erneut an.',
  requireRegistrationApproval: true,
  registrationApprovalEmail: '',
  showExpiredLeads: false
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
      
      // Yeni format: footerSections
      if (brandingSettings.footerSections && Array.isArray(brandingSettings.footerSections) && brandingSettings.footerSections.length > 0) {
        footerSections.value = brandingSettings.footerSections
      } else {
        // Eski format: servicesLinks, supportLinks, legalLinks (backward compatibility)
        servicesLinks.value = brandingSettings.servicesLinks || []
        supportLinks.value = brandingSettings.supportLinks || []
        legalLinks.value = brandingSettings.legalLinks || []
        
        // Eski formatı yeni formata çevir
        migrateOldFooterLinks()
      }
      
      socialMedia.value = brandingSettings.socialMedia || { facebook: '', twitter: '', linkedin: '', instagram: '' }
    }
  } catch (error) {
    console.error('Einstellungen konnten nicht geladen werden:', error)
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
            'Tier': 'mdi:paw',
            'Auto': 'mdi:car',
            'Gesundheit': 'mdi:heart'
          }
          const defaultColors = ['#dc2626', '#f97316', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ec4899']
          settings.value.insuranceTypes = settings.value.insuranceTypes.map((name, idx) => ({
            name: name,
            icon: defaultIcons[name] || 'mdi:file',
            color: defaultColors[idx % defaultColors.length]
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
          const defaultColors = ['#dc2626', '#f97316', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ec4899']
          settings.value.insuranceTypes = settings.value.insuranceTypes.map((type, idx) => {
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
            const color = type.color || defaultColors[idx % defaultColors.length]
            return { name: n, icon, color }
          })
        }
      }
    }
  } catch (error) {
    console.error('Einstellungen konnten nicht geladen werden:', error)
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

// Footer sections management
function addFooterSection() {
  const newId = `section-${Date.now()}`
  footerSections.value.push({
    id: newId,
    title: 'Neuer Bereich',
    links: []
  })
}

function removeFooterSection(index) {
  if (footerSections.value.length > 1) {
    footerSections.value.splice(index, 1)
  }
}

function addLinkToSection(sectionIndex) {
  if (footerSections.value[sectionIndex]) {
    footerSections.value[sectionIndex].links.push({ text: '', url: '' })
  }
}

function removeLinkFromSection(sectionIndex, linkIndex) {
  if (footerSections.value[sectionIndex] && footerSections.value[sectionIndex].links) {
    footerSections.value[sectionIndex].links.splice(linkIndex, 1)
  }
}

// Backward compatibility: Eski formatı yeni formata çevir
function migrateOldFooterLinks() {
  // Eğer footerSections zaten doluysa migration yapma
  if (footerSections.value && footerSections.value.length > 0) {
    return
  }
  
  // Eğer eski format varsa (servicesLinks, supportLinks, legalLinks) yeni formata çevir
  if ((servicesLinks.value && servicesLinks.value.length > 0) || 
      (supportLinks.value && supportLinks.value.length > 0) || 
      (legalLinks.value && legalLinks.value.length > 0)) {
    
    const migratedSections = []
    
    if (servicesLinks.value && servicesLinks.value.length > 0) {
      migratedSections.push({
        id: 'services',
        title: 'Hizmetler',
        links: [...servicesLinks.value]
      })
    }
    
    if (supportLinks.value && supportLinks.value.length > 0) {
      migratedSections.push({
        id: 'support',
        title: 'Destek',
        links: [...supportLinks.value]
      })
    }
    
    if (legalLinks.value && legalLinks.value.length > 0) {
      migratedSections.push({
        id: 'legal',
        title: 'Yasal',
        links: [...legalLinks.value]
      })
    }
    
    if (migratedSections.length > 0) {
      footerSections.value = migratedSections
      // Eski referansları temizle
      servicesLinks.value = []
      supportLinks.value = []
      legalLinks.value = []
    }
  }
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
    console.error('Fehler beim Aktualisieren des Favicons:', error)
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
        const errorMsg = 'Favicon ist zu groß, bitte wählen Sie ein kleineres Bild (max. 2MB)'
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
    success('Markeneinstellungen erfolgreich gespeichert!')
    message.value = 'Markeneinstellungen gespeichert!'
    messageType.value = 'success'
  } catch (e) {
    const errorMsg = 'Markeneinstellungen konnten nicht gespeichert werden'
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
      footerSections: footerSections.value,
      // Backward compatibility için eski formatı da gönder
      servicesLinks: footerSections.value.find(s => s.id === 'services')?.links || [],
      supportLinks: footerSections.value.find(s => s.id === 'support')?.links || [],
      legalLinks: footerSections.value.find(s => s.id === 'legal')?.links || [],
      socialMedia: socialMedia.value
    })
    
    if (response.data.settings) {
      localStorage.setItem('branding_cache', JSON.stringify(response.data.settings))
      localStorage.setItem('branding_cache_timestamp', Date.now().toString())
    }
    
    window.dispatchEvent(new Event('settings-change'))
    success('Footer-Einstellungen erfolgreich gespeichert!')
    message.value = 'Footer-Einstellungen gespeichert!'
    messageType.value = 'success'
  } catch (e) {
    const errorMsg = 'Footer-Einstellungen konnten nicht gespeichert werden'
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

function updateAdminMenuStyle() {
  // localStorage'a kaydet
  localStorage.setItem('adminMenuStyle', adminMenuStyle.value ? 'sidebar' : 'dropdown')
  // Event dispatch et ki App.vue güncellensin
  window.dispatchEvent(new Event('admin-menu-style-change'))
  success('Menüstil aktualisiert!')
}

async function updateSettings() {
  // Doğrudan kaydet
  await saveGeneralSettings()
}

async function saveGeneralSettings() {
  try {
    savingGeneral.value = true
    message.value = ''
    await api.post('/settings', settings.value)
    success('Allgemeine Einstellungen erfolgreich gespeichert!')
    message.value = 'Allgemeine Einstellungen gespeichert!'
    messageType.value = 'success'
  } catch (err) {
    const errorMsg = err.response?.data?.message || 'Allgemeine Einstellungen konnten nicht gespeichert werden'
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
    success('Lead-ID-Einstellungen erfolgreich gespeichert!')
    message.value = 'Lead-ID-Einstellungen gespeichert!'
    messageType.value = 'success'
  } catch (err) {
    const errorMsg = err.response?.data?.message || 'Lead-ID-Einstellungen konnten nicht gespeichert werden'
    error(errorMsg)
    message.value = errorMsg
    messageType.value = 'error'
  } finally {
    savingLeadId.value = false
  }
}

function addInsuranceType() {
  // Varsayılan renkler dizisi
  const defaultColors = ['#dc2626', '#f97316', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ec4899']
  const existingCount = settings.value.insuranceTypes.length
  const color = defaultColors[existingCount % defaultColors.length]

  settings.value.insuranceTypes.push({ name: '', icon: 'mdi:file', color })
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
      error('Mindestens ein Versicherungstyp ist erforderlich')
      message.value = 'Mindestens ein Versicherungstyp ist erforderlich'
      messageType.value = 'error'
      return
    }
    
    // Her type için icon ve color yoksa default ekle (Iconify)
    const defaultColors = ['#dc2626', '#f97316', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ec4899']
    filteredTypes.forEach((type, idx) => {
      if (!type.icon || type.icon.trim() === '') {
        type.icon = 'mdi:file'
      }
      if (!type.color || type.color.trim() === '') {
        type.color = defaultColors[idx % defaultColors.length]
      }
    })
    
    settings.value.insuranceTypes = filteredTypes
    await api.post('/settings', settings.value)
    success('Versicherungstypen erfolgreich gespeichert!')
    message.value = 'Versicherungstypen gespeichert!'
    messageType.value = 'success'
  } catch (err) {
    const errorMessage = err.response?.data?.message || 'Versicherungstypen konnten nicht gespeichert werden'
    error(errorMessage)
    message.value = errorMessage
    messageType.value = 'error'
  } finally {
    savingInsuranceTypes.value = false
  }
}

// Export/Import Functions
async function getAllSettingsData() {
  try {
    // Branding ayarlarını al
    const brandingResponse = await api.get('/settings/branding')
    const brandingData = brandingResponse.data || {}
    
    // Application ayarlarını al
    const settingsResponse = await api.get('/settings')
    const settingsData = settingsResponse.data || {}
    
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      branding: {
        companyName: brandingData.companyName || companyName.value,
        companyLogoUrl: brandingData.companyLogoUrl || companyLogoUrl.value,
        faviconUrl: brandingData.faviconUrl || faviconUrl.value,
        footerPhone: brandingData.footerPhone || footerPhone.value,
        footerEmail: brandingData.footerEmail || footerEmail.value,
        footerNote: brandingData.footerNote || footerNote.value,
        footerDescription: brandingData.footerDescription || footerDescription.value,
        tradeRegisterNumber: brandingData.tradeRegisterNumber || tradeRegisterNumber.value,
        footerSections: (brandingData.footerSections && brandingData.footerSections.length > 0) 
          ? brandingData.footerSections 
          : (footerSections.value && footerSections.value.length > 0 ? footerSections.value : []),
        // Backward compatibility - eğer footerSections boşsa eski formatı da Export
        servicesLinks: brandingData.servicesLinks || servicesLinks.value || [],
        supportLinks: brandingData.supportLinks || supportLinks.value || [],
        legalLinks: brandingData.legalLinks || legalLinks.value || [],
        socialMedia: brandingData.socialMedia || socialMedia.value
      },
      application: settingsData
    }
  } catch (err) {
    console.error('Fehler beim Abrufen der Einstellungen:', err)
    // Fallback: mevcut state'ten al
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      branding: {
        companyName: companyName.value,
        companyLogoUrl: companyLogoUrl.value,
        faviconUrl: faviconUrl.value,
        footerPhone: footerPhone.value,
        footerEmail: footerEmail.value,
        footerNote: footerNote.value,
        footerDescription: footerDescription.value,
        tradeRegisterNumber: tradeRegisterNumber.value,
        footerSections: (footerSections.value && footerSections.value.length > 0) ? footerSections.value : [],
        // Backward compatibility - eğer footerSections boşsa eski formatı da Export
        servicesLinks: servicesLinks.value || [],
        supportLinks: supportLinks.value || [],
        legalLinks: legalLinks.value || [],
        socialMedia: socialMedia.value
      },
      application: settings.value
    }
  }
}

async function setAllSettingsData(data) {
  try {
    // Validate
    if (!data || typeof data !== 'object') {
      throw new Error('Ungültiges Datenformat')
    }

    // Branding ayarlarını yükle
    if (data.branding) {
      const branding = data.branding
      
      companyName.value = branding.companyName || 'LeadPortal'
      companyLogoUrl.value = branding.companyLogoUrl || ''
      logoUrlInput.value = branding.companyLogoUrl && !branding.companyLogoUrl.startsWith('data:') 
        ? branding.companyLogoUrl 
        : ''
      logoUploadedViaFile.value = !!(branding.companyLogoUrl && branding.companyLogoUrl.startsWith('data:'))
      logoFileName.value = logoUploadedViaFile.value ? 'Yüklendi (data URL)' : ''

      faviconUrl.value = branding.faviconUrl || ''
      faviconUrlInput.value = branding.faviconUrl && !branding.faviconUrl.startsWith('data:') 
        ? branding.faviconUrl 
        : ''
      faviconUploadedViaFile.value = !!(branding.faviconUrl && branding.faviconUrl.startsWith('data:'))
      faviconFileName.value = faviconUploadedViaFile.value ? 'Yüklendi (sıkıştırılmış)' : ''

      footerPhone.value = branding.footerPhone || ''
      footerEmail.value = branding.footerEmail || ''
      footerNote.value = branding.footerNote || ''
      footerDescription.value = branding.footerDescription || ''
      tradeRegisterNumber.value = branding.tradeRegisterNumber || ''
      
      // Yeni format: footerSections
      if (branding.footerSections && Array.isArray(branding.footerSections) && branding.footerSections.length > 0) {
        footerSections.value = branding.footerSections
      } else {
        // Eski format: backward compatibility
        servicesLinks.value = branding.servicesLinks || []
        supportLinks.value = branding.supportLinks || []
        legalLinks.value = branding.legalLinks || []
        migrateOldFooterLinks()
      }
      
      socialMedia.value = branding.socialMedia || { facebook: '', twitter: '', linkedin: '', instagram: '' }

      // Branding ayarlarını kaydet
      await api.post('/settings/branding', {
        companyName: companyName.value,
        companyLogoUrl: companyLogoUrl.value || logoUrlInput.value,
        faviconUrl: faviconUrl.value || faviconUrlInput.value,
        footerPhone: footerPhone.value,
        footerEmail: footerEmail.value,
        footerNote: footerNote.value,
        footerDescription: footerDescription.value,
        tradeRegisterNumber: tradeRegisterNumber.value,
        footerSections: footerSections.value,
        // Backward compatibility
        servicesLinks: footerSections.value.find(s => s.id === 'services')?.links || [],
        supportLinks: footerSections.value.find(s => s.id === 'support')?.links || [],
        legalLinks: footerSections.value.find(s => s.id === 'legal')?.links || [],
        socialMedia: socialMedia.value
      })

      if (faviconUrl.value || faviconUrlInput.value) {
        updateFavicon(faviconUrl.value || faviconUrlInput.value)
      }
    }

    // Application ayarlarını yükle
    if (data.application) {
      settings.value = { ...settings.value, ...data.application }
      
      // Insurance types compatibility
      if (settings.value.insuranceTypes && Array.isArray(settings.value.insuranceTypes)) {
        const firstItem = settings.value.insuranceTypes[0]
        
        if (typeof firstItem === 'string') {
          const defaultIcons = {
            'Tier': 'mdi:paw',
            'Auto': 'mdi:car',
            'Gesundheit': 'mdi:heart'
          }
          const defaultColors = ['#dc2626', '#f97316', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ec4899']
          settings.value.insuranceTypes = settings.value.insuranceTypes.map((name, idx) => ({
            name: name,
            icon: defaultIcons[name] || 'mdi:file',
            color: defaultColors[idx % defaultColors.length]
          }))
        } else if (firstItem && typeof firstItem === 'object') {
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
          const defaultColors = ['#dc2626', '#f97316', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ec4899']
          settings.value.insuranceTypes = settings.value.insuranceTypes.map((type, idx) => {
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
            const color = type.color || defaultColors[idx % defaultColors.length]
            return { name: n, icon, color }
          })
        }
      }

      // Application ayarlarını kaydet
      await api.post('/settings', settings.value)
    }

    // Cache'i güncelle
    window.dispatchEvent(new Event('settings-change'))
    
    // Sayfayı yeniden yükle
    await loadFromStorage()
    await loadSettings()
  } catch (err) {
    console.error('Fehler beim Laden der Einstellungen:', err)
    throw err
  }
}

function validateSettingsData(data) {
  if (!data || typeof data !== 'object') {
    return 'Ungültiges Datenformat'
  }
  
  if (!data.version) {
    return 'Fehlende Versionsinformation'
  }
  
  return true
}

// Export/Import composable
const { 
  exportData: exportSettings, 
  triggerImport, 
  isExporting, 
  isImporting 
} = useExportImport({
  getData: getAllSettingsData,
  setData: setAllSettingsData,
  validateData: validateSettingsData,
  fileName: 'leadportal-settings',
  fileExtension: 'json'
})


onMounted(async () => {
  await loadFromStorage()
  await loadSettings()
  
  // Eğer footerSections boşsa veya sadece eski format varsa, varsayılan değerleri ayarla
  if (footerSections.value.length === 0) {
    // Eski formatı kontrol et
    if (servicesLinks.value.length > 0 || supportLinks.value.length > 0 || legalLinks.value.length > 0) {
      migrateOldFooterLinks()
    } else {
      // Varsayılan footer sections
      footerSections.value = [
        {
          id: 'services',
          title: 'Dienstleistungen',
          links: [
            { text: 'Live-Auktion', url: '#' },
            { text: 'Bevorstehende Auktionen', url: '#' },
            { text: 'Sofortkauf', url: '#' },
            { text: 'Dashboard', url: '#' },
            { text: 'Lead-Management', url: '#' }
          ]
        },
        {
          id: 'support',
          title: 'Support',
          links: [
            { text: 'FAQ', url: '#' },
            { text: 'Kontakt', url: '#' },
            { text: 'Hilfezentrum', url: '#' },
            { text: 'Systemstatus', url: '#' }
          ]
        },
        {
          id: 'legal',
          title: 'Rechtliches',
          links: [
            { text: 'Impressum', url: '#' },
            { text: 'Datenschutzerklärung', url: '#' },
            { text: 'AGB', url: '#' },
            { text: 'Widerrufsrecht', url: '#' },
            { text: 'Cookie-Richtlinie', url: '#' }
          ]
        }
      ]
    }
  }
})
</script>

<style scoped>
/* Page */
.admin-settings-page { min-height: 100vh; background: #f8fafc; padding: 0; margin: 0; width: 100%; overflow-x: hidden; }
.page-content { width: 100%; margin: 0; padding: 0; }
.page-header { margin-bottom: 32px; }
.header-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.page-header h1 { font-size: 2.5rem; font-weight: 700; color: #1f2937; margin: 0 0 8px; }
.page-subtitle { font-size: 1rem; color: #6b7280; margin: 0; }
.header-actions { display: flex; gap: 12px; margin-left: auto; }

/* Tabs */
.tabs-container {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
}

.tabs-nav {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-button:hover {
  color: #475569;
  background: #f1f5f9;
}

.tab-button.active {
  color: var(--text);
  border-bottom-color: var(--text);
  background: white;
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

/* Footer Sections */
.footer-sections-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.footer-sections-header h3 { margin: 0; }
.footer-sections-list { display: flex; flex-direction: column; gap: 24px; }
.footer-section-item { padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
.footer-section-header { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.section-title-input { flex: 1; font-weight: 600; font-size: 1rem; }

/* Settings Sections */
.settings-sections { display: flex; flex-direction: column; gap: 32px; }
.settings-grid-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  align-items: start;
}
.settings-section { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border: 1px solid #f1f5f9; height: 100%; display: flex; flex-direction: column; }
.section-header-main { margin-bottom: 24px; }
.section-header-main h2 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
.section-header-main p { color: #64748b; font-size: 0.875rem; }
.settings-content { display: flex; flex-direction: column; gap: 24px; flex: 1; }

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
.insurance-type-item-with-icon { display: grid; grid-template-columns: 40px 1fr 200px 100px 36px; align-items: center; gap: 12px; }
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

/* Color Picker */
.color-picker-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.color-picker-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.color-picker-label span {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.color-picker-input {
  width: 48px;
  height: 48px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 4px;
}

.color-picker-input:hover {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.color-picker-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* Responsive */
@media (max-width: 1024px) {
  .grid { grid-template-columns: 1fr; }
  .settings-grid-row { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .page-header h1 { font-size: 2rem; }
  .header-content { flex-direction: column; align-items: stretch; }
  .header-actions { width: 100%; }
  .header-actions .btn { flex: 1; justify-content: center; }
  .tabs-nav { flex-wrap: wrap; }
  .tab-button { padding: 0.875rem 1rem; font-size: 0.875rem; }

  .settings-section { padding: 20px; }
  .settings-grid-row { grid-template-columns: 1fr; }
  .section-group { padding: 16px; }
  .links-container { gap: 12px; }
  .subsection { padding: 16px; }
}
</style>
