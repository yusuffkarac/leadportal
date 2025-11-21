<template>
  <div class="admin-settings-page">
    <div class="page-content">
      <div class="page-header">
        <div>
          <h1>E-Mail/SMS-Einstellungen</h1>
          <p class="subtitle">E-Mail- und SMS-Vorlagen verwalten</p>
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
          <button class="btn btn-primary" @click="openEmailModal(null)">
            <Icon icon="mdi:plus" width="16" height="16" />
            Neue Vorlage
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-container">
        <div class="tabs-nav">
          <button
            class="tab-button"
            :class="{ active: activeTab === 'email' }"
            @click="activeTab = 'email'"
          >
            <Icon icon="mdi:email" width="20" height="20" />
            Email Template
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'sms' }"
            @click="activeTab = 'sms'"
          >
            <Icon icon="mdi:cellphone" width="20" height="20" />
            SMS Template
          </button>
          
        </div>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Email Templates -->
        <div v-if="activeTab === 'email'" class="tab-panel">
        <div class="section-header">
          <h2>E-Mail-Vorlagen</h2>
         
        </div>

        <div class="templates-grid">
          <div v-for="template in emailTemplates" :key="template.id" class="template-card">
            <div class="template-header">
              <div>
                <h3>{{ template.name }}</h3>
                <span class="template-type">{{ template.type }}</span>
              </div>
              <div class="template-status">
                <span :class="['status-badge', template.isActive ? 'active' : 'inactive']">
                  {{ template.isActive ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </div>
            </div>
            <div class="template-body">
              <p class="template-description">{{ template.description }}</p>
              <div class="template-meta">
                <strong>Betreff:</strong> {{ template.subject }}
              </div>
              <div class="template-variables" v-if="template.variables && template.variables.length">
                <strong>Variablen:</strong>
                <div class="variables-list">
                  <code v-for="variable in template.variables" :key="variable" v-text="`{{${variable}}}`"></code>
                </div>
              </div>
            </div>
            <div class="template-footer">
              <button class="btn btn-sm btn-outline" @click="previewEmailTemplate(template)">
                <Icon icon="mdi:eye" width="14" height="14" />
                Vorschau
              </button>
              <button class="btn btn-sm btn-outline" @click="openTestEmailModal(template)">
                <Icon icon="mdi:email-send" width="14" height="14" />
                Test senden
              </button>
              <button class="btn btn-sm btn-outline" @click="openEmailModal(template)">
                <Icon icon="mdi:pencil" width="14" height="14" />
                Bearbeiten
              </button>
              <button class="btn btn-sm btn-danger" @click="deleteEmailTemplate(template.id)">
                <Icon icon="mdi:delete" width="14" height="14" />
                Löschen
              </button>
            </div>
          </div>
        </div>
      </div>

        <!-- SMS Templates -->
        <div v-if="activeTab === 'sms'" class="tab-panel">
        <div class="section-header">
          <h2>SMS-Vorlagen</h2>
          
        </div>

        <div class="templates-grid">
          <div v-for="template in smsTemplates" :key="template.id" class="template-card">
            <div class="template-header">
              <div>
                <h3>{{ template.name }}</h3>
                <span class="template-type">{{ template.type }}</span>
              </div>
              <div class="template-status">
                <span :class="['status-badge', template.isActive ? 'active' : 'inactive']">
                  {{ template.isActive ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </div>
            </div>
            <div class="template-body">
              <p class="template-description">{{ template.description }}</p>
              <div class="template-content">
                <strong>Inhalt:</strong>
                <p>{{ template.content }}</p>
              </div>
              <div class="template-variables" v-if="template.variables && template.variables.length">
                <strong>Variablen:</strong>
                <div class="variables-list">
                  <code v-for="variable in template.variables" :key="variable" v-text="`{{${variable}}}`"></code>
                </div>
              </div>
            </div>
            <div class="template-footer">
              <button class="btn btn-sm btn-outline" @click="openSmsModal(template)">
                <Icon icon="mdi:pencil" width="14" height="14" />
                Bearbeiten
              </button>
              <button class="btn btn-sm btn-danger" @click="deleteSmsTemplate(template.id)">
                <Icon icon="mdi:delete" width="14" height="14" />
                Löschen
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- Email Template Modal -->
    <div v-if="showEmailModal" class="modal-overlay" @click.self="closeEmailModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingEmailTemplate ? 'E-Mail-Vorlage bearbeiten' : 'Neue E-Mail-Vorlage' }}</h2>
          <button class="modal-close" @click="closeEmailModal">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Vorlagentyp *</label>
            <input
              v-model="emailForm.type"
              type="text"
              class="input"
              placeholder="z.B.: bidReceived, outbid, leadWon"
              :disabled="!!editingEmailTemplate"
            >
            <small class="help">Geben Sie einen eindeutigen Typ an (z.B.: bidReceived)</small>
          </div>
          
          <div class="field">
            <label>Vorlagenname *</label>
            <input
              v-model="emailForm.name"
              type="text"
              class="input"
              placeholder="z.B.: Gebot erhalten"
            >
          </div>
          
          <div class="field">
            <label>Beschreibung</label>
            <textarea
              v-model="emailForm.description"
              class="textarea"
              rows="2"
              placeholder="Wofür wird diese Vorlage verwendet?"
            ></textarea>
          </div>
          
          <div class="field">
            <label>E-Mail-Betreff *</label>
            <div class="variables-chips">
              <span 
                v-for="variable in commonEmailVariables" 
                :key="variable.name"
                class="variable-chip"
                draggable="true"
                @dragstart="onDragStart($event, variable.name)"
                @click="insertVariableToSubject(variable.name)"
                :title="`Klicken oder ziehen Sie, um zur Betreffzeile hinzuzufügen`"
              >
                <i :class="['fas', variable.icon]"></i>
                {{ variable.name }}
              </span>
            </div>
            <input
              ref="emailSubjectInput"
              v-model="emailForm.subject"
              type="text"
              class="input"
              placeholder="z.B.: Ihr Gebot wurde erhalten: {{leadTitle}}"
              @drop="onDropToSubject"
              @dragover.prevent
            >
            <small class="help">Klicken oder ziehen Sie Variablen</small>
          </div>
          
          <div class="field">
            <label>E-Mail-Inhalt *</label>
            <div class="variables-chips">
              <span 
                v-for="variable in commonEmailVariables" 
                :key="variable.name"
                class="variable-chip"
                draggable="true"
                @dragstart="onDragStart($event, variable.name)"
                @click="insertVariableToText(variable.name)"
                :title="`Klicken oder ziehen Sie, um zum Inhalt hinzuzufügen`"
              >
                <i :class="['fas', variable.icon]"></i>
                {{ variable.name }}
              </span>
            </div>
            <textarea
              ref="emailTextTextarea"
              v-model="emailForm.textContent"
              class="textarea"
              rows="8"
              placeholder="Schreiben Sie hier Ihren E-Mail-Inhalt...

Beispiel:
Hallo {{userName}},

Sie haben ein Gebot von {{amount}} {{currency}} für {{leadTitle}} abgegeben.

Vielen Dank,
{{companyName}}"
              @drop="onDropToText"
              @dragover.prevent
              @dragenter="onDragEnter"
              @click="updateCursorPos($event, 'text')"
              @keyup="updateCursorPos($event, 'text')"
              @input="onTextContentChange"f
              @blur="onTextContentChange"
            ></textarea>
            <small class="help">
              <i class="fas fa-info-circle"></i>
              Der hier geschriebene Text wird automatisch in ein schönes E-Mail-Design umgewandelt
            </small>
          </div>
          
          <!-- Advanced HTML Section -->
          <div class="field advanced-section">
            <button 
              type="button" 
              class="advanced-toggle"
              @click="showAdvancedHtml = !showAdvancedHtml"
            >
              <i :class="['fas', showAdvancedHtml ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
              Erweitert: HTML bearbeiten
              <span class="advanced-badge">Optional</span>
            </button>
            
            <div v-show="showAdvancedHtml" class="advanced-content">
              <div class="advanced-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Achtung: Wenn Sie HTML manuell bearbeiten, wird das HTML nicht automatisch aktualisiert, wenn sich der Textinhalt oben ändert.</span>
              </div>
              
              <div class="variables-chips">
                <span 
                  v-for="variable in commonEmailVariables" 
                  :key="variable.name"
                  class="variable-chip"
                  draggable="true"
                  @dragstart="onDragStart($event, variable.name)"
                  @click="insertVariableToHtml(variable.name)"
                  :title="`Klicken oder ziehen Sie, um zum HTML-Inhalt hinzuzufügen`"
                >
                  <i :class="['fas', variable.icon]"></i>
                  {{ variable.name }}
                </span>
              </div>
              
              <div class="editor-toolbar">
                <button type="button" class="toolbar-btn" @click="wrapSelection('htmlContent', '<strong>', '</strong>')" title="Fett">
                  <strong>B</strong>
                </button>
                <button type="button" class="toolbar-btn" @click="wrapSelection('htmlContent', '<em>', '</em>')" title="Kursiv">
                  <em>I</em>
                </button>
                <button type="button" class="toolbar-btn" @click="wrapSelection('htmlContent', '<u>', '</u>')" title="Unterstrichen">
                  <u>U</u>
                </button>
                <button type="button" class="toolbar-btn" @click="insertTag('htmlContent', '<br>')" title="Zeilenumbruch">
                  ↵
                </button>
                <button type="button" class="toolbar-btn" @click="generateHtmlFromText" title="HTML aus Text erstellen">
                  <i class="fas fa-sync"></i>
                </button>
              </div>
              
              <textarea
                ref="emailHtmlTextarea"
                v-model="emailForm.htmlContent"
                class="textarea code-textarea"
                rows="10"
                placeholder="<div>...</div>"
                @drop="onDropToHtml"
                @dragover.prevent
                @dragenter="onDragEnter"
                @click="updateCursorPos($event, 'html')"
                @keyup="updateCursorPos($event, 'html')"
              ></textarea>
              <small class="help">HTML-E-Mail-Inhalt (für fortgeschrittene Benutzer)</small>
            </div>
          </div>
          
          <div class="field">
            <label class="checkbox-label">
              <input
                v-model="emailForm.isActive"
                type="checkbox"
              >
              <span>Vorlage aktiv</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeEmailModal">Abbrechen</button>
          <button v-if="editingEmailTemplate" class="btn btn-outline" @click="previewEmailTemplate(editingEmailTemplate)">
            <Icon icon="mdi:eye" width="14" height="14" />
            Vorschau
          </button>
          <button v-if="editingEmailTemplate" class="btn btn-outline" @click="openTestEmailModal(editingEmailTemplate)">
            <Icon icon="mdi:email-send" width="14" height="14" />
            Test senden
          </button>
          <button class="btn btn-primary" @click="saveEmailTemplate" :disabled="savingEmail">
            <span v-if="savingEmail" class="spinner-sm"></span>
            <span v-else>{{ editingEmailTemplate ? 'Aktualisieren' : 'Erstellen' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- SMS Template Modal -->
    <div v-if="showSmsModal" class="modal-overlay" @click.self="closeSmsModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingSmsTemplate ? 'SMS-Vorlage bearbeiten' : 'Neue SMS-Vorlage' }}</h2>
          <button class="modal-close" @click="closeSmsModal">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Vorlagentyp *</label>
            <input
              v-model="smsForm.type"
              type="text"
              class="input"
              placeholder="z.B.: bidReceived, outbid, leadWon"
              :disabled="!!editingSmsTemplate"
            >
            <small class="help">Geben Sie einen eindeutigen Typ an</small>
          </div>
          
          <div class="field">
            <label>Vorlagenname *</label>
            <input
              v-model="smsForm.name"
              type="text"
              class="input"
              placeholder="z.B.: Gebot erhalten"
            >
          </div>
          
          <div class="field">
            <label>Beschreibung</label>
            <textarea
              v-model="smsForm.description"
              class="textarea"
              rows="2"
              placeholder="Wofür wird diese Vorlage verwendet?"
            ></textarea>
          </div>
          
          <div class="field">
            <label>SMS-Inhalt *</label>
            <div class="variables-chips">
              <span 
                v-for="variable in commonSmsVariables" 
                :key="variable.name"
                class="variable-chip"
                draggable="true"
                @dragstart="onDragStart($event, variable.name)"
                @click="insertVariableToSms(variable.name)"
                :title="`Klicken oder ziehen Sie, um zum SMS-Inhalt hinzuzufügen`"
              >
                <i :class="['fas', variable.icon]"></i>
                {{ variable.name }}
              </span>
            </div>
            <textarea
              ref="smsContentTextarea"
              v-model="smsForm.content"
              class="textarea"
              rows="5"
              placeholder="Sie haben ein Gebot von {{amount}} {{currency}} für {{leadTitle}} abgegeben."
              @drop="onDropToSmsContent"
              @dragover.prevent
              @dragenter="onDragEnter"
              @click="updateCursorPos($event, 'sms')"
              @keyup="updateCursorPos($event, 'sms')"
            ></textarea>
            <div class="sms-counter">
              <span>{{ smsCharCount }} Zeichen</span>
              <span class="muted">{{ smsPartCount }} SMS</span>
            </div>
            <small class="help">SMS-Nachricht. Ziehen Sie Variablen von oben</small>
          </div>
          
          <div class="field">
            <label class="checkbox-label">
              <input
                v-model="smsForm.isActive"
                type="checkbox"
              >
              <span>Vorlage aktiv</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeSmsModal">Abbrechen</button>
          <button class="btn btn-primary" @click="saveSmsTemplate" :disabled="savingSms">
            <span v-if="savingSms" class="spinner-sm"></span>
            <span v-else>{{ editingSmsTemplate ? 'Aktualisieren' : 'Erstellen' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Email Preview Modal -->
    <div v-if="showPreviewModal" class="modal-overlay" @click.self="closePreviewModal">
      <div class="modal preview-modal">
        <div class="modal-header">
          <h2>E-Mail-Vorschau</h2>
          <button class="modal-close" @click="closePreviewModal">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
        <div class="preview-content" v-if="previewData">
          <div class="preview-section">
            <strong>Betreff:</strong>
            <p class="preview-subject">{{ previewData.subject }}</p>
          </div>
          <div class="preview-divider"></div>
          <div class="preview-section">
            <strong>E-Mail-Inhalt:</strong>
            <iframe
              v-if="previewData.html"
              class="email-preview-frame"
              :srcdoc="previewData.html"
              title="Email Preview"
            ></iframe>
          </div>
        </div>
        <div v-else class="preview-loading">
          <div class="spinner-sm"></div>
          <p>Wird geladen...</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closePreviewModal">Schließen</button>
        </div>
      </div>
    </div>

    <!-- Test Email Modal -->
    <div v-if="showTestModal" class="modal-overlay" @click.self="closeTestModal">
      <div class="modal">
        <div class="modal-header">
          <h2>Test-E-Mail senden</h2>
          <button class="modal-close" @click="closeTestModal">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Test-E-Mail-Adresse *</label>
            <input
              v-model="testEmailAddress"
              type="email"
              class="input"
              placeholder="beispiel@example.com"
              @keyup.enter="sendTestEmail"
            >
            <small class="help">Adresse, an die die Test-E-Mail gesendet wird</small>
          </div>

          <div class="field">
            <label>Lead (Optional)</label>
            <select v-model="selectedTestLead" class="input">
              <option :value="null">Beispieldaten verwenden</option>
              <optgroup v-for="lead in availableLeads" :key="lead.id" :label="`${lead.title} (${lead.bids && lead.bids.length > 0 ? lead.bids[0].amount : lead.startPrice} €)`">
                <option :value="lead.id">{{ lead.title }}</option>
              </optgroup>
            </select>
            <small class="help">Wählen Sie einen Lead, um echte Lead-Daten zu verwenden</small>
          </div>

          <div class="field">
            <label class="checkbox-label">
              <input
                v-model="showTestVariables"
                type="checkbox"
              >
              <span>Zu verwendende Variablen anzeigen</span>
            </label>
          </div>

          <!-- Kullanılacak Değişkenler Tablosu -->
          <div v-if="showTestVariables && testVariables" class="variables-table">
            <h4>In E-Mail verwendete Variablen</h4>
            <table>
              <thead>
                <tr>
                  <th>Variablenname</th>
                  <th>Wert</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(value, key) in testVariables" :key="key">
                  <td class="variable-name"><code v-text="`{{${key}}}`"></code></td>
                  <td class="variable-value">{{ value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeTestModal" :disabled="sendingTest">Abbrechen</button>
          <button class="btn btn-primary" @click="sendTestEmail" :disabled="sendingTest || !testEmailAddress">
            <span v-if="sendingTest" class="spinner-sm"></span>
            <span v-else>Senden</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import api from '@/utils/axios.js'
import { useAlert } from '@/composables/useAlert.js'
import { useExportImport } from '@/composables/useExportImport.js'
import { Icon } from '@iconify/vue'

const { showAlert } = useAlert()

const activeTab = ref('email')

// Email Templates
const emailTemplates = ref([])
const showEmailModal = ref(false)
const editingEmailTemplate = ref(null)
const savingEmail = ref(false)

const emailForm = ref({
  type: '',
  name: '',
  description: '',
  subject: '',
  htmlContent: '',
  textContent: '',
  isActive: true,
  variables: []
})

// SMS Templates
const smsTemplates = ref([])
const showSmsModal = ref(false)
const editingSmsTemplate = ref(null)
const savingSms = ref(false)

// Preview Modal
const showPreviewModal = ref(false)
const previewData = ref(null)

// Test Email Modal
const showTestModal = ref(false)
const testEmailAddress = ref('')
const sendingTest = ref(false)
const currentTestingTemplate = ref(null)
const availableLeads = ref([])
const selectedTestLead = ref(null)
const showTestVariables = ref(false)
const testVariables = ref(null)
const loadingLeads = ref(false)

const smsForm = ref({
  type: '',
  name: '',
  description: '',
  content: '',
  isActive: true,
  variables: []
})

// Common variables with icons
const commonEmailVariables = [
  { name: 'companyName', icon: 'fa-building' },
  { name: 'leadTitle', icon: 'fa-file-lines' },
  { name: 'amount', icon: 'fa-euro-sign' },
  { name: 'currency', icon: 'fa-coins' },
  { name: 'leadUrl', icon: 'fa-link' },
  { name: 'year', icon: 'fa-calendar' },
  { name: 'newAmount', icon: 'fa-arrow-up' },
  { name: 'userName', icon: 'fa-user' },
  { name: 'userEmail', icon: 'fa-envelope' }
]

const commonSmsVariables = [
  { name: 'companyName', icon: 'fa-building' },
  { name: 'leadTitle', icon: 'fa-file-lines' },
  { name: 'amount', icon: 'fa-euro-sign' },
  { name: 'currency', icon: 'fa-coins' },
  { name: 'newAmount', icon: 'fa-arrow-up' }
]

// Drag & Drop
const draggedVariable = ref(null)
const showEmailPreview = ref(false)
const lastCursorPos = ref({ html: 0, text: 0, sms: 0 })
const showAdvancedHtml = ref(false)

function onDragStart(event, variable) {
  draggedVariable.value = variable
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('text/plain', `{{${variable}}}`)
}

function onDragEnter(event) {
  // Focus textarea when dragging over it
  event.target.focus()
}

function updateCursorPos(event, field) {
  const textarea = event.target
  if (textarea && typeof textarea.selectionStart === 'number') {
    lastCursorPos.value[field] = textarea.selectionStart
  }
}

// Text'ten HTML oluştur
function generateHtmlFromText() {
  const text = emailForm.value.textContent || ''

  if (!text.trim()) {
    emailForm.value.htmlContent = ''
    return
  }
  
  // Text'i HTML'e çevir
  const lines = text.split('\n')
  let html = `<div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#2563eb;color:#ffffff;padding:24px;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:700;">{{companyName}}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 24px;">
`
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) {
      // Boş satır - spacing ekle
      if (index > 0 && index < lines.length - 1) {
        html += '        <div style="height:16px;"></div>\n'
      }
    } else {
      // Normal satır - paragraph olarak ekle
      html += `        <p style="margin:0 0 12px 0;line-height:1.6;color:#374151;">${trimmedLine}</p>\n`
    }
  })
  
  html += `      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;color:#6b7280;padding:20px 24px;font-size:12px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0;">© {{year}} {{companyName}}</p>
      </td>
    </tr>
  </table>
</div>`
  
  emailForm.value.htmlContent = html
}

// Text içeriği değiştiğinde HTML'i otomatik güncelle (eğer advanced açık değilse)
function onTextContentChange() {
  
  if (!showAdvancedHtml.value) {
    // Kullanıcı HTML'i manuel düzenlemiyorsa, otomatik güncelle
    generateHtmlFromText()
  }
}

// Email subject insertion
function insertVariableToSubject(variable) {
  const input = emailSubjectInput.value
  if (!input) return
  
  const start = input.selectionStart
  const end = input.selectionEnd
  const text = emailForm.value.subject
  const before = text.substring(0, start)
  const after = text.substring(end)
  
  emailForm.value.subject = before + `{{${variable}}}` + after
  
  // Set cursor position after inserted variable
  nextTick(() => {
    const newPos = start + variable.length + 4 // {{}} = 4 chars
    input.setSelectionRange(newPos, newPos)
    input.focus()
  })
}

function onDropToSubject(event) {
  event.preventDefault()
  if (!draggedVariable.value) return
  
  const input = event.target
  const text = emailForm.value.subject || ''
  
  // Calculate cursor position from click/drop coordinates
  input.focus()
  const clickX = event.clientX
  const rect = input.getBoundingClientRect()
  const relativeX = clickX - rect.left
  
  // Use approximate character position
  const charWidth = 8 // Approximate character width
  const estimatedPos = Math.floor(relativeX / charWidth)
  const cursorPos = Math.min(estimatedPos, text.length)
  
  const before = text.substring(0, cursorPos)
  const after = text.substring(cursorPos)
  
  emailForm.value.subject = before + `{{${draggedVariable.value}}}` + after
  
  nextTick(() => {
    const newPos = cursorPos + draggedVariable.value.length + 4
    input.setSelectionRange(newPos, newPos)
    input.focus()
  })
  
  draggedVariable.value = null
}

// HTML content insertion
function insertVariableToHtml(variable) {
  const textarea = emailHtmlTextarea.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = emailForm.value.htmlContent
  const before = text.substring(0, start)
  const after = text.substring(end)
  
  emailForm.value.htmlContent = before + `{{${variable}}}` + after
  
  nextTick(() => {
    const newPos = start + variable.length + 4
    textarea.setSelectionRange(newPos, newPos)
    textarea.focus()
  })
}

function onDropToHtml(event) {
  event.preventDefault()
  if (!draggedVariable.value) return
  
  const textarea = event.target
  const text = emailForm.value.htmlContent || ''
  
  // Use last known cursor position or end of text
  const cursorPos = lastCursorPos.value.html || text.length
  const before = text.substring(0, cursorPos)
  const after = text.substring(cursorPos)
  
  emailForm.value.htmlContent = before + `{{${draggedVariable.value}}}` + after
  
  nextTick(() => {
    const newPos = cursorPos + draggedVariable.value.length + 4
    lastCursorPos.value.html = newPos
    textarea.setSelectionRange(newPos, newPos)
    textarea.focus()
  })
  
  draggedVariable.value = null
}

// Text content insertion
function insertVariableToText(variable) {
  const textarea = emailTextTextarea.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = emailForm.value.textContent
  const before = text.substring(0, start)
  const after = text.substring(end)
  
  emailForm.value.textContent = before + `{{${variable}}}` + after
  
  nextTick(() => {
    const newPos = start + variable.length + 4
    textarea.setSelectionRange(newPos, newPos)
    textarea.focus()
  })
}

function onDropToText(event) {
  event.preventDefault()
  if (!draggedVariable.value) return
  
  const textarea = event.target
  const text = emailForm.value.textContent || ''
  
  // Use last known cursor position or end of text
  const cursorPos = lastCursorPos.value.text || text.length
  const before = text.substring(0, cursorPos)
  const after = text.substring(cursorPos)
  
  emailForm.value.textContent = before + `{{${draggedVariable.value}}}` + after
  
  nextTick(() => {
    const newPos = cursorPos + draggedVariable.value.length + 4
    lastCursorPos.value.text = newPos
    textarea.setSelectionRange(newPos, newPos)
    textarea.focus()
  })
  
  draggedVariable.value = null
}

// SMS content insertion
function insertVariableToSms(variable) {
  const textarea = smsContentTextarea.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = smsForm.value.content
  const before = text.substring(0, start)
  const after = text.substring(end)
  
  smsForm.value.content = before + `{{${variable}}}` + after
  
  nextTick(() => {
    const newPos = start + variable.length + 4
    textarea.setSelectionRange(newPos, newPos)
    textarea.focus()
  })
}

function onDropToSmsContent(event) {
  event.preventDefault()
  if (!draggedVariable.value) return
  
  const textarea = event.target
  const text = smsForm.value.content || ''
  
  // Use last known cursor position or end of text
  const cursorPos = lastCursorPos.value.sms || text.length
  const before = text.substring(0, cursorPos)
  const after = text.substring(cursorPos)
  
  smsForm.value.content = before + `{{${draggedVariable.value}}}` + after
  
  nextTick(() => {
    const newPos = cursorPos + draggedVariable.value.length + 4
    lastCursorPos.value.sms = newPos
    textarea.setSelectionRange(newPos, newPos)
    textarea.focus()
  })
  
  draggedVariable.value = null
}

// Text formatting helpers
function wrapSelection(field, startTag, endTag) {
  const textarea = emailHtmlTextarea.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = emailForm.value[field]
  const selectedText = text.substring(start, end)
  
  if (!selectedText) {
    // No selection, just insert tags
    const before = text.substring(0, start)
    const after = text.substring(end)
    emailForm.value[field] = before + startTag + endTag + after
    
    nextTick(() => {
      textarea.setSelectionRange(start + startTag.length, start + startTag.length)
      textarea.focus()
    })
  } else {
    // Wrap selection
    const before = text.substring(0, start)
    const after = text.substring(end)
    emailForm.value[field] = before + startTag + selectedText + endTag + after
    
    nextTick(() => {
      textarea.setSelectionRange(start + startTag.length, start + startTag.length + selectedText.length)
      textarea.focus()
    })
  }
}

function insertTag(field, tag) {
  const textarea = emailHtmlTextarea.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const text = emailForm.value[field]
  const before = text.substring(0, start)
  const after = text.substring(start)
  
  emailForm.value[field] = before + tag + after
  
  nextTick(() => {
    textarea.setSelectionRange(start + tag.length, start + tag.length)
    textarea.focus()
  })
}

// SMS character counter
const smsCharCount = computed(() => {
  return smsForm.value.content.length
})

const smsPartCount = computed(() => {
  const length = smsForm.value.content.length
  if (length === 0) return 0
  if (length <= 160) return 1
  return Math.ceil(length / 153)
})

// Refs
const emailSubjectInput = ref(null)
const emailHtmlTextarea = ref(null)
const emailTextTextarea = ref(null)
const smsContentTextarea = ref(null)

// Load templates
async function loadEmailTemplates() {
  try {
    const response = await api.get('/email-sms-settings/email-templates')
    emailTemplates.value = response.data
  } catch (error) {
    console.error('E-Mail-Vorlagen konnten nicht geladen werden:', error)
    showAlert('Beim Laden der E-Mail-Vorlagen ist ein Fehler aufgetreten', 'error')
  }
}

async function loadSmsTemplates() {
  try {
    const response = await api.get('/email-sms-settings/sms-templates')
    smsTemplates.value = response.data
  } catch (error) {
    console.error('SMS-Vorlagen konnten nicht geladen werden:', error)
    showAlert('Beim Laden der SMS-Vorlagen ist ein Fehler aufgetreten', 'error')
  }
}

// Email Template Modal
function openEmailModal(template) {
  if (template) {
    editingEmailTemplate.value = template
    emailForm.value = {
      type: template.type,
      name: template.name,
      description: template.description || '',
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || '',
      isActive: template.isActive,
      variables: template.variables || []
    }
  } else {
    editingEmailTemplate.value = null
    emailForm.value = {
      type: '',
      name: '',
      description: '',
      subject: '',
      htmlContent: '',
      textContent: '',
      isActive: true,
      variables: []
    }
  }
  showAdvancedHtml.value = false // Her açılışta HTML kısmı kapalı
  showEmailModal.value = true
}

function closeEmailModal() {
  showEmailModal.value = false
  editingEmailTemplate.value = null
}

async function saveEmailTemplate() {
  try {
    // Validation
    if (!emailForm.value.type || !emailForm.value.name || !emailForm.value.subject || !emailForm.value.htmlContent) {
      showAlert('Bitte füllen Sie die erforderlichen Felder aus', 'error')
      return
    }

    savingEmail.value = true

    const data = {
      ...emailForm.value
    }

    if (editingEmailTemplate.value) {
      await api.put(`/email-sms-settings/email-templates/${editingEmailTemplate.value.id}`, data)
      showAlert('E-Mail-Vorlage aktualisiert', 'success')
    } else {
      await api.post('/email-sms-settings/email-templates', data)
      showAlert('E-Mail-Vorlage erstellt', 'success')
    }

    await loadEmailTemplates()
    closeEmailModal()
  } catch (error) {
    console.error('Fehler beim Speichern der E-Mail-Vorlage:', error)
    showAlert(error.response?.data?.message || 'Ein Fehler ist aufgetreten', 'error')
  } finally {
    savingEmail.value = false
  }
}

async function deleteEmailTemplate(id) {
  if (!confirm('Möchten Sie diese E-Mail-Vorlage wirklich löschen?')) {
    return
  }

  try {
    await api.delete(`/email-sms-settings/email-templates/${id}`)
    showAlert('E-Mail-Vorlage gelöscht', 'success')
    await loadEmailTemplates()
  } catch (error) {
    console.error('Fehler beim Löschen der E-Mail-Vorlage:', error)
    showAlert('Beim Löschen der E-Mail-Vorlage ist ein Fehler aufgetreten', 'error')
  }
}

// SMS Template Modal
function openSmsModal(template) {
  if (template) {
    editingSmsTemplate.value = template
    smsForm.value = {
      type: template.type,
      name: template.name,
      description: template.description || '',
      content: template.content,
      isActive: template.isActive,
      variables: template.variables || []
    }
  } else {
    editingSmsTemplate.value = null
    smsForm.value = {
      type: '',
      name: '',
      description: '',
      content: '',
      isActive: true,
      variables: []
    }
  }
  showSmsModal.value = true
}

function closeSmsModal() {
  showSmsModal.value = false
  editingSmsTemplate.value = null
}

async function saveSmsTemplate() {
  try {
    // Validation
    if (!smsForm.value.type || !smsForm.value.name || !smsForm.value.content) {
      showAlert('Bitte füllen Sie die erforderlichen Felder aus', 'error')
      return
    }

    savingSms.value = true

    const data = {
      ...smsForm.value
    }

    if (editingSmsTemplate.value) {
      await api.put(`/email-sms-settings/sms-templates/${editingSmsTemplate.value.id}`, data)
      showAlert('SMS-Vorlage aktualisiert', 'success')
    } else {
      await api.post('/email-sms-settings/sms-templates', data)
      showAlert('SMS-Vorlage erstellt', 'success')
    }

    await loadSmsTemplates()
    closeSmsModal()
  } catch (error) {
    console.error('Fehler beim Speichern der SMS-Vorlage:', error)
    showAlert(error.response?.data?.message || 'Ein Fehler ist aufgetreten', 'error')
  } finally {
    savingSms.value = false
  }
}

async function deleteSmsTemplate(id) {
  if (!confirm('Möchten Sie diese SMS-Vorlage wirklich löschen?')) {
    return
  }

  try {
    await api.delete(`/email-sms-settings/sms-templates/${id}`)
    showAlert('SMS-Vorlage gelöscht', 'success')
    await loadSmsTemplates()
  } catch (error) {
    console.error('Fehler beim Löschen der SMS-Vorlage:', error)
    showAlert('Beim Löschen der SMS-Vorlage ist ein Fehler aufgetreten', 'error')
  }
}

// Preview Email Template
async function previewEmailTemplate(template) {
  try {
    previewData.value = null
    showPreviewModal.value = true

    const response = await api.post(`/email-sms-settings/email-templates/${template.id}/preview`)
    previewData.value = response.data
  } catch (error) {
    console.error('Fehler bei der E-Mail-Vorlagenvorschau:', error)
    showAlert('E-Mail konnte nicht in der Vorschau angezeigt werden', 'error')
    showPreviewModal.value = false
  }
}

function closePreviewModal() {
  showPreviewModal.value = false
  previewData.value = null
}

// Test Email Modal Functions
async function openTestEmailModal(template) {
  currentTestingTemplate.value = template
  testEmailAddress.value = ''
  selectedTestLead.value = null
  showTestVariables.value = false
  testVariables.value = null
  showTestModal.value = true

  // Load available leads
  await loadAvailableLeads()
}

function closeTestModal() {
  showTestModal.value = false
  testEmailAddress.value = ''
  currentTestingTemplate.value = null
  selectedTestLead.value = null
  showTestVariables.value = false
  testVariables.value = null
}

async function loadAvailableLeads() {
  try {
    loadingLeads.value = true
    const response = await api.get('/email-sms-settings/leads-for-test')
    availableLeads.value = response.data
  } catch (error) {
    console.error('Leads konnten nicht geladen werden:', error)
    showAlert('Leads konnten nicht geladen werden', 'error')
  } finally {
    loadingLeads.value = false
  }
}

// Watch selectedTestLead to update variables
watch(selectedTestLead, async () => {
  if (selectedTestLead.value) {
    updateTestVariables()
  } else {
    testVariables.value = null
  }
})

function updateTestVariables() {
  if (!selectedTestLead.value) {
    testVariables.value = null
    return
  }

  const lead = availableLeads.value.find(l => l.id === selectedTestLead.value)
  if (!lead) return

  const currentBid = lead.bids && lead.bids.length > 0 ? lead.bids[0].amount : lead.startPrice
  const prevBid = lead.startPrice

  testVariables.value = {
    companyName: 'LeadPortal',
    leadTitle: lead.title,
    amount: currentBid.toString(),
    newAmount: prevBid.toString(),
    currency: 'TL',
    leadUrl: `https://leadportal.com/leads/${lead.id}`,
    year: new Date().getFullYear(),
    userName: lead.owner?.firstName || lead.owner?.username || 'Admin',
    userEmail: 'admin@leadportal.com'
  }
}

async function sendTestEmail() {
  if (!currentTestingTemplate.value || !testEmailAddress.value) {
    showAlert('Bitte geben Sie eine E-Mail-Adresse ein', 'error')
    return
  }

  try {
    sendingTest.value = true

    const payload = {
      testEmail: testEmailAddress.value
    }

    if (selectedTestLead.value) {
      payload.leadId = selectedTestLead.value
    }

    const response = await api.post(`/email-sms-settings/email-templates/${currentTestingTemplate.value.id}/send-test`, payload)

    showAlert(`Test-E-Mail wurde an ${testEmailAddress.value} gesendet`, 'success')

    // Gönderilen değişkenleri göster
    if (response.data.usedVariables) {
      testVariables.value = response.data.usedVariables
      showTestVariables.value = true
    }

    closeTestModal()
  } catch (error) {
    console.error('Fehler beim Senden der Test-E-Mail:', error)
    const errorMessage = error.response?.data?.message || 'Test-E-Mail konnte nicht gesendet werden'
    showAlert(errorMessage, 'error')
  } finally {
    sendingTest.value = false
  }
}

// Text content değişikliklerini izle
watch(() => emailForm.value.textContent, (newText) => {

  if (!showAdvancedHtml.value && newText) {
    generateHtmlFromText()
  }
})

// Export/Import Functions
async function getAllTemplatesData() {
  try {
    const [emailResponse, smsResponse] = await Promise.all([
      api.get('/email-sms-settings/email-templates'),
      api.get('/email-sms-settings/sms-templates')
    ])
    
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      emailTemplates: emailResponse.data || [],
      smsTemplates: smsResponse.data || []
    }
  } catch (err) {
    console.error('Fehler beim Abrufen der Vorlagen:', err)
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      emailTemplates: emailTemplates.value,
      smsTemplates: smsTemplates.value
    }
  }
}

async function setAllTemplatesData(data) {
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('Ungültiges Datenformat')
    }

    // Email templates'i yükle
    if (data.emailTemplates && Array.isArray(data.emailTemplates)) {
      for (const template of data.emailTemplates) {
        if (template.id) {
          await api.put(`/email-sms-settings/email-templates/${template.id}`, template)
        } else {
          await api.post('/email-sms-settings/email-templates', template)
        }
      }
    }

    // SMS templates'i yükle
    if (data.smsTemplates && Array.isArray(data.smsTemplates)) {
      for (const template of data.smsTemplates) {
        if (template.id) {
          await api.put(`/email-sms-settings/sms-templates/${template.id}`, template)
        } else {
          await api.post('/email-sms-settings/sms-templates', template)
        }
      }
    }

    // Sayfayı yeniden yükle
    await loadEmailTemplates()
    await loadSmsTemplates()
  } catch (err) {
    console.error('Fehler beim Laden der Vorlagen:', err)
    throw err
  }
}

function validateTemplatesData(data) {
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
  getData: getAllTemplatesData,
  setData: setAllTemplatesData,
  validateData: validateTemplatesData,
  fileName: 'email-sms-templates',
  fileExtension: 'json'
})

onMounted(() => {
  loadEmailTemplates()
  loadSmsTemplates()
})
</script>

<style scoped>
.admin-settings-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 0;
  margin: 0;
  width: 100%;
  overflow-x: hidden;
}

.page-content {
  width: 100%;
  margin: 0;
  padding: 0;
}

.page-header {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-left: auto;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: var(--muted);
  font-size: 1rem;
}

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



/* Templates Section */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.template-card {
  background: var(--panel);
  border: 1.5px solid #d1d5db;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.2s;
}

.template-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem;
  border-bottom: 1px solid var(--border);
}

