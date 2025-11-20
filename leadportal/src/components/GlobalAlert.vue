<template>
  <div class="global-alerts">
    <transition-group name="alert">
      <div 
        v-for="alert in alerts" 
        :key="alert.id" 
        :class="['alert', `alert-${alert.type}`]"
        @click="removeAlert(alert.id)"
      >
        <div class="alert-icon">
          <Icon v-if="alert.type === 'success'" icon="mdi:check-circle" width="20" height="20" />
          <Icon v-else-if="alert.type === 'error'" icon="mdi:close-circle" width="20" height="20" />
          <Icon v-else-if="alert.type === 'warning'" icon="mdi:alert-circle" width="20" height="20" />
          <Icon v-else icon="mdi:information" width="20" height="20" />
        </div>
        <div class="alert-message" style="white-space: pre-wrap; word-break: break-word;">{{ alert.message }}</div>
        <button class="alert-close" @click.stop="removeAlert(alert.id)">
          <Icon icon="mdi:close" width="16" height="16" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useAlert } from '../composables/useAlert'
import { Icon } from '@iconify/vue'

const { alerts, removeAlert } = useAlert()
</script>

<style scoped>
.global-alerts {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
}

.alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid;
}

.alert:hover {
  transform: translateX(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}

.alert-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-color: #059669;
}

.alert-error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border-color: #dc2626;
}

.alert-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border-color: #d97706;
}

.alert-info {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-color: #2563eb;
}

.alert-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-message {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}

.alert-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  opacity: 0.8;
  transition: all 0.2s ease;
}

.alert-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
}

/* Animations */
.alert-enter-active {
  animation: alertSlideIn 0.3s ease-out;
}

.alert-leave-active {
  animation: alertSlideOut 0.3s ease-in;
}

@keyframes alertSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes alertSlideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .global-alerts {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
  
  .alert {
    padding: 12px;
  }
  
  .alert-message {
    font-size: 13px;
  }
}
</style>

