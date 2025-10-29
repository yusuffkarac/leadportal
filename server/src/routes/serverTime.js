import express from 'express'

const router = express.Router()

/**
 * Server Time API
 * Provides server's current time to clients for synchronization
 */

// GET /api/server-time
router.get('/', (req, res) => {
  try {
    const serverTime = new Date()
    
    res.json({
      timestamp: serverTime.getTime(), // Unix timestamp in milliseconds
      iso: serverTime.toISOString(),   // ISO 8601 format
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })
  } catch (error) {
    console.error('Error getting server time:', error)
    res.status(500).json({ error: 'Failed to get server time' })
  }
})

export default router