.template-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.25rem 0;
}

.template-type {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--bg);
  color: var(--muted);
  font-size: 0.75rem;
  font-family: monospace;
  border-radius: 0.25rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 1rem;
}

.status-badge.active {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.template-body {
  padding: 1.25rem;
}

.template-description {
  color: var(--muted);
  font-size: 0.875rem;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.template-meta,
.template-content {
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.template-meta strong,
.template-content strong {
  color: var(--text);
  display: block;
  margin-bottom: 0.25rem;
}

.template-content p {
  color: var(--muted);
  margin: 0;
  white-space: pre-wrap;
}

.template-variables {
  font-size: 0.875rem;
}

.template-variables strong {
  color: var(--text);
  display: block;
  margin-bottom: 0.5rem;
}

.variables-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.variables-list code {
  padding: 0.25rem 0.5rem;
  background: var(--bg);
  color: var(--primary);
  font-size: 0.75rem;
  border-radius: 0.25rem;
  font-family: 'Courier New', monospace;
}

.template-footer {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  background: var(--bg);
  border-top: 1px solid var(--border);
}

/* Modal */
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
  padding: 1rem;
}

.modal {
  background: var(--panel);
  border-radius: 0.75rem;
  max-width: var(--page-max-width);
  width: 95%;
  max-height: 95vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--bg);
  color: var(--text);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border);
}

