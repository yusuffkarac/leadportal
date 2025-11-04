<template>
  <div class="admin-settings-page">
    <div class="page-content">
      <div class="page-header">
        <div>
          <h1>Mail/SMS Ayarları</h1>
          <p class="subtitle">Email ve SMS template'lerini yönetin</p>
        </div>
         <button class="btn btn-primary" @click="openEmailModal(null)">
            <Icon icon="mdi:plus" width="16" height="16" />
            Yeni Template
          </button>
        
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
          <h2>Email Template'leri</h2>
         
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
                  {{ template.isActive ? 'Aktif' : 'Pasif' }}
                </span>
              </div>
            </div>
            <div class="template-body">
              <p class="template-description">{{ template.description }}</p>
              <div class="template-meta">
                <strong>Konu:</strong> {{ template.subject }}
              </div>
              <div class="template-variables" v-if="template.variables && template.variables.length">
                <strong>Değişkenler:</strong>
                <div class="variables-list">
                  <code v-for="variable in template.variables" :key="variable" v-text="`{{${variable}}}`"></code>
                </div>
              </div>
            </div>
            <div class="template-footer">
              <button class="btn btn-sm btn-outline" @click="previewEmailTemplate(template)">
                <Icon icon="mdi:eye" width="14" height="14" />
                Önizle
              </button>
              <button class="btn btn-sm btn-outline" @click="openTestEmailModal(template)">
                <Icon icon="mdi:email-send" width="14" height="14" />
                Test Gönder
              </button>
              <button class="btn btn-sm btn-outline" @click="openEmailModal(template)">
                <Icon icon="mdi:pencil" width="14" height="14" />
                Düzenle
              </button>
              <button class="btn btn-sm btn-danger" @click="deleteEmailTemplate(template.id)">
                <Icon icon="mdi:delete" width="14" height="14" />
                Sil
              </button>
            </div>
          </div>
        </div>
      </div>

        <!-- SMS Templates -->
        <div v-if="activeTab === 'sms'" class="tab-panel">
        <div class="section-header">
          <h2>SMS Template'leri</h2>
          <button class="btn btn-primary" @click="openSmsModal(null)">
            <Icon icon="mdi:plus" width="16" height="16" />
            Yeni Template
          </button>
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
                  {{ template.isActive ? 'Aktif' : 'Pasif' }}
                </span>
              </div>
            </div>
            <div class="template-body">
              <p class="template-description">{{ template.description }}</p>
              <div class="template-content">
                <strong>İçerik:</strong>
                <p>{{ template.content }}</p>
              </div>
              <div class="template-variables" v-if="template.variables && template.variables.length">
                <strong>Değişkenler:</strong>
                <div class="variables-list">
                  <code v-for="variable in template.variables" :key="variable" v-text="`{{${variable}}}`"></code>
                </div>
              </div>
            </div>
            <div class="template-footer">
              <button class="btn btn-sm btn-outline" @click="openSmsModal(template)">
                <Icon icon="mdi:pencil" width="14" height="14" />
                Düzenle
              </button>
              <button class="btn btn-sm btn-danger" @click="deleteSmsTemplate(template.id)">
                <Icon icon="mdi:delete" width="14" height="14" />
                Sil
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
          <h2>{{ editingEmailTemplate ? 'Email Template Düzenle' : 'Yeni Email Template' }}</h2>
          <button class="modal-close" @click="closeEmailModal">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Template Tipi *</label>
            <input
              v-model="emailForm.type"
              type="text"
              class="input"
              placeholder="Örnek: bidReceived, outbid, leadWon"
              :disabled="!!editingEmailTemplate"
            >
            <small class="help">Benzersiz bir tip belirtin (örn: bidReceived)</small>
          </div>
          
          <div class="field">
            <label>Template Adı *</label>
            <input
              v-model="emailForm.name"
              type="text"
              class="input"
              placeholder="Örnek: Teklif Alındı"
            >
          </div>
          
          <div class="field">
            <label>Açıklama</label>
            <textarea
              v-model="emailForm.description"
              class="textarea"
              rows="2"
              placeholder="Bu template ne için kullanılır?"
            ></textarea>
          </div>
          
          <div class="field">
            <label>Email Konusu *</label>
            <div class="variables-chips">
              <span 
                v-for="variable in commonEmailVariables" 
                :key="variable.name"
                class="variable-chip"
                draggable="true"
                @dragstart="onDragStart($event, variable.name)"
                @click="insertVariableToSubject(variable.name)"
                :title="`Konu satırına eklemek için tıklayın veya sürükleyin`"
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
              placeholder="Örnek: Teklifiniz alındı: {{leadTitle}}"
              @drop="onDropToSubject"
              @dragover.prevent
            >
            <small class="help">Değişkenleri tıklayın veya sürükleyin</small>
          </div>
          
          <div class="field">
            <label>Email İçeriği *</label>
            <div class="variables-chips">
              <span 
                v-for="variable in commonEmailVariables" 
                :key="variable.name"
                class="variable-chip"
                draggable="true"
                @dragstart="onDragStart($event, variable.name)"
                @click="insertVariableToText(variable.name)"
                :title="`İçeriğe eklemek için tıklayın veya sürükleyin`"
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
              placeholder="Email içeriğinizi buraya yazın...

