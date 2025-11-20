<script setup>
import { ref, computed, watch, onMounted, watchEffect, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import axios from 'axios'
import { formatPrice } from '@/utils/currency.js'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  selectedLead: {
    type: Object,
    required: false,
    default: null
  },
  isAdmin: {
    type: Boolean,
    required: false,
    default: false
  },
  currentUserId: {
    type: String,
    required: false,
    default: null
  }
})

const emit = defineEmits(['close', 'feedback-submitted'])

const rating = ref(0)
const hoverRating = ref(0)
const comment = ref('')
const isLoading = ref(false)
const isSubmitting = ref(false)
const error = ref('')
const success = ref('')
const feedback = ref(null)
const replies = ref([])
const replyMessage = ref('')
const isReplySubmitting = ref(false)
const isRefreshing = ref(false)
let refreshInterval = null

// Refs
const chatContainer = ref(null)

// Local variable for template access
const selectedLead = computed(() => props.selectedLead)

const authHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return { 'Authorization': `Bearer ${token}` }
}

// Watch for modal opening AND selectedLead changes
watch(
  () => props.show,
  async (newShow) => {
    if (newShow && props.selectedLead?.id) {
      // Modal is open and we have a lead
      // Clear previous states
      error.value = ''
      success.value = ''

      // Load feedback
      try {
        await loadFeedback()
      } catch (err) {
        console.error('[FeedbackModal] loadFeedback() error:', err)
      }

      // Start auto-refresh for existing feedback
      if (refreshInterval) clearInterval(refreshInterval)
      refreshInterval = setInterval(async () => {
        if (feedback.value) {
          try {
            const response = await axios.get(`/api/feedback/${feedback.value.id}`, {
              headers: authHeaders()
            })
            // Only update replies, don't reset the whole feedback
            const newReplies = response.data.replies || []
            const previousLength = replies.value.length
            replies.value = newReplies
            // Update status if changed
            if (feedback.value && response.data.status !== feedback.value.status) {
              feedback.value.status = response.data.status
            }
            // Auto scroll if new message arrived
            if (newReplies.length > previousLength) {
              await nextTick()
              setTimeout(() => {
                scrollToBottom()
              }, 100)
            }
          } catch (err) {
            console.error('[FeedbackModal Auto-Refresh] Error:', err)
          }
        }
      }, 5000)
    } else if (!newShow) {
      // Modal is closing
      if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
      }
      // Reset on close
      rating.value = 0
      hoverRating.value = 0
      comment.value = ''
      feedback.value = null
      replies.value = []
      replyMessage.value = ''
      error.value = ''
      success.value = ''
    }
  },
  { immediate: true }
)

const hasExistingFeedback = computed(() => !!feedback.value)

const canSubmit = computed(() => {
  if (hasExistingFeedback.value) return false
  return rating.value > 0 || comment.value.trim().length > 0
})

const starClass = (index) => {
  const starRating = hoverRating.value || rating.value
  return index < starRating ? 'filled' : 'empty'
}

function isFromOwner(reply) {
  const replyUserId = reply?.user?.id != null ? String(reply.user.id) : ''
  const ownerId = feedback.value?.user?.id != null ? String(feedback.value.user.id) : ''
  return replyUserId === ownerId
}

function getSideClasses(reply) {
  // Determine if this message is from the original feedback owner (user)
  const fromOwner = isFromOwner(reply)
  // If viewer is admin, owner's messages should appear on the left (opposite)
  // If viewer is user, owner's messages should appear on the right (own)
  const isUserSide = props.isAdmin ? !fromOwner : fromOwner
  return { 'chat-message': true, 'is-user': isUserSide, 'is-admin': !isUserSide }
}