/* Form Elements */
.field {
  margin-bottom: 1.5rem;
}

.field:last-child {
  margin-bottom: 0;
}

.field label {
  display: block;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.input,
.textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1.5px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--text);
  background: var(--bg);
  transition: all 0.2s;
}

.input:focus,
.textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.input:disabled {
  background: var(--bg);
  color: var(--muted);
  cursor: not-allowed;
}

.textarea {
  resize: vertical;
  font-family: inherit;
}

.code-textarea {
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
}

.help {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--muted);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 400;
}

.checkbox-label input[type="checkbox"] {
  width: 1.125rem;
  height: 1.125rem;
  cursor: pointer;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: var(--muted);
  cursor: not-allowed;
}

.btn-outline {
  background: transparent;
  border: 1.5px solid #d1d5db;
  color: var(--text);
}

.btn-outline:hover {
  background: var(--bg);
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
}

.spinner-sm {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Variable Chips */
.variables-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  margin-bottom: 0.75rem;
  padding: 1rem;
  background: var(--bg);
  border: 2px dashed var(--border);
  border-radius: 0.75rem;
}

.variable-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  background: var(--panel);
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 600;
  border: 1.5px solid var(--primary);
  border-radius: 0.5rem;
  cursor: grab;
  transition: all 0.2s;
  user-select: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.variable-chip i {
  flex-shrink: 0;
  opacity: 0.7;
  font-size: 0.875rem;
}

