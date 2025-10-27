import { ref, onMounted, onUnmounted } from 'vue'
import axios from '../utils/axios.js'

/**
 * Server Time Composable
 * Bu composable server saatini kullanmak için gerekli fonksiyonları sağlar
 */
export function useServerTime() {
  const serverTime = ref(null)
  const serverTimestamp = ref(null)
  const timeOffset = ref(0) // Client ile server arasındaki zaman farkı
  const isConnected = ref(false)
  
  let syncInterval = null
  let updateInterval = null

  /**
   * Server saatini senkronize et
   */
  const syncServerTime = async () => {
    try {
      const startTime = Date.now()
      const response = await axios.get('/api/server-time')
      
      if (response.data.success) {
        const endTime = Date.now()
        const networkDelay = (endTime - startTime) / 2 // Yaklaşık network gecikmesi
        
        serverTime.value = new Date(response.data.serverTime)
        serverTimestamp.value = response.data.timestamp
        
        // Client ile server arasındaki zaman farkını hesapla
        timeOffset.value = response.data.timestamp - (endTime - networkDelay)
        isConnected.value = true
        
        console.log('Server time synced:', {
          serverTime: serverTime.value.toISOString(),
          clientTime: new Date().toISOString(),
          offset: timeOffset.value
        })
      }
    } catch (error) {
      console.error('Server time sync failed:', error)
      isConnected.value = false
    }
  }

  /**
   * Server saatine göre şu anki zamanı döndür
   */
  const getServerTime = () => {
    if (!serverTimestamp.value || !timeOffset.value) {
      return new Date()
    }
    return new Date(Date.now() + timeOffset.value)
  }

  /**
   * Server saatine göre timestamp döndür
   */
  const getServerTimestamp = () => {
    if (!timeOffset.value) {
      return Date.now()
    }
    return Date.now() + timeOffset.value
  }

  /**
   * Server saatine göre belirli bir süre sonrasını hesapla
   */
  const addToServerTime = (milliseconds) => {
    return new Date(getServerTimestamp() + milliseconds)
  }

  /**
   * Server saatine göre belirli bir süre öncesini hesapla
   */
  const subtractFromServerTime = (milliseconds) => {
    return new Date(getServerTimestamp() - milliseconds)
  }

  /**
   * Server saatine göre gün başını hesapla
   */
  const getServerDayStart = () => {
    const now = getServerTime()
    now.setHours(0, 0, 0, 0)
    return now
  }

  /**
   * Server saatine göre ay başını hesapla
   */
  const getServerMonthStart = () => {
    const now = getServerTime()
    now.setDate(1)
    now.setHours(0, 0, 0, 0)
    return now
  }

  /**
   * Server saatine göre hafta başını hesapla
   */
  const getServerWeekStart = () => {
    const now = getServerTime()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Pazartesi'ye ayarla
    now.setDate(diff)
    now.setHours(0, 0, 0, 0)
    return now
  }

  /**
   * Server saatine göre yıl bilgisini döndür
   */
  const getServerYear = () => {
    return getServerTime().getFullYear()
  }

  /**
   * Server saatine göre tarih formatını döndür
   */
  const formatServerTime = (format = 'ISO') => {
    const now = getServerTime()
    
    switch (format) {
      case 'ISO':
        return now.toISOString()
      case 'locale':
        return now.toLocaleString('tr-TR')
      case 'date':
        return now.toLocaleDateString('tr-TR')
      case 'time':
        return now.toLocaleTimeString('tr-TR')
      default:
        return now.toISOString()
    }
  }

  /**
   * İki tarih arasındaki farkı hesapla (server saatine göre)
   */
  const getTimeDifference = (date1, date2 = null) => {
    const targetDate = date2 ? new Date(date2) : getServerTime()
    const diff = new Date(date1) - targetDate
    return diff
  }

  /**
   * Zaman farkını formatla
   */
  const formatTimeAgo = (date) => {
    if (!date) return 'Hiç'
    
    const diff = getTimeDifference(date)
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Şimdi'
    if (minutes < 60) return `${minutes} dakika önce`
    if (hours < 24) return `${hours} saat önce`
    return `${days} gün önce`
  }

  /**
   * Composable'ı başlat
   */
  const start = () => {
    // İlk senkronizasyon
    syncServerTime()
    
    // Her 5 dakikada bir senkronizasyon
    syncInterval = setInterval(syncServerTime, 5 * 60 * 1000)
    
    // Her saniye güncelleme (UI için)
    updateInterval = setInterval(() => {
      if (timeOffset.value !== null) {
        serverTime.value = getServerTime()
        serverTimestamp.value = getServerTimestamp()
      }
    }, 1000)
  }

  /**
   * Composable'ı durdur
   */
  const stop = () => {
    if (syncInterval) {
      clearInterval(syncInterval)
      syncInterval = null
    }
    if (updateInterval) {
      clearInterval(updateInterval)
      updateInterval = null
    }
  }

  // Component mount/unmount
  onMounted(() => {
    start()
  })

  onUnmounted(() => {
    stop()
  })

  return {
    // Reactive değerler
    serverTime,
    serverTimestamp,
    timeOffset,
    isConnected,
    
    // Fonksiyonlar
    syncServerTime,
    getServerTime,
    getServerTimestamp,
    addToServerTime,
    subtractFromServerTime,
    getServerDayStart,
    getServerMonthStart,
    getServerWeekStart,
    getServerYear,
    formatServerTime,
    getTimeDifference,
    formatTimeAgo,
    start,
    stop
  }
}
