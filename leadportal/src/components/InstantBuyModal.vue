<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import api from '@/utils/axios.js'
import { formatPrice, getCurrencySymbol } from '@/utils/currency.js'
import { useAlert } from '../composables/useAlert'

const { success, error } = useAlert()

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  lead: {
    type: Object,
    default: null
  },
  currency: {
    type: String,
    default: 'EUR'
  }
})

const emit = defineEmits(['close', 'success'])

const isProcessing = ref(false)

// Compute the correct price based on lead type
const purchasePrice = computed(() => {
  if (!props.lead) return 0
  // For SOFORT_KAUF use startPrice, for AUCTION use instantBuyPrice
  return props.lead.leadType === 'SOFORT_KAUF'
    ? props.lead.startPrice
    : props.lead.instantBuyPrice
})

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function close() {
  if (!isProcessing.value) {
    emit('close')
  }
}

async function confirmPurchase() {
  if (!props.lead) return

  isProcessing.value = true

  try {
    const response = await api.post(`/leads/${props.lead.id}/instant-buy`, {}, { headers: authHeaders() })

    if (response.data.success) {
      // Başarı mesajı göster
      const paymentInfo = response.data.paymentMethod === 'balance'
        ? `Bakiyenizden ${formatPrice(response.data.sale.amount, props.currency)} düşüldü.`
        : 'IBAN üzerinden ödeme yapılacaktır.'

      success(`Lead başarıyla satın alındı!\n\n${paymentInfo}`)

      emit('success', response.data)
      emit('close')
    }
  } catch (err) {
    const errorData = err.response?.data

    // Hata tipine göre mesaj göster
    if (errorData?.errorType === 'INSUFFICIENT_BALANCE') {
      error(`Yetersiz bakiye!\n\nGerekli: ${formatPrice(errorData.required, props.currency)}\nMevcut: ${formatPrice(errorData.available, props.currency)}\n\n${errorData.error}`)
    } else if (errorData?.errorType === 'IBAN_NOT_FOUND') {
      error(errorData.error + '\n\nProfil sayfanızdan IBAN bilgilerinizi ekleyebilirsiniz.')
    } else if (errorData?.error) {
      error(errorData.error)
    } else {
      error('Anında satın alma işlemi başarısız')
    }

    console.error('Anında satın alma hatası:', errorData?.error)

    // Hata durumunda modal'ı kapat
    setTimeout(() => {
      emit('close')
    }, 50)
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop" @click="close">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <div class="modal-header-icon">
            <Icon icon="mdi:lightning-bolt" width="32" height="32" />
          </div>
          <h2 class="modal-title">Sofort Kaufen</h2>
          <button class="modal-close-btn" @click="close" :disabled="isProcessing">
            <Icon icon="mdi:close" width="24" height="24" />
          </button>
        </div>

        <div class="modal-body">
          <div class="lead-info-card">
            <div class="lead-info-header">
              <h3 class="lead-title">{{ lead?.title }}</h3>
              <span class="lead-id">{{ lead?.id }}</span>
            </div>

            <div class="lead-meta">
              <div class="meta-item" v-if="lead?.insuranceType">
                <Icon icon="mdi:shield-check" width="18" height="18" />
                <span>{{ lead.insuranceType }}</span>
              </div>
              <div class="meta-item" v-if="lead?.postalCode">
                <Icon icon="mdi:map-marker" width="18" height="18" />
                <span>{{ lead.postalCode }}</span>
              </div>
            </div>

            <div class="price-display">
              <div class="price-info">
                <span class="price-label">Sofort-Kaufpreis</span>
                <span class="price-amount">{{ formatPrice(purchasePrice, currency) }}</span>
              </div>
              <div class="price-badge">
                <Icon icon="mdi:lightning-bolt" width="20" height="20" />
                <span>Sofort</span>
              </div>
            </div>

            <div class="confirmation-message">
              <Icon icon="mdi:information-outline" width="20" height="20" />
              <p>Möchten Sie diesen Lead wirklich sofort kaufen? Diese Aktion kann nicht rückgängig gemacht werden.</p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="close" :disabled="isProcessing">
            <Icon icon="mdi:close" width="18" height="18" />
            Abbrechen
          </button>
          <button class="btn btn-primary" @click="confirmPurchase" :disabled="isProcessing">
            <Icon v-if="!isProcessing" icon="mdi:lightning-bolt" width="18" height="18" />
            <Icon v-else icon="mdi:loading" width="18" height="18" class="spin" />
            <span v-if="isProcessing">Wird verarbeitet...</span>
            <span v-else>Jetzt kaufen</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-container {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s ease;
  overflow: hidden;
}

@keyframes slideUp {
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
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.modal-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: #fbbf24;
  border-radius: 12px;
  color: #78350f;
}

.modal-title {
  flex: 1;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #78350f;
}

.modal-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.5);
  border: none;
  border-radius: 8px;
  color: #78350f;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.8);
}

.modal-close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-body {
  padding: 24px;
}

.lead-info-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lead-info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.lead-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
}

.lead-id {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}

.lead-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f1f5f9;
  border-radius: 6px;
  color: #475569;
  font-size: 0.875rem;
  font-weight: 500;
}

.price-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  border: 2px solid #fbbf24;
}

.price-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.price-label {
  font-size: 0.875rem;
  color: #92400e;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.price-amount {
  font-size: 2rem;
  font-weight: 800;
  color: #78350f;
  line-height: 1;
}

.price-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #fbbf24;
  border-radius: 8px;
  color: #78350f;
  font-weight: 700;
  font-size: 0.875rem;
}

.confirmation-message {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #eff6ff;
  border-radius: 8px;
  border: 1px solid #bfdbfe;
}

.confirmation-message svg {
  color: #3b82f6;
  flex-shrink: 0;
  margin-top: 2px;
}

.confirmation-message p {
  margin: 0;
  font-size: 0.9375rem;
  color: #1e40af;
  line-height: 1.5;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
  background: #f8fafc;
}

.btn {
  flex: 1;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
}

.btn-primary {
  background: #fbbf24;
  color: #78350f;
}

.btn-primary:hover:not(:disabled) {
  background: #f59e0b;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 480px) {
  .modal-container {
    border-radius: 12px;
  }

  .modal-header {
    padding: 20px;
  }

  .modal-title {
    font-size: 1.25rem;
  }

  .modal-body {
    padding: 20px;
  }

  .lead-title {
    font-size: 1.125rem;
  }

  .price-amount {
    font-size: 1.75rem;
  }

  .modal-footer {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