.variable-chip:hover {
  background: var(--primary);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.variable-chip:hover i {
  opacity: 1;
}

.variable-chip:active {
  cursor: grabbing;
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Editor Toolbar */
.editor-toolbar {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: var(--bg);
  border: 1.5px solid #d1d5db;
  border-radius: 0.5rem;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: white;
  border: 1.5px solid #d1d5db;
  border-radius: 0.25rem;
  color: var(--text);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.toolbar-btn:active {
  transform: scale(0.95);
}

/* SMS Counter */
.sms-counter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--bg);
  border: 1.5px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.sms-counter .muted {
  color: var(--muted);
}

/* Drag & Drop Effects */
.input[draggable],
.textarea[draggable] {
  cursor: default;
}

.input:focus,
.textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Advanced Section */
.advanced-section {
  margin-top: 1.5rem;
  border-top: 2px solid var(--border);
  padding-top: 1.5rem;
}

.advanced-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem 1rem;
  background: var(--bg);
  border: 1.5px solid #d1d5db;
  border-radius: 0.5rem;
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.advanced-toggle:hover {
  background: var(--panel);
  border-color: var(--primary);
}

.advanced-toggle i {
  color: var(--primary);
}

.advanced-badge {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  background: var(--primary);
  color: white;
  font-size: 0.7rem;
  border-radius: 0.25rem;
  font-weight: 600;
}

.advanced-content {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg);
  border: 1.5px solid #d1d5db;
  border-radius: 0.5rem;
}

.advanced-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.8rem;
  color: #856404;
}

