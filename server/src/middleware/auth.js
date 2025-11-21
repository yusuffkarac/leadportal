import jwt from 'jsonwebtoken'
import { PrismaClient } from '../../generated/prisma/index.js'

const prisma = new PrismaClient()

// Admin kontrolü middleware
export const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ message: 'Token gerekli' })
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (jwtError) {
      return res.status(401).json({ message: 'Geçersiz token' })
    }
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: 'Geçersiz token formatı' })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { userTypeId: true, isActive: true, lastActivity: true }
    })

    if (!user) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı' })
    }

    if (user.isActive === false) {
      return res.status(401).json({ message: 'Hesabınız deaktif edilmiştir' })
    }

    // Hareketsizlik kontrolü
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
      select: { sessionTimeoutMinutes: true }
    })

    if (user.lastActivity && settings) {
      const now = new Date()
      const lastActivityTime = new Date(user.lastActivity)
      const diffMinutes = (now - lastActivityTime) / (1000 * 60)

      if (diffMinutes > settings.sessionTimeoutMinutes) {
        res.setHeader('X-Session-Timeout', 'true')
        return res.status(401).json({ message: 'Oturumunuz sona ermiştir' })
      }
    }

    if (user.userTypeId !== 'ADMIN' && user.userTypeId !== 'SUPERADMIN') {
      return res.status(403).json({ message: 'Admin yetkisi gerekli' })
    }

    req.user = { id: decoded.id }
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(401).json({ message: 'Geçersiz token' })
  }
}

// Kullanıcı kontrolü middleware
export const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ message: 'Token gerekli' })
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (jwtError) {
      return res.status(401).json({ message: 'Geçersiz token' })
    }
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: 'Geçersiz token formatı' })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, userTypeId: true, isActive: true, lastActivity: true }
    })

    if (!user) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı' })
    }

    if (user.isActive === false) {
      return res.status(401).json({ message: 'Hesabınız deaktif edilmiştir' })
    }

    // Hareketsizlik kontrolü
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
      select: { sessionTimeoutMinutes: true }
    })

    if (user.lastActivity && settings) {
      const now = new Date()
      const lastActivityTime = new Date(user.lastActivity)
      const diffMinutes = (now - lastActivityTime) / (1000 * 60)

      if (diffMinutes > settings.sessionTimeoutMinutes) {
        res.setHeader('X-Session-Timeout', 'true')
        return res.status(401).json({ message: 'Oturumunuz sona ermiştir' })
      }
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(401).json({ message: 'Geçersiz token' })
  }
}
