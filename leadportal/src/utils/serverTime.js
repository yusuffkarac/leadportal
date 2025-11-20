/**
 * Client-side Server Time Synchronization Utility
 * Maintains sync with server time to prevent client/server time drift issues
 */

let timeOffset = 0 // Difference between server time and client time in milliseconds
let lastSyncTime = 0
const SYNC_INTERVAL = 5 * 60 * 1000 // Re-sync every 5 minutes

/**
 * Sync with server time
 * Should be called on app initialization and periodically
 */
export async function syncServerTime() {
  try {
    const clientRequestTime = Date.now()

    // Build URL robustly: fallback to relative API if BASE_URL is not defined
    const base = (import.meta.env.VITE_API_BASE_URL || '').trim()
    const apiUrl = base
      ? `${base.replace(/\/$/, '')}/api/server-time`
      : '/api/server-time'
    const response = await fetch(apiUrl)

    if (!response.ok) {
      console.error('Failed to sync server time:', response.statusText)
      return false
    }

    // Ensure JSON response (avoid parsing HTML error when server returns index.html)
    const clientReceiveTime = Date.now()
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await response.text()
      console.error('Failed to parse server time JSON. Response was not JSON.', { apiUrl, contentType, snippet: text?.slice(0, 120) })
      return false
    }
    const data = await response.json()

    // Estimate network latency and calculate offset
    const networkLatency = (clientReceiveTime - clientRequestTime) / 2
    const serverTime = data.timestamp + networkLatency

    timeOffset = serverTime - clientReceiveTime
    lastSyncTime = Date.now()

    console.log(`Server time synced. Offset: ${timeOffset}ms`)
    return true
  } catch (error) {
    console.error('Error syncing server time:', error)
    return false
  }
}

/**
 * Get current server time as Date object
 * Use this instead of `new Date()` throughout the client application
 */
export function now() {
  // If we haven't synced recently, re-sync in background
  if (Date.now() - lastSyncTime > SYNC_INTERVAL) {
    syncServerTime().catch(console.error)
  }

  return new Date(Date.now() + timeOffset)
}

/**
 * Get current server time as Unix timestamp (milliseconds)
 * Use this instead of `Date.now()`
 */
export function timestamp() {
  return Date.now() + timeOffset
}

/**
 * Create a Date object from various inputs
 * @param {string|number|Date} value - Date string, timestamp, or Date object
 * @returns {Date}
 */
export function createDate(value) {
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