.advanced-warning i {
  color: #ffc107;
  flex-shrink: 0;
  margin-top: 2px;
}

/* Variables Table */
.variables-table {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--bg);
  border: 1.5px solid #d1d5db;
  border-radius: 0.5rem;
}

.variables-table h4 {
  margin: 0 0 1rem 0;
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 600;
}

.variables-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.variables-table th,
.variables-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

.variables-table th {
  background: var(--panel);
  font-weight: 600;
  color: var(--text);
}

.variables-table tbody tr:hover {
  background: var(--panel);
}

.variable-name code {
  background: rgba(37, 99, 235, 0.1);
  color: var(--primary);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
}

.variable-value {
  word-break: break-word;
  color: var(--muted);
}

/* Preview Modal */
.preview-modal {
  max-width: 900px;
  max-height: 90vh;
}

.preview-content {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 1rem;
  color: var(--muted);
}

.preview-section {
  margin-bottom: 1.5rem;
}

.preview-section strong {
  display: block;
  color: var(--text);
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.preview-subject {
  padding: 1rem;
  background: var(--bg);
  border-left: 4px solid var(--primary);
  border-radius: 0.5rem;
  color: var(--text);
  margin: 0;
  word-break: break-word;
}

.preview-divider {
  height: 1px;
  background: var(--border);
  margin: 1.5rem 0;
}

.email-preview-frame {
  width: 100%;
  height: 500px;
  border: 1.5px solid #d1d5db;
  border-radius: 0.5rem;
  background: white;
}

/* Responsive */
@media (max-width: 768px) {
  .templates-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .admin-settings-page {
  padding: 0;
}
  .page-content{
    width: 100%;
  }

  .tabs-nav {
    overflow-x: auto;
  }

  .tab-button {
    white-space: nowrap;
  }

  .tab-content {
    padding: 0rem;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .variables-chips {
    max-height: 120px;
    overflow-y: auto;
  }

  .editor-toolbar {
    overflow-x: auto;
  }

  .preview-modal {
    max-height: 95vh;
  }

  .email-preview-frame {
    height: 350px;
  }
}
</style>

