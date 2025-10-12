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

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { userTypeId: true }
    })

    if (!user || (user.userTypeId !== 'ADMIN' && user.userTypeId !== 'SUPERADMIN')) {
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, userTypeId: true }
    })

    if (!user) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı' })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(401).json({ message: 'Geçersiz token' })
  }
}