Örnek:
Merhaba {{userName}},

{{leadTitle}} ilanına {{amount}} {{currency}} teklif verdiniz.

Teşekkürler,
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
              Buraya yazdığınız metin otomatik olarak güzel bir email tasarımına dönüştürülür
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
              Gelişmiş: HTML Düzenle
              <span class="advanced-badge">İsteğe Bağlı</span>
            </button>
            
            <div v-show="showAdvancedHtml" class="advanced-content">
              <div class="advanced-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Dikkat: HTML'i manuel düzenlediğinizde, yukarıdaki metin içeriği değiştiğinde HTML otomatik güncellenmeyecektir.</span>
              </div>
              
              <div class="variables-chips">
                <span 
                  v-for="variable in commonEmailVariables" 
                  :key="variable.name"
                  class="variable-chip"
                  draggable="true"
                  @dragstart="onDragStart($event, variable.name)"
                  @click="insertVariableToHtml(variable.name)"
                  :title="`HTML içeriğine eklemek için tıklayın veya sürükleyin`"
                >
                  <i :class="['fas', variable.icon]"></i>
                  {{ variable.name }}
                </span>
              </div>
              
              <div class="editor-toolbar">
                <button type="button" class="toolbar-btn" @click="wrapSelection('htmlContent', '<strong>', '</strong>')" title="Kalın">
                  <strong>B</strong>
                </button>
                <button type="button" class="toolbar-btn" @click="wrapSelection('htmlContent', '<em>', '</em>')" title="İtalik">
                  <em>I</em>
                </button>
                <button type="button" class="toolbar-btn" @click="wrapSelection('htmlContent', '<u>', '</u>')" title="Altı Çizili">
                  <u>U</u>
                </button>
                <button type="button" class="toolbar-btn" @click="insertTag('htmlContent', '<br>')" title="Satır Sonu">
                  ↵
                </button>
                <button type="button" class="toolbar-btn" @click="generateHtmlFromText" title="Text'ten HTML Oluştur">
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
              <small class="help">HTML email içeriği (gelişmiş kullanıcılar için)</small>
            </div>
          </div>
          
          <div class="field">
            <label class="checkbox-label">
              <input
                v-model="emailForm.isActive"
                type="checkbox"
              >
              <span>Template aktif</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeEmailModal">İptal</button>
          <button v-if="editingEmailTemplate" class="btn btn-outline" @click="previewEmailTemplate(editingEmailTemplate)">
            <Icon icon="mdi:eye" width="14" height="14" />
            Önizle
          </button>
          <button v-if="editingEmailTemplate" class="btn btn-outline" @click="openTestEmailModal(editingEmailTemplate)">
            <Icon icon="mdi:email-send" width="14" height="14" />
            Test Gönder
          </button>
          <button class="btn btn-primary" @click="saveEmailTemplate" :disabled="savingEmail">
            <span v-if="savingEmail" class="spinner-sm"></span>
            <span v-else>{{ editingEmailTemplate ? 'Güncelle' : 'Oluştur' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- SMS Template Modal -->
    <div v-if="showSmsModal" class="modal-overlay" @click.self="closeSmsModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingSmsTemplate ? 'SMS Template Düzenle' : 'Yeni SMS Template' }}</h2>
          <button class="modal-close" @click="closeSmsModal">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Template Tipi *</label>
            <input
              v-model="smsForm.type"
              type="text"
              class="input"
              placeholder="Örnek: bidReceived, outbid, leadWon"
              :disabled="!!editingSmsTemplate"
            >
            <small class="help">Benzersiz bir tip belirtin</small>
          </div>
          
          <div class="field">
            <label>Template Adı *</label>
            <input
              v-model="smsForm.name"
              type="text"
              class="input"
              placeholder="Örnek: Teklif Alındı"
            >
          </div>
          
          <div class="field">
            <label>Açıklama</label>
            <textarea
              v-model="smsForm.description"
              class="textarea"
              rows="2"
              placeholder="Bu template ne için kullanılır?"
            ></textarea>
          </div>
          
          <div class="field">
            <label>SMS İçeriği *</label>
            <div class="variables-chips">
              <span 
                v-for="variable in commonSmsVariables" 
                :key="variable.name"
                class="variable-chip"
                draggable="true"
                @dragstart="onDragStart($event, variable.name)"
                @click="insertVariableToSms(variable.name)"
                :title="`SMS içeriğine eklemek için tıklayın veya sürükleyin`"
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
              placeholder="{{leadTitle}} ilanina {{amount}} {{currency}} teklif verdiniz."
              @drop="onDropToSmsContent"
              @dragover.prevent
              @dragenter="onDragEnter"
              @click="updateCursorPos($event, 'sms')"
              @keyup="updateCursorPos($event, 'sms')"
            ></textarea>
            <div class="sms-counter">
              <span>{{ smsCharCount }} karakter</span>
              <span class="muted">{{ smsPartCount }} SMS</span>
            </div>
            <small class="help">SMS mesajı. Değişkenleri yukarıdan sürükleyin</small>
          </div>
          
          <div class="field">
            <label class="checkbox-label">
              <input
                v-model="smsForm.isActive"
                type="checkbox"
              >
              <span>Template aktif</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeSmsModal">İptal</button>
          <button class="btn btn-primary" @click="saveSmsTemplate" :disabled="savingSms">
            <span v-if="savingSms" class="spinner-sm"></span>
            <span v-else>{{ editingSmsTemplate ? 'Güncelle' : 'Oluştur' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Email Preview Modal -->
    <div v-if="showPreviewModal" class="modal-overlay" @click.self="closePreviewModal">
      <div class="modal preview-modal">
        <div class="modal-header">
          <h2>Email Önizlemesi</h2>
          <button class="modal-close" @click="closePreviewModal">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
        <div class="preview-content" v-if="previewData">
          <div class="preview-section">
            <strong>Konu:</strong>
            <p class="preview-subject">{{ previewData.subject }}</p>
          </div>
          <div class="preview-divider"></div>
          <div class="preview-section">
            <strong>Email İçeriği:</strong>
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
          <p>Yükleniyor...</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closePreviewModal">Kapat</button>
        </div>
      </div>
    </div>

    <!-- Test Email Modal -->
    <div v-if="showTestModal" class="modal-overlay" @click.self="closeTestModal">
      <div class="modal">
        <div class="modal-header">
          <h2>Test Email Gönder</h2>
          <button class="modal-close" @click="closeTestModal">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Test Email Adresi *</label>
            <input
              v-model="testEmailAddress"
              type="email"
              class="input"
              placeholder="ornek@example.com"
              @keyup.enter="sendTestEmail"
            >
            <small class="help">Test emailinin gönderileceği adres</small>
          </div>

          <div class="field">
            <label>Lead (Opsiyonel)</label>
            <select v-model="selectedTestLead" class="input">
              <option :value="null">Örnek Veriler Kullan</option>
              <optgroup v-for="lead in availableLeads" :key="lead.id" :label="`${lead.title} (${lead.bids && lead.bids.length > 0 ? lead.bids[0].amount : lead.startPrice} TL)`">
                <option :value="lead.id">{{ lead.title }}</option>
              </optgroup>
            </select>
            <small class="help">Gerçek lead verilerini kullanmak için bir lead seçin</small>
          </div>

          <div class="field">
            <label class="checkbox-label">
              <input
                v-model="showTestVariables"
                type="checkbox"
              >
              <span>Kullanılacak değişkenleri göster</span>
            </label>
          </div>

          <!-- Kullanılacak Değişkenler Tablosu -->
          <div v-if="showTestVariables && testVariables" class="variables-table">
            <h4>Email'de Kullanılacak Değişkenler</h4>
            <table>
              <thead>
                <tr>
                  <th>Değişken Adı</th>
                  <th>Değeri</th>
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
          <button class="btn btn-outline" @click="closeTestModal" :disabled="sendingTest">İptal</button>
          <button class="btn btn-primary" @click="sendTestEmail" :disabled="sendingTest || !testEmailAddress">
            <span v-if="sendingTest" class="spinner-sm"></span>
            <span v-else>Gönder</span>
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
    console.error('Email templates yüklenemedi:', error)
    showAlert('Email template\'leri yüklenirken bir hata oluştu', 'error')
  }
}

async function loadSmsTemplates() {
  try {
    const response = await api.get('/email-sms-settings/sms-templates')
    smsTemplates.value = response.data
  } catch (error) {
    console.error('SMS templates yüklenemedi:', error)
    showAlert('SMS template\'leri yüklenirken bir hata oluştu', 'error')
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
      showAlert('Lütfen zorunlu alanları doldurun', 'error')
      return
    }

    savingEmail.value = true

    const data = {
      ...emailForm.value
    }

    if (editingEmailTemplate.value) {
      await api.put(`/email-sms-settings/email-templates/${editingEmailTemplate.value.id}`, data)
      showAlert('Email template güncellendi', 'success')
    } else {
      await api.post('/email-sms-settings/email-templates', data)
      showAlert('Email template oluşturuldu', 'success')
    }

    await loadEmailTemplates()
    closeEmailModal()
  } catch (error) {
    console.error('Email template kaydetme hatası:', error)
    showAlert(error.response?.data?.message || 'Bir hata oluştu', 'error')
  } finally {
    savingEmail.value = false
  }
}

async function deleteEmailTemplate(id) {
  if (!confirm('Bu email template\'ini silmek istediğinize emin misiniz?')) {
    return
  }

  try {
    await api.delete(`/email-sms-settings/email-templates/${id}`)
    showAlert('Email template silindi', 'success')
    await loadEmailTemplates()
  } catch (error) {
    console.error('Email template silme hatası:', error)
    showAlert('Email template silinirken bir hata oluştu', 'error')
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
      showAlert('Lütfen zorunlu alanları doldurun', 'error')
      return
    }

    savingSms.value = true

    const data = {
      ...smsForm.value
    }

    if (editingSmsTemplate.value) {
      await api.put(`/email-sms-settings/sms-templates/${editingSmsTemplate.value.id}`, data)
      showAlert('SMS template güncellendi', 'success')
    } else {
      await api.post('/email-sms-settings/sms-templates', data)
      showAlert('SMS template oluşturuldu', 'success')
    }

    await loadSmsTemplates()
    closeSmsModal()
  } catch (error) {
    console.error('SMS template kaydetme hatası:', error)
    showAlert(error.response?.data?.message || 'Bir hata oluştu', 'error')
  } finally {
    savingSms.value = false
  }
}

