import { PrismaClient } from '../../generated/prisma/index.js'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

// Aktivite takibi için debounce cache
const activityCache = new Map()
const DEBOUNCE_TIME = 60000 // 1 dakika - aynı kullanıcı için 1 dakika içinde tekrar güncelleme yapma

/**
 * Kullanıcı aktivitelerini izleyen middleware
 * Her API isteğinde kullanıcının son aktivite zamanı, IP adresi ve user agent bilgisini günceller
 */
export const trackUserActivity = async (req, res, next) => {
  try {
    // Token varsa kullanıcıyı belirle
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const userId = decoded.id

        // Debounce kontrolü - aynı kullanıcı için sık güncelleme yapma
        const lastUpdate = activityCache.get(userId)
        const now = Date.now()

        if (!lastUpdate || (now - lastUpdate) > DEBOUNCE_TIME) {
          // IP adresini al (proxy arkasındaysa gerçek IP'yi al)
          const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     req.headers['x-real-ip'] ||
                     req.socket.remoteAddress ||
                     req.connection.remoteAddress

          // User agent bilgisini al
          const userAgent = req.headers['user-agent'] || 'Unknown'

          // Kullanıcı aktivitesini güncelle (async olarak, response'u bloklamadan)
          prisma.user.update({
            where: { id: userId },
            data: {
              lastActivity: new Date(),
              lastIP: ip,
              lastUserAgent: userAgent
            }
          }).catch(error => {
            // Hata durumunda sadece log at, işlemi kesme
            console.error('Activity tracking error:', error)
          })

          // Cache'i güncelle
          activityCache.set(userId, now)
        }
      } catch (error) {
        // Token decode hatası - önemseme, sadece aktivite takibi yapamayız
        // İstek normal şekilde devam etsin
      }
    }

    next()
  } catch (error) {
    // Aktivite takibi hatası istek akışını kesmesin
    console.error('Activity tracker middleware error:', error)
    next()
  }
}

// Cache'i periyodik olarak temizle (memory leak önlemi)
setInterval(() => {
  const now = Date.now()
  for (const [userId, lastUpdate] of activityCache.entries()) {
    if (now - lastUpdate > DEBOUNCE_TIME * 10) { // 10 dakika
      activityCache.delete(userId)
    }
  }
}, DEBOUNCE_TIME * 5) // 5 dakikada bir temizle
