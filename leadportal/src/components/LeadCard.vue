<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { formatPrice, getCurrencySymbol } from '@/utils/currency.js'

const props = defineProps({
  lead: {
    type: Object,
    required: true
  },
  settings: {
    type: Object,
    default: () => ({ defaultCurrency: 'EUR', insuranceTypes: [] })
  },
  showQuickBid: {
    type: Boolean,
    default: false
  },
  zipcodeIndex: {
    type: Map,
    default: () => new Map()
  }
})

const emit = defineEmits(['click', 'showDescription', 'instantBuy', 'submitBid', 'shareLead'])

const quickBidAmount = ref('')
const isSubmittingBid = ref(false)

// Zaman hesaplama fonksiyonu
function formatTimeRemaining(endsAt) {
  const now = new Date()
  const endTime = new Date(endsAt)
  const diff = endTime - now

  if (diff <= 0) return 'Süresi doldu'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (days > 0) {
    if (hours > 0) {
      return `${days} gün ${hours} saat`
    } else {
      return `${days} gün`
    }
  } else if (hours > 0) {
    if (minutes > 0) {
      return `${hours} saat ${minutes} dakika`
    } else {
      return `${hours} saat`
    }
  } else if (minutes > 0) {
    return `${minutes}d ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

// Lead tipi için icon getir
function getInsuranceTypeIcon(typeName) {
  if (!typeName) return 'mdi:file'
  const typeObj = props.settings.insuranceTypes.find(t => (typeof t === 'object' ? t.name : t) === typeName)
  const icon = typeof typeObj === 'object' ? typeObj?.icon : null
  if (icon && icon.includes(':')) return icon
  if (icon && !icon.includes(':')) return `mdi:${icon}`
  return 'mdi:file'
}

// Posta kodundan şehir adını getir
function getCityFromPostalCode(postalCode) {
  if (!postalCode) return ''
  const info = props.zipcodeIndex.get(String(postalCode))
  return info?.name || ''
}

function handleClick() {
  if (!props.lead.isExpired) {
    emit('click', props.lead)
  }
}

function handleShowDescription(event) {
  event.stopPropagation()
  emit('showDescription', props.lead, event)
}

function handleInstantBuy(event) {
  event.stopPropagation()
  emit('instantBuy', props.lead, event)
}

function handleShareLead(event) {
  event.stopPropagation()
  emit('shareLead', props.lead, event)
}

function setQuickBidAmount(amount) {
  quickBidAmount.value = amount
}

async function submitQuickBid(event) {
  event.stopPropagation()

  if (!quickBidAmount.value || quickBidAmount.value <= 0) {
    return
  }

  isSubmittingBid.value = true

  try {
    await emit('submitBid', props.lead, Math.round(Number(quickBidAmount.value)))
    quickBidAmount.value = ''
  } finally {
    isSubmittingBid.value = false
  }
}

const minBidAmount = computed(() => {
  return props.lead.bids && props.lead.bids.length
    ? props.lead.bids[0].amount + props.lead.minIncrement
    : props.lead.startPrice + props.lead.minIncrement
})
</script>

<template>
  <div class="auction-card" @click="handleClick" :class="{ 'expired': lead.isExpired }">
    <!-- Card Top Header -->
    <div class="card-top-header">
      <div class="card-top-left">
        <span class="insurance-type-badge" v-if="lead.insuranceType">
          <Icon :icon="getInsuranceTypeIcon(lead.insuranceType)" width="16" height="16" />
          {{ lead.insuranceType }}
        </span>
        <span class="time-badge">
          <Icon icon="mdi:clock-outline" width="16" height="16" />
          {{ formatTimeRemaining(lead.endsAt) }}
        </span>
        <button class="info-btn" @click="handleShowDescription" title="Beschreibung anzeigen">
          <Icon icon="mdi:information-outline" width="16" height="16" />
        </button>
      </div>
      <div class="card-top-right">
        <span class="lead-id">{{ lead.id }}</span>
      </div>
    </div>

    <!-- Location and Quality -->
    <div class="card-meta">
      <div class="location-info">
        <Icon icon="mdi:map-marker" width="16" height="16" />
        <span v-if="lead.postalCode">
          {{ lead.postalCode }}{{ getCityFromPostalCode(lead.postalCode) ? ' ' + getCityFromPostalCode(lead.postalCode) : '' }}
        </span>
        <span v-else>Keine Angabe</span>
      </div>
      <div v-if="lead.isShowcase" class="quality-badge">
        <Icon icon="mdi:star" width="16" height="16" />
        <span>Qualität: Premium</span>
      </div>
    </div>

    <!-- Lead Title -->
    <h3 class="lead-title">{{ lead.title }}</h3>

    <!-- Price and Bidder Info -->
    <div class="price-bidder-section">
      <div class="price-row">
        <div class="price-amount-large">
          <span style="font-weight:bolder" v-if="lead.bids && lead.bids.length">
            {{ formatPrice(lead.bids[0].amount, settings.defaultCurrency) }}
          </span>
          <span v-else>{{ formatPrice(lead.startPrice, settings.defaultCurrency) }}</span>
        </div>
      </div>
      <div class="bidder-info-line">
        <span class="bidder-label">Höchstes Gebot von:</span>
        <span class="bidder-name">
          {{ lead.bids && lead.bids.length ? (lead.bids[0].user?.name ? lead.bids[0].user.name.substring(0, 2) + '************' : '****') : '-' }}
        </span>
        <span class="bids-count-small">
          {{ lead.bids ? lead.bids.length : 0 }} Gebote
        </span>
        <Icon icon="mdi:gavel" width="20" height="20" />
      </div>
    </div>

    <!-- Quick Bid Section -->
    <div v-if="showQuickBid && !lead.isExpired && lead.isActive" class="quick-bid-section" @click.stop>
      <div class="quick-bid-input-group">
        <div class="currency-symbol">{{ getCurrencySymbol(settings.defaultCurrency) }}</div>
        <input
          type="number"
          class="quick-bid-input"
          :placeholder="minBidAmount.toString()"
          v-model="quickBidAmount"
          @click="$event.stopPropagation()"
          :min="minBidAmount"
          step="0.01"
        />
        <button
          class="quick-bid-submit-btn"
          @click="submitQuickBid"
          :disabled="isSubmittingBid"
        >
          <span v-if="isSubmittingBid">...</span>
          <span class="teklif-ver-btn"  v-else>Teklif Ver         <Icon icon="mdi:gavel" width="20" height="20" /></span>
        </button>
      </div>
      <div class="quick-bid-suggestions">
        <button
          class="quick-bid-suggestion"
          @click.stop="setQuickBidAmount(minBidAmount)"
        >
          +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement }}
        </button>
        <button
          class="quick-bid-suggestion"
          @click.stop="setQuickBidAmount((lead.bids && lead.bids.length ? lead.bids[0].amount : lead.startPrice) + lead.minIncrement * 2)"
        >
          +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 2 }}
        </button>
        <button
          class="quick-bid-suggestion"
          @click.stop="setQuickBidAmount((lead.bids && lead.bids.length ? lead.bids[0].amount : lead.startPrice) + lead.minIncrement * 3)"
        >
          +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 3 }}
        </button>
        <button
          class="quick-bid-suggestion"
          @click.stop="setQuickBidAmount((lead.bids && lead.bids.length ? lead.bids[0].amount : lead.startPrice) + lead.minIncrement * 5)"
        >
          +{{ getCurrencySymbol(settings.defaultCurrency) }}{{ lead.minIncrement * 5 }}
        </button>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button
        class="bid-action-btn"
        @click.stop="handleClick"
        :disabled="lead.isExpired"
      >

        Detaylı Görünüm
      </button>
      <button
        v-if="lead.instantBuyPrice && !lead.isExpired && lead.isActive"
        class="instant-buy-action-btn"
        @click="handleInstantBuy"
      >
        <Icon icon="mdi:lightning-bolt" width="20" height="20" />
        Sofort Kaufen
        <span style="font-weight: bolder">{{ formatPrice(lead.instantBuyPrice, settings.defaultCurrency) }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.auction-card {
  background: white;
  border: 2px solid #0f172a;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.teklif-ver-btn{
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
}


.auction-card.expired {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Card Top Header */
.card-top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.card-top-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.insurance-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: #0f172a;
  color: white;
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
}

.time-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  background: #f1f5f9;
  color: #475569;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 500;
}

.info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.info-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.card-top-right {
  margin-left: auto;
}

.lead-id {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0.05em;
}

/* Card Meta */
.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.location-info {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #64748b;
  font-size: 0.8125rem;
  font-weight: 500;
}

.location-info svg {
  color: #64748b;
  width: 14px;
  height: 14px;
}

.quality-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #f59e0b;
  font-size: 0.8125rem;
  font-weight: 600;
}

.quality-badge svg {
  color: #f59e0b;
  width: 14px;
  height: 14px;
}

/* Lead Title */
.lead-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

/* Price and Bidder Section */
.price-bidder-section {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.price-amount-large {
  font-size: 1.5rem;
  font-weight: 700;
  color: #10b981;
  line-height: 1;
}

.bidder-info-line {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 0.6875rem;
  color: #64748b;
}

.bidder-label {
  font-weight: 500;
}

.bidder-name {
  font-weight: 500;
  color: #475569;
}

.bids-count-small {
  font-weight: 600;
  color: #0f172a;
  margin-left: auto;
  font-size: 1.0rem;
}

/* Quick Bid Section */
.quick-bid-section {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.quick-bid-input-group {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.currency-symbol {
  font-weight: 600;
  color: #0f172a;
  font-size: 0.8125rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
}

.quick-bid-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  background: white;
  transition: border-color 0.2s ease;
  color: #0f172a;
}

.quick-bid-input:focus {
  outline: none;
  border-color: #0f172a;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1);
}

.quick-bid-submit-btn {
  flex: 0 0 auto;
  padding: 8px 16px;
  background: #0f172a;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
  white-space: nowrap;
}

.quick-bid-submit-btn:hover:not(:disabled) {
  background: #1e293b;
}

.quick-bid-submit-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.quick-bid-suggestions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 5px;
}

.quick-bid-suggestion {
  padding: 6px 8px;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  min-width: 0;
  text-align: center;
}

.quick-bid-suggestion:hover {
  background: #0f172a;
  color: white;
  border-color: #0f172a;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
}

.bid-action-btn {
  flex: 1;
  padding: 10px 16px;
  background: #0f172a;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.bid-action-btn:hover:not(:disabled) {
  background: #1e293b;
}

.bid-action-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  opacity: 0.6;
}

.instant-buy-action-btn {
  flex: 1;
  padding: 10px 16px;
  background: #fbbf24;
  color: #78350f;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.instant-buy-action-btn:hover {
  background: #f59e0b;
}

@media (max-width: 768px) {
  .card-top-left {
    flex-direction: column;
    align-items: flex-start;
  }

  .quick-bid-suggestions {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .card-top-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-top-right {
    margin-left: 0;
    align-self: flex-end;
  }

  .action-buttons {
    flex-direction: column;
    gap: 6px;
  }

  .quick-bid-input-group {
    flex-wrap: wrap;
  }

  .quick-bid-submit-btn {
    flex: 1 1 100%;
    width: 100%;
  }
}
</style>
