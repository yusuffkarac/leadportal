/**
 * Centralized Date/Time Utility
 * All date/time operations should use this utility to ensure consistency
 * and prevent client/server time drift issues
 */

/**
 * Get current server time as Date object
 * Use this instead of `new Date()` throughout the application
 */
export function now() {
  return new Date()
}

/**
 * Get current server time as Unix timestamp (milliseconds)
 * Use this instead of `Date.now()`
 */
export function timestamp() {
  return Date.now()
}

/**
 * Create a Date object from various inputs
 * Handles datetime-local format (YYYY-MM-DDTHH:mm) correctly by treating it as local time
 * @param {string|number|Date} value - Date string, timestamp, or Date object
 * @returns {Date}
 */
export function createDate(value) {
  if (typeof value === 'string') {
    // datetime-local format'ı tespit et: YYYY-MM-DDTHH:mm veya YYYY-MM-DDTHH:mm:ss
    // Z veya timezone offset'i yoksa lokal saat olarak kabul et
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
      // Lokal saat olarak parse et, sonra UTC'ye çevir
      // Örnek: "2025-01-15T14:00" -> local time 14:00 -> UTC time
      const date = new Date(value)
      // Eğer bu bir lokal saat ise, timezone offset'ini çıkararak UTC'ye çevirelim
      // Ancak burada problem var: new Date("2025-01-15T14:00") zaten lokal saat olarak parse ediyor
      // ve biz bunu UTC olarak saklamak istiyoruz
      // Çözüm: Tarihi parçalayıp UTC olarak oluşturalım
      const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)
      if (parts) {
        const [, year, month, day, hour, minute, second = '0'] = parts
        // UTC olarak oluştur
        return new Date(Date.UTC(
          parseInt(year),
          parseInt(month) - 1, // Month is 0-indexed
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        ))
      }
    }
  }
  return new Date(value)
}

/**
 * Add milliseconds to current time
 * @param {number} ms - Milliseconds to add
 * @returns {Date}
 */
export function addMilliseconds(ms) {
  return new Date(timestamp() + ms)
}

/**
 * Add minutes to current time
 * @param {number} minutes - Minutes to add
 * @returns {Date}
 */
export function addMinutes(minutes) {
  return addMilliseconds(minutes * 60 * 1000)
}

/**
 * Add hours to current time
 * @param {number} hours - Hours to add
 * @returns {Date}
 */
export function addHours(hours) {
  return addMilliseconds(hours * 60 * 60 * 1000)
}

/**
 * Add days to current time
 * @param {number} days - Days to add
 * @returns {Date}
 */
export function addDays(days) {
  return addMilliseconds(days * 24 * 60 * 60 * 1000)
}

/**
 * Subtract milliseconds from current time
 * @param {number} ms - Milliseconds to subtract
 * @returns {Date}
 */
export function subtractMilliseconds(ms) {
  return new Date(timestamp() - ms)
}

/**
 * Subtract minutes from current time
 * @param {number} minutes - Minutes to subtract
 * @returns {Date}
 */
export function subtractMinutes(minutes) {
  return subtractMilliseconds(minutes * 60 * 1000)
}

/**
 * Subtract hours from current time
 * @param {number} hours - Hours to subtract
 * @returns {Date}
 */
export function subtractHours(hours) {
  return subtractMilliseconds(hours * 60 * 60 * 1000)
}

/**
 * Subtract days from current time
 * @param {number} days - Days to subtract
 * @returns {Date}
 */
export function subtractDays(days) {
  return subtractMilliseconds(days * 24 * 60 * 60 * 1000)
}

/**
 * Check if a date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean}
 */
export function isPast(date) {
  return createDate(date) < now()
}

/**
 * Check if a date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean}
 */
export function isFuture(date) {
  return createDate(date) > now()
}

/**
 * Get start of today (00:00:00)
 * @returns {Date}
 */
export function startOfToday() {
  const today = now()
  today.setHours(0, 0, 0, 0)
  return today
}

/**
 * Get end of today (23:59:59.999)
 * @returns {Date}
 */
export function endOfToday() {
  const today = now()
  today.setHours(23, 59, 59, 999)
  return today
}

/**
 * Get start of current month
 * @returns {Date}
 */
export function startOfMonth() {
  const date = now()
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

/**
 * Get start of current week (Monday)
 * @returns {Date}
 */
export function startOfWeek() {
  const date = now()
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust if Sunday
  return new Date(date.setDate(diff))
}

/**
 * Format time ago (e.g., "2 minutes ago", "3 hours ago")
 * @param {Date|string} date - Date to format
 * @returns {string}
 */
export function formatTimeAgo(date) {
  const targetDate = createDate(date)
  const current = now()
  const diffMs = current - targetDate
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'gerade eben'
  if (diffMins < 60) return `vor ${diffMins} Minute${diffMins !== 1 ? 'n' : ''}`
  if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours !== 1 ? 'n' : ''}`
  if (diffDays < 30) return `vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `vor ${diffMonths} Monat${diffMonths !== 1 ? 'en' : ''}`

  const diffYears = Math.floor(diffMonths / 12)
  return `vor ${diffYears} Jahr${diffYears !== 1 ? 'en' : ''}`
}

/**
 * Get current year (useful for copyright notices, etc.)
 * @returns {number}
 */
export function currentYear() {
  return now().getFullYear()
}
