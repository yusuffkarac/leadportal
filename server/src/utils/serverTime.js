/**
 * Server Time Utility
 * Bu dosya server saatini kullanmak için utility fonksiyonları içerir
 */

/**
 * Server saatini döndürür
 * @returns {Date} Server saati
 */
export function getServerTime() {
  return new Date()
}

/**
 * Server saatini timestamp olarak döndürür
 * @returns {number} Server saati timestamp
 */
export function getServerTimestamp() {
  return Date.now()
}

/**
 * Server saatine göre belirli bir süre sonrasını hesaplar
 * @param {number} milliseconds - Eklenecek milisaniye
 * @returns {Date} Hesaplanan tarih
 */
export function addToServerTime(milliseconds) {
  return new Date(Date.now() + milliseconds)
}

/**
 * Server saatine göre belirli bir süre öncesini hesaplar
 * @param {number} milliseconds - Çıkarılacak milisaniye
 * @returns {Date} Hesaplanan tarih
 */
export function subtractFromServerTime(milliseconds) {
  return new Date(Date.now() - milliseconds)
}

/**
 * Server saatine göre gün başını hesaplar
 * @returns {Date} Bugünün başlangıcı (00:00:00)
 */
export function getServerDayStart() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * Server saatine göre ay başını hesaplar
 * @returns {Date} Bu ayın başlangıcı (1. gün 00:00:00)
 */
export function getServerMonthStart() {
  const now = new Date()
  now.setDate(1)
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * Server saatine göre hafta başını hesaplar
 * @returns {Date} Bu haftanın başlangıcı (Pazartesi 00:00:00)
 */
export function getServerWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Pazartesi'ye ayarla
  now.setDate(diff)
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * Server saatine göre yıl bilgisini döndürür
 * @returns {number} Mevcut yıl
 */
export function getServerYear() {
  return new Date().getFullYear()
}

/**
 * Server saatine göre tarih formatını döndürür
 * @param {string} format - Tarih formatı (ISO, locale vb.)
 * @returns {string} Formatlanmış tarih
 */
export function formatServerTime(format = 'ISO') {
  const now = new Date()
  
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
