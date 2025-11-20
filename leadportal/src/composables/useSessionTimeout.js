import { onMounted, onUnmounted, ref } from 'vue'
import { useActivityMonitor } from './useActivityMonitor.js'
import axios from '../utils/axios.js'

const CHECK_INTERVAL_MS = 60000 // 1 dakika kontrol aralığı
let sessionTimeoutCheckInterval = null

export function useSessionTimeout() {
  const { getLastActivityFromStorage } = useActivityMonitor()
  const sessionTimeoutMinutes = ref(120) // Default 2 saat
  let settingsFetched = ref(false)

  const fetchSessionTimeoutSettings = async () => {
    try {
      const response = await axios.get('/api/settings')
      if (response.data && response.data.sessionTimeoutMinutes) {
        sessionTimeoutMinutes.value = response.data.sessionTimeoutMinutes
      }
      settingsFetched.value = true
    } catch (error) {
      console.warn('Session timeout settings fetch error:', error)
      // Default değeri kullan, hata olsa da devam et
      settingsFetched.value = true
    }
  }

  const performLogout = () => {
    // Tüm auth verilerini temizle
    localStorage.removeItem('token')
    localStorage.removeItem('userType')
    localStorage.removeItem('userTypeId')
    localStorage.removeItem('role')
    localStorage.removeItem('lastActivity')

    sessionStorage.removeItem('token')
    sessionStorage.removeItem('userType')
    sessionStorage.removeItem('userTypeId')
    sessionStorage.removeItem('role')
    sessionStorage.removeItem('lastActivity')
    sessionStorage.removeItem('logoutReason')

    // Auth change event'i tetikle
    window.dispatchEvent(new CustomEvent('auth-change', { detail: { isLoggedIn: false } }))

    // Login sayfasına yönlendir (logout nedeni URL'de gönder)
    window.location.href = '/login?logout=inactivity'
  }

  const checkSessionTimeout = () => {
    try {
      // Token var mı kontrol et
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) {
        // Token yok, monitorlamayı durdur
        return
      }

      // Son aktivite zamanını al
      const lastActivity = getLastActivityFromStorage()
      if (!lastActivity) {
        // İlk kez kullanıcı, aktivite kaydı yok
        return
      }

      const now = Date.now()
      const inactiveMinutes = (now - lastActivity) / (1000 * 60)

      // Hareketsizlik süresi aştı mı kontrol et
      if (inactiveMinutes > sessionTimeoutMinutes.value) {
        // Timeout aşıldı, logout yap
        performLogout()
      }
    } catch (error) {
      console.warn('Session timeout check error:', error)
    }
  }

  const startSessionTimeoutCheck = async () => {
    // Ayarları al
    await fetchSessionTimeoutSettings()

    // İlk kontrol
    checkSessionTimeout()

    // Periyodik kontrol başlat
    sessionTimeoutCheckInterval = setInterval(() => {
      // Ayarları periyodik olarak güncelle (değişirse diye)
      fetchSessionTimeoutSettings()
      checkSessionTimeout()
    }, CHECK_INTERVAL_MS)
  }

  const stopSessionTimeoutCheck = () => {
    if (sessionTimeoutCheckInterval) {
      clearInterval(sessionTimeoutCheckInterval)
      sessionTimeoutCheckInterval = null
    }
  }

  const resetSessionTimeout = () => {
    // Son aktivite zamanını güncelle
    const storage = localStorage.getItem('token') ? localStorage : sessionStorage
    storage.setItem('lastActivity', Date.now().toString())
  }

  onMounted(() => {
    startSessionTimeoutCheck()
  })

  onUnmounted(() => {
    stopSessionTimeoutCheck()
  })

  return {
    startSessionTimeoutCheck,
    stopSessionTimeoutCheck,
    checkSessionTimeout,
    resetSessionTimeout,
    sessionTimeoutMinutes,
    performLogout
  }
}
