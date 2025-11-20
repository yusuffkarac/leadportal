import { onMounted, onUnmounted, ref } from 'vue'

const ACTIVITY_DEBOUNCE_MS = 30000 // 30 saniye debounce
let lastActivityTime = ref(null)
let activityMonitorActive = ref(false)

export function useActivityMonitor() {
  let debounceTimer = null

  const updateActivity = () => {
    lastActivityTime.value = Date.now()

    // localStorage'da da kaydet (frontend session timeout için kullanılacak)
    try {
      const storage = localStorage.getItem('token') ? localStorage : sessionStorage
      storage.setItem('lastActivity', Date.now().toString())
    } catch (e) {
      console.warn('Activity storage error:', e)
    }
  }

  const handleUserActivity = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      updateActivity()
    }, ACTIVITY_DEBOUNCE_MS)
  }

  const startMonitoring = () => {
    if (activityMonitorActive.value) {
      return // Zaten çalışıyorsa başlatma
    }

    activityMonitorActive.value = true
    lastActivityTime.value = Date.now()

    // Kullanıcı etkileşim olaylarını dinle
    window.addEventListener('mousemove', handleUserActivity)
    window.addEventListener('keypress', handleUserActivity)
    window.addEventListener('click', handleUserActivity)
    window.addEventListener('scroll', handleUserActivity)
    window.addEventListener('touchstart', handleUserActivity)
  }

  const stopMonitoring = () => {
    activityMonitorActive.value = false

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Event listener'ları kaldır
    window.removeEventListener('mousemove', handleUserActivity)
    window.removeEventListener('keypress', handleUserActivity)
    window.removeEventListener('click', handleUserActivity)
    window.removeEventListener('scroll', handleUserActivity)
    window.removeEventListener('touchstart', handleUserActivity)
  }

  const getLastActivityTime = () => {
    return lastActivityTime.value
  }

  const getLastActivityFromStorage = () => {
    try {
      const storage = localStorage.getItem('token') ? localStorage : sessionStorage
      const stored = storage.getItem('lastActivity')
      return stored ? parseInt(stored) : null
    } catch (e) {
      console.warn('Activity storage read error:', e)
      return null
    }
  }

  onMounted(() => {
    startMonitoring()
  })

  onUnmounted(() => {
    stopMonitoring()
  })

  return {
    startMonitoring,
    stopMonitoring,
    getLastActivityTime,
    getLastActivityFromStorage,
    updateActivity,
    activityMonitorActive
  }
}
