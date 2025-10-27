import { Router } from 'express'
import { getServerTime, getServerTimestamp, formatServerTime } from '../utils/serverTime.js'

const router = Router()

/**
 * GET /api/server-time
 * Server saatini döndürür
 */
router.get('/', (req, res) => {
  try {
    const serverTime = getServerTime()
    const timestamp = getServerTimestamp()
    
    res.json({
      success: true,
      serverTime: serverTime.toISOString(),
      timestamp: timestamp,
      formatted: {
        iso: formatServerTime('ISO'),
        locale: formatServerTime('locale'),
        date: formatServerTime('date'),
        time: formatServerTime('time')
      }
    })
  } catch (error) {
    console.error('Server time error:', error)
    res.status(500).json({
      success: false,
      error: 'Server saati alınamadı'
    })
  }
})

export default router