async function loadFeedback() {
  try {
    isLoading.value = true
    error.value = ''

    console.log('[FeedbackModal] loadFeedback called', {
      currentUserId: props.currentUserId,
      isAdmin: props.isAdmin,
      selectedLeadId: props.selectedLead?.id
    })

    const leadSaleId = props.selectedLead?.id

    if (!leadSaleId) {
      isLoading.value = false
      return
    }

    try {
      // If admin mode and we have a direct feedbackId in the lead object
      if (props.isAdmin && props.selectedLead?.feedbackId) {
        const detailResponse = await axios.get(`/api/feedback/${props.selectedLead.feedbackId}`, {
          headers: authHeaders()
        })

        feedback.value = detailResponse.data
        replies.value = detailResponse.data.replies || []
        rating.value = detailResponse.data.rating || 0
        comment.value = detailResponse.data.comment || ''
        await nextTick()
        // Scroll to bottom after a short delay to ensure DOM is fully rendered
        setTimeout(() => {
          scrollToBottom()
        }, 50)
      } else {
        // Normal user mode - find feedback by leadSaleId
        const listResponse = await axios.get('/api/feedback', {
          headers: authHeaders()
        })

        const existing = listResponse.data.find(f => f.leadSaleId === leadSaleId)

        if (existing) {
          // Now fetch the specific feedback with all replies
          const detailResponse = await axios.get(`/api/feedback/${existing.id}`, {
            headers: authHeaders()
          })

          feedback.value = detailResponse.data
          replies.value = detailResponse.data.replies || []
          rating.value = detailResponse.data.rating || 0
          comment.value = detailResponse.data.comment || ''
          await nextTick()
          // Scroll to bottom after a short delay to ensure DOM is fully rendered
          setTimeout(() => {
            scrollToBottom()
          }, 50)
        }
      }
    } catch (err) {
      console.error('[loadFeedback] Error:', err.response?.data || err.message)
    }
  } catch (err) {
    console.error('[loadFeedback] Outer error:', err)
  } finally {
    isLoading.value = false
  }
}

async function submitFeedback() {
  if (!canSubmit.value) return

  try {
    isSubmitting.value = true
    error.value = ''
    success.value = ''

    const leadSaleId = props.selectedLead?.id
    const response = await axios.post('/api/feedback', {
      leadSaleId,
      rating: rating.value || undefined,
      comment: comment.value || undefined
    }, {
      headers: authHeaders()
    })

    feedback.value = response.data
    success.value = 'Geri bildirim başarıyla gönderildi!'
    emit('feedback-submitted')

    setTimeout(() => {
      success.value = ''
    }, 3000)
  } catch (err) {
    error.value = err.response?.data?.error || 'Geri bildirim gönderilemedi'
  } finally {
    isSubmitting.value = false
  }
}

async function submitReply() {
  if (!replyMessage.value.trim() || !feedback.value) return

  try {
    isReplySubmitting.value = true
    error.value = ''

    const response = await axios.post(`/api/feedback/${feedback.value.id}/reply`, {
      message: replyMessage.value
    }, {
      headers: authHeaders()
    })

    replies.value.push(response.data)
    replyMessage.value = ''
    success.value = 'Cevap başarıyla gönderildi!'

    // Scroll to bottom after sending reply
    await nextTick()
    setTimeout(() => {
      scrollToBottom()
    }, 100)

    // Refresh feedback to get updated status
    await loadFeedback()

    setTimeout(() => {
      success.value = ''
    }, 3000)
  } catch (err) {
    error.value = err.response?.data?.error || 'Cevap gönderilemedi'
  } finally {
    isReplySubmitting.value = false
  }
}

function scrollToBottom() {
  nextTick(() => {
    // Scroll modal body to show reply section
    const modalBody = document.querySelector('.feedback-view')
    if (modalBody) {
      setTimeout(() => {
        // Scroll to the very bottom to show reply input section
        modalBody.scrollTop = modalBody.scrollHeight
      }, 50)
    }
  })
}

watch(
  () => replies.value.length,
  async () => {
    await nextTick()
    scrollToBottom()
  }
)

// Watch for feedback changes to scroll to bottom
watch(
  () => feedback.value?.id,
  async () => {
    if (feedback.value && replies.value.length > 0) {
      await nextTick()
      scrollToBottom()
    }
  }
)

async function refreshFeedback() {
  try {
    isRefreshing.value = true
    await loadFeedback()
    success.value = 'Güncellendi!'
    setTimeout(() => {
      success.value = ''
    }, 2000)
  } catch (err) {
    error.value = 'Güncelleme başarısız oldu'
  } finally {
    isRefreshing.value = false
  }
}

function handleOpen() {
  if (props.show) {
    loadFeedback()
  }
}

defineExpose({
  handleOpen
})
</script>