async function deleteSmsTemplate(id) {
  if (!confirm('Bu SMS template\'ini silmek istediğinize emin misiniz?')) {
    return
  }

  try {
    await api.delete(`/email-sms-settings/sms-templates/${id}`)
    showAlert('SMS template silindi', 'success')
    await loadSmsTemplates()
  } catch (error) {
    console.error('SMS template silme hatası:', error)
    showAlert('SMS template silinirken bir hata oluştu', 'error')
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
    console.error('Email template preview hatası:', error)
    showAlert('Email önizlenemedi', 'error')
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
    console.error('Lead\'ler yüklenemedi:', error)
    showAlert('Lead\'ler yüklenemedi', 'error')
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
    showAlert('Lütfen email adresini girin', 'error')
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

    showAlert(`Test email ${testEmailAddress.value} adresine gönderildi`, 'success')

    // Gönderilen değişkenleri göster
    if (response.data.usedVariables) {
      testVariables.value = response.data.usedVariables
      showTestVariables.value = true
    }

    closeTestModal()
  } catch (error) {
    console.error('Test email gönderme hatası:', error)
    const errorMessage = error.response?.data?.message || 'Test email gönderilemedi'
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

onMounted(() => {
  loadEmailTemplates()
  loadSmsTemplates()
})
</script>

<style scoped>
.admin-settings-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 2rem 1rem;
  overflow-x: hidden;
}

.page-content {
  max-width: 90%;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
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

.tab-content {
  padding: 2rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
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
  border: 1px solid var(--border);
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
  max-width: 90%;
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
  border: 1px solid var(--border);
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
  border: 1px solid var(--border);
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
  border: 1px solid var(--border);
  border-radius: 0.5rem;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: white;
  border: 1px solid var(--border);
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
  border: 1px solid var(--border);
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
  border: 1px solid var(--border);
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
  border: 1px solid var(--border);
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
  border: 1px solid var(--border);
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
  border: 1px solid var(--border);
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
}

  .admin-settings-page {
  padding: 0;
}
  .page-content{
    max-width: 95%;
  }

  .tabs-nav {
    overflow-x: auto;
  }

  .tab-button {
    white-space: nowrap;
  }

  .tab-content {
    padding: 1.5rem;
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

