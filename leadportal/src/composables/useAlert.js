import { ref } from 'vue'

const alerts = ref([])
let alertIdCounter = 0

export function useAlert() {
  const showAlert = (message, type = 'info', duration = 3000) => {
    const id = alertIdCounter++
    const alert = {
      id,
      message,
      type, // 'success', 'error', 'warning', 'info'
      show: true
    }
    
    alerts.value.push(alert)
    
    if (duration > 0) {
      setTimeout(() => {
        removeAlert(id)
      }, duration)
    }
    
    return id
  }
  
  const removeAlert = (id) => {
    const index = alerts.value.findIndex(a => a.id === id)
    if (index > -1) {
      alerts.value.splice(index, 1)
    }
  }
  
  const success = (message, duration = 3000) => {
    return showAlert(message, 'success', duration)
  }
  
  const error = (message, duration = 5000) => {
    return showAlert(message, 'error', duration)
  }
  
  const warning = (message, duration = 4000) => {
    return showAlert(message, 'warning', duration)
  }
  
  const info = (message, duration = 3000) => {
    return showAlert(message, 'info', duration)
  }
  
  return {
    alerts,
    showAlert,
    removeAlert,
    success,
    error,
    warning,
    info
  }
}