<template>
  <div v-if="props.show" class="feedback-modal-overlay" @click.self="$emit('close')">
    <div class="feedback-modal">
      <!-- Header -->
      <div class="modal-header">
        <div>
          <h2 class="modal-title">Geri Bildirim</h2>
          <p class="modal-subtitle">{{ selectedLead.lead?.title }}</p>
          <div class="header-info">
            <span v-if="selectedLead.lead?.id" class="info-item">
              <Icon icon="mdi:identifier" width="14" height="14" />
              Lead ID: {{ selectedLead.lead.id }}
            </span>
            <span v-if="selectedLead.amount" class="info-item">
              <Icon icon="mdi:currency-eur" width="14" height="14" />
              {{ formatPrice(selectedLead.amount, 'EUR') }}
            </span>
          </div>
          <div v-if="feedback" class="header-meta">
            <div class="header-stars" v-if="feedback.rating">
              <Icon v-for="i in 5" :key="i" icon="mdi:star" :class="{ filled: i <= feedback.rating }" width="14" height="14" />
            </div>
            <span class="status-chip" :class="feedback.status.toLowerCase()">{{ getStatusLabel(feedback.status) }}</span>
          </div>
        </div>
        <div class="header-right">
          <span v-if="feedback" class="feedback-date">{{ formatDate(feedback.createdAt) }}</span>
          <button class="close-btn" @click="$emit('close')">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>
      </div>
        <!-- Loading State -->
        <div v-if="isLoading" class="modal-body loading">
          <div class="spinner"></div>
          <p>Yükleniyor...</p>
        </div>

        <!-- Feedback Form -->
        <div v-else-if="!hasExistingFeedback && !props.isAdmin" class="modal-body">
        <!-- Star Rating -->
        <div class="form-group">
          <label class="form-label">Puan (İsteğe bağlı)</label>
          <div class="star-rating">
            <button
              v-for="(_, index) in 5"
              :key="index"
              class="star-btn"
              :class="starClass(index)"
              @click="rating = index + 1"
              @mouseenter="hoverRating = index + 1"
              @mouseleave="hoverRating = 0"
              :title="`${index + 1} yıldız`"
            >
              <Icon icon="mdi:star" width="32" height="32" />
            </button>
          </div>
          <p v-if="rating > 0" class="rating-text">{{ rating }} / 5 yıldız</p>
        </div>

        <!-- Comment -->
        <div class="form-group">
          <label class="form-label">Yorum (İsteğe bağlı)</label>
          <textarea
            v-model="comment"
            class="comment-input"
            placeholder="Deneyiminiz hakkında yorum yazın..."
            rows="5"
          ></textarea>
          <p class="char-count">{{ comment.length }} / 5000</p>
        </div>

        <!-- Messages -->
        <div v-if="error" class="alert alert-error">
          {{ error }}
        </div>
        <div v-if="success" class="alert alert-success">
          {{ success }}
        </div>

        <!-- Note -->
        <p class="form-note">
          <Icon icon="mdi:information-outline" width="16" height="16" />
          En az puan veya yorum gerekli
        </p>
      </div>

      <!-- Existing Feedback View -->
      <div v-else class="modal-body feedback-view">
        <!-- Original Feedback -->
        <div class="feedback-card">
          <div class="feedback-header">
            <div>
              <div v-if="feedback.rating" class="rating-stars">
                <Icon
                  v-for="i in 5"
                  :key="i"
                  icon="mdi:star"
                  :class="{ filled: i <= feedback.rating }"
                  width="16"
                  height="16"
                />
              </div>
              <p class="feedback-status" :class="feedback.status.toLowerCase()">
                {{ getStatusLabel(feedback.status) }}
              </p>
            </div>
            <p class="feedback-date">{{ formatDate(feedback.createdAt) }}</p>
          </div>

          <p v-if="feedback.comment" class="feedback-comment">
            {{ feedback.comment }}
          </p>

          <!-- <p v-if="feedback.assignedToUser" class="feedback-assigned">
            <strong>Sorumlu Admin:</strong> {{ feedback.assignedToUser.firstName || feedback.assignedToUser.email }}
          </p> -->
        </div>

        <!-- Replies / Conversation -->
        <div class="replies-section">
          <div class="replies-header">
            <h3 class="replies-title">
              <Icon icon="mdi:chat-multiple" width="18" height="18" />
              Konuşma ({{ replies.length }})
            </h3>
            <!-- <button
              class="refresh-btn"
              @click="refreshFeedback"
              :disabled="isRefreshing"
              title="Cevapları yenile"
            >
              <Icon icon="mdi:refresh" width="16" height="16" />
              <span v-if="isRefreshing">Yenileniyor...</span>
              <span v-else>Yenile</span>
            </button> -->
          </div>

          <div v-if="replies.length === 0" class="no-replies">
            <Icon icon="mdi:chat-outline" width="40" height="40" />
            <p>Henüz cevap yok</p>
            <p class="no-replies-hint">Admin'in cevabını bekleyin veya "Yenile" butonuna tıklayın.</p>
          </div>

          <div v-else class="chat-container" ref="chatContainer">
            <div
              v-for="reply in replies"
              :key="reply.id"
              :class="getSideClasses(reply)"
            >
              <div class="message-content">
                <div class="message-bubble">
                  <p class="message-text">{{ reply.message }}</p>
                </div>
                <div class="message-meta">
                  <span class="message-author">
                    {{ reply.user.firstName || reply.user.email }}
                    <!-- <span v-if="reply.isAdmin" class="admin-badge">
                      <Icon icon="mdi:shield-account" width="12" height="12" />
                      Admin
                    </span>-->
                  </span>
                  <span class="message-time">{{ formatDate(reply.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Reply Input -->
        <div v-if="feedback.status !== 'CLOSED' && feedback.status !== 'RESOLVED'" class="reply-input-section">
          <textarea
            v-model="replyMessage"
            class="reply-input"
            placeholder="Cevapla..."
            rows="3"
          ></textarea>
          <button
            class="submit-reply-btn"
            @click="submitReply"
            :disabled="!replyMessage.trim() || isReplySubmitting"
          >
            <Icon v-if="!isReplySubmitting" icon="mdi:send" width="16" height="16" />
            <span>{{ isReplySubmitting ? 'Gönderiliyor...' : 'Cevapla' }}</span>
          </button>
        </div>
        
        <!-- Status Message -->
        <div v-else class="reply-input-section">
          <div class="status-message">
            <Icon icon="mdi:lock" width="18" height="18" />
            <p>Bu geri bildirim {{ feedback.status === 'CLOSED' ? 'kapatıldı' : 'çözüldü' }}. Artık cevap yazılamaz.</p>
          </div>
        </div>

        <!-- Messages -->
        <div v-if="error" class="alert alert-error">
          {{ error }}
        </div>
        <div v-if="success" class="alert alert-success">
          {{ success }}
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">Kapat</button>
        <button
          v-if="!hasExistingFeedback && !props.isAdmin"
          class="btn-primary"
          @click="submitFeedback"
          :disabled="!canSubmit || isSubmitting"
        >
          <Icon icon="mdi:send" width="16" height="16" />
          {{ isSubmitting ? 'Gönderiliyor...' : 'Gönder' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    getStatusLabel(status) {
      const labels = {
        OPEN: 'Açık',
        IN_PROGRESS: 'İşleniyor',
        RESOLVED: 'Çözüldü',
        CLOSED: 'Kapatıldı'
      }
      return labels[status] || status
    }
  }
}
</script>

<style scoped>
.feedback-modal-overlay {
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
}

.feedback-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlide 0.3s ease-out;
}

@keyframes modalSlide {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.header-stars svg {
  color: #d1d5db;
}

.header-stars svg.filled {
  color: #fbbf24;
}

.status-chip {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status-chip.open { background: #dbeafe; color: #1e40af; }
.status-chip.in_progress { background: #fef3c7; color: #92400e; }
.status-chip.resolved { background: #dcfce7; color: #166534; }
.status-chip.closed { background: #f3f4f6; color: #6b7280; }

.modal-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-subtitle {
  margin: 4px 0 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.info-item svg {
  color: #9ca3af;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.modal-body.loading {
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.star-rating {
  display: flex;
  gap: 8px;
  justify-content: flex-start;
}

.star-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #d1d5db;
  padding: 0;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.star-btn.filled {
  color: #fbbf24;
}

.star-btn:hover {
  transform: scale(1.1);
}

.rating-text {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.comment-input {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.comment-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.char-count {
  margin: 4px 0 0 0;
  font-size: 0.75rem;
  color: #9ca3af;
}

.form-note {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
}

.alert {
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  margin: 0;
}

.alert-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.alert-success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.feedback-view {
  gap: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.feedback-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.rating-stars {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
}

.rating-stars svg {
  color: #d1d5db;
}

.rating-stars svg.filled {
  color: #fbbf24;
}

.feedback-status {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
}

.feedback-status.open {
  background: #dbeafe;
  color: #1e40af;
}

.feedback-status.in_progress {
  background: #fef3c7;
  color: #92400e;
}

.feedback-status.resolved {
  background: #dcfce7;
  color: #166534;
}

.feedback-status.closed {
  background: #f3f4f6;
  color: #6b7280;
}

.feedback-date {
  margin: 0;
  font-size: 0.75rem;
  color: #9ca3af;
}

.feedback-comment {
  margin: 0;
  color: #1f2937;
  line-height: 1.5;
}

.feedback-assigned {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.feedback-assigned strong {
  color: #374151;
}

.replies-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-top: 2px solid #f1f5f9;
  padding-top: 16px;
}

.replies-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.replies-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: none;
  letter-spacing: normal;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  color: #0369a1;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.refresh-btn:hover:not(:disabled) {
  background: #e0f2fe;
  border-color: #7dd3fc;
  transform: rotate(180deg);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-replies {
  text-align: center;
  padding: 32px 20px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-radius: 12px;
  color: #9ca3af;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.no-replies svg {
  color: #d1d5db;
  margin-bottom: 8px;
}

.no-replies p {
  margin: 0;
  line-height: 1.4;
  font-size: 0.875rem;
}

.no-replies-hint {
  font-size: 0.75rem;
  color: #9ca3af !important;
}

.chat-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px;
}

.chat-message {
  display: flex;
  margin-bottom: 8px;
}

.chat-message.is-user {
  justify-content: flex-end;
}

.chat-message.is-admin {
  justify-content: flex-start;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 75%;
}

.chat-message.is-admin .message-content {
  align-items: flex-start;
}

.chat-message.is-user .message-content {
  align-items: flex-end;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  word-wrap: break-word;
}

.chat-message.is-user .message-bubble {
  background: #f3f4f6; /* gray for own messages */
  color: #1f2937;
  border: 1px solid #e5e7eb;
  border-bottom-right-radius: 4px;
}

.chat-message.is-admin .message-bubble {
  background: #3b82f6; /* blue for other party */
  color: white;
  border-bottom-left-radius: 4px;
}

/* Bubble tails */
.message-bubble { position: relative; }
.chat-message.is-user .message-bubble::after {
  content: '';
  position: absolute;
  right: -6px;
  bottom: 0;
  width: 0; height: 0;
  border-left: 6px solid #e5e7eb;
  border-top: 6px solid transparent;
}
.chat-message.is-admin .message-bubble::after {
  content: '';
  position: absolute;
  left: -6px;
  bottom: 0;
  width: 0; height: 0;
  border-right: 6px solid #3b82f6;
  border-top: 6px solid transparent;
}

.message-text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.message-meta {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  align-items: center;
}

.chat-message.is-user .message-meta {
  justify-content: flex-end;
}

.chat-message.is-admin .message-meta {
  justify-content: flex-start;
}

.message-author {
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 4px;
}

.message-time {
  color: #9ca3af;
}

.reply-author {
  font-weight: 600;
  color: #1f2937;
}

.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #dcfce7;
  color: #166534;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  margin-left: 6px;
  font-weight: 600;
  border: 1px solid #bbf7d0;
}

.reply-date {
  color: #9ca3af;
}

.reply-message {
  margin: 0;
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.4;
}

.reply-input-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 2px solid #f1f5f9;
  padding-top: 16px;
}

.status-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 8px;
  color: #92400e;
}

.status-message svg {
  color: #f59e0b;
  flex-shrink: 0;
}

.status-message p {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.4;
}

.reply-input {
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: none;
  transition: all 0.2s ease;
  background: white;
}

.reply-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: white;
}

.reply-input::placeholder {
  color: #9ca3af;
}

.submit-reply-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-end;
}

.submit-reply-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.submit-reply-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f9fafb;
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
}

.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

@media (max-width: 640px) {
  .feedback-modal {
    width: 95%;
    max-height: 95vh;
  }

  .modal-header {
    padding: 16px;
  }

  .modal-body {
    padding: 16px;
  }

  .modal-footer {
    padding: 12px 16px;
    flex-direction: column-reverse;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>
