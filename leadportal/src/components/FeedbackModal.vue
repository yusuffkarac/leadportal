<script setup>
import { ref, computed, watch, onMounted, watchEffect } from 'vue'
import { Icon } from '@iconify/vue'
import axios from 'axios'

console.log('[FeedbackModal] Component loaded')

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  selectedLead: {
    type: Object,
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

// Local variable for template access
const selectedLead = computed(() => props.selectedLead)

const authHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return { 'Authorization': `Bearer ${token}` }
}

// Watch for modal opening - only load feedback when modal opens
watch(() => props.show, (newVal) => {
  console.log('[FeedbackModal] Watch triggered - show:', newVal, 'selectedLead:', props.selectedLead?.id)
  if (newVal) {
    // Clear previous states immediately
    error.value = ''
    success.value = ''

    // Defer to next tick to ensure props are updated
    setTimeout(async () => {
      if (props.selectedLead) {
        console.log('[FeedbackModal] Modal opened for lead:', {
          selectedLeadId: props.selectedLead?.id,
          leadTitle: props.selectedLead?.lead?.title
        })
        console.log('[FeedbackModal] About to call loadFeedback()')
        try {
          await loadFeedback()
          console.log('[FeedbackModal] loadFeedback() completed', {
            hasFeedback: !!feedback.value,
            feedbackId: feedback.value?.id
          })
        } catch (err) {
          console.error('[FeedbackModal] loadFeedback() error:', err)
        }
      } else {
        console.warn('[FeedbackModal] Modal opened but no selectedLead prop')
      }
    }, 0)

    // Auto-refresh every 5 seconds while modal is open to check for new admin replies
    if (refreshInterval) clearInterval(refreshInterval)
    refreshInterval = setInterval(async () => {
      if (feedback.value) {
        console.log('[FeedbackModal Auto-Refresh] Checking for new replies', { feedbackId: feedback.value.id })
        try {
          const response = await axios.get(`/api/feedback/${feedback.value.id}`, {
            headers: authHeaders()
          })
          // Only update replies, don't reset the whole feedback
          replies.value = response.data.replies || []
          // Update status if changed
          if (feedback.value && response.data.status !== feedback.value.status) {
            feedback.value.status = response.data.status
            console.log('[FeedbackModal Auto-Refresh] Status updated:', response.data.status)
          }
          console.log('[FeedbackModal Auto-Refresh] Replies updated:', replies.value.length)
        } catch (err) {
          console.error('[FeedbackModal Auto-Refresh] Error:', err)
        }
      }
    }, 5000)
  } else if (!newVal) {
    // Clear auto-refresh interval when modal closes
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
}, { immediate: false })

const hasExistingFeedback = computed(() => !!feedback.value)

const canSubmit = computed(() => {
  if (hasExistingFeedback.value) return false
  return rating.value > 0 || comment.value.trim().length > 0
})

const starClass = (index) => {
  const starRating = hoverRating.value || rating.value
  return index < starRating ? 'filled' : 'empty'
}

async function loadFeedback() {
  try {
    isLoading.value = true
    error.value = ''

    const leadSaleId = props.selectedLead?.id
    console.log('[loadFeedback] Starting with leadSaleId:', leadSaleId)

    if (!leadSaleId) {
      console.warn('[loadFeedback] No leadSaleId found, cannot load feedback')
      isLoading.value = false
      return
    }

    // First, try to find the feedback by checking the list
    try {
      console.log('[loadFeedback] Fetching user feedback list...')
      const listResponse = await axios.get('/api/feedback', {
        headers: authHeaders()
      })

      console.log('[loadFeedback] Got feedback list:', listResponse.data.length, 'items')
      console.log('[loadFeedback] List response data:', listResponse.data)

      const existing = listResponse.data.find(f => f.leadSaleId === leadSaleId)
      console.log('[loadFeedback] Looking for leadSaleId:', leadSaleId, 'Found existing:', existing?.id)

      if (existing) {
        // Now fetch the specific feedback with all replies
        console.log('[loadFeedback] Fetching detailed feedback:', existing.id)
        const detailResponse = await axios.get(`/api/feedback/${existing.id}`, {
          headers: authHeaders()
        })

        console.log('[loadFeedback] Detail response:', detailResponse.data)

        feedback.value = detailResponse.data
        replies.value = detailResponse.data.replies || []
        rating.value = detailResponse.data.rating || 0
        comment.value = detailResponse.data.comment || ''

        // Debug logging
        console.log('[loadFeedback] Feedback loaded successfully:', {
          feedbackId: feedback.value.id,
          status: feedback.value.status,
          totalReplies: replies.value.length,
          repliesIds: replies.value.map(r => r.id),
          replies: replies.value
        })
      } else {
        console.log('[loadFeedback] No existing feedback found for leadSaleId:', leadSaleId, 'Available lead sale IDs:', listResponse.data.map(f => f.leadSaleId))
      }
    } catch (err) {
      console.error('[loadFeedback] Error in list/detail fetch:', err.response?.data || err.message)
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
        </div>
        <button class="close-btn" @click="$emit('close')">
          <Icon icon="mdi:close" width="24" height="24" />
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="modal-body loading">
        <div class="spinner"></div>
        <p>Yükleniyor...</p>
      </div>

      <!-- Feedback Form -->
      <div v-else-if="!hasExistingFeedback" class="modal-body">
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

          <p v-if="feedback.assignedToUser" class="feedback-assigned">
            <strong>Sorumlu Admin:</strong> {{ feedback.assignedToUser.firstName || feedback.assignedToUser.email }}
          </p>
        </div>

        <!-- Replies -->
        <div class="replies-section">
          <div class="replies-header">
            <h3 class="replies-title">Konuşma ({{ replies.length }})</h3>
            <button
              class="refresh-btn"
              @click="refreshFeedback"
              :disabled="isRefreshing"
              title="Cevapları yenile"
            >
              <Icon icon="mdi:refresh" width="16" height="16" />
              <span v-if="isRefreshing">Yenileniyor...</span>
              <span v-else>Yenile</span>
            </button>
          </div>

          <div v-if="replies.length === 0" class="no-replies">
            <p>Henüz cevap yok. Admin'in cevabını bekleyin veya "Yenile" butonuna tıklayın.</p>
          </div>

          <div v-else class="replies-list">
            <div
              v-for="reply in replies"
              :key="reply.id"
              class="reply-item"
              :class="{ admin: reply.isAdmin }"
            >
              <div class="reply-header">
                <span class="reply-author">
                  {{ reply.user.firstName || reply.user.email }}
                  <span v-if="reply.isAdmin" class="admin-badge">Admin</span>
                </span>
                <span class="reply-date">{{ formatDate(reply.createdAt) }}</span>
              </div>
              <p class="reply-message">{{ reply.message }}</p>
            </div>
          </div>
        </div>

        <!-- Reply Input -->
        <div class="reply-input-section">
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
          v-if="!hasExistingFeedback"
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

.modal-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.modal-subtitle {
  margin: 4px 0 0 0;
  font-size: 0.875rem;
  color: #6b7280;
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
  gap: 12px;
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
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
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
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.no-replies {
  text-align: center;
  padding: 20px;
  background: #f9fafb;
  border-radius: 6px;
  color: #9ca3af;
  font-size: 0.875rem;
  border: 1px dashed #d1d5db;
}

.no-replies p {
  margin: 0;
  line-height: 1.4;
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.reply-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reply-item.admin {
  background: #f0fdf4;
  border-color: #dcfce7;
}

.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.reply-author {
  font-weight: 600;
  color: #1f2937;
}

.admin-badge {
  display: inline-block;
  background: #10b981;
  color: white;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 0.625rem;
  margin-left: 6px;
  font-weight: 600;
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
  gap: 8px;
}

.reply-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.reply-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.submit-reply-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-reply-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
}

.submit-reply-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  opacity: 0.6;
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
