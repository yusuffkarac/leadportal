import { Router } from 'express'
import speakeasy from 'speakeasy'
import qrcode from 'qrcode'
import { logActivity, ActivityTypes, extractRequestInfo } from '../utils/activityLogger.js'

export default function twoFactorRouter(prisma) {
  const router = Router()

  // Generate 2FA secret and QR code
  router.post('/enable', async (req, res) => {
    try {
      const userId = req.user.id
      const user = await prisma.user.findUnique({ where: { id: userId } })

      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' })
      }

      if (user.twoFactorEnabled) {
        return res.status(400).json({ error: '2FA zaten aktif' })
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `LeadPortal (${user.email})`,
        length: 32
      })

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url)

      // Store secret temporarily (will be confirmed in verify step)
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorSecret: secret.base32 }
      })

      // Activity log
      try {
        const { ipAddress, userAgent } = extractRequestInfo(req)
        await logActivity({
          userId,
          action: 'INITIATE_2FA',
          details: { email: user.email },
          entityType: 'user',
          entityId: userId,
          ipAddress,
          userAgent
        })
      } catch (e) {
        console.error('Activity log error:', e.message)
      }

      res.json({
        secret: secret.base32,
        qrCode: qrCodeUrl
      })
    } catch (error) {
      console.error('2FA enable error:', error)
      res.status(500).json({ error: '2FA aktifleştirme hatası' })
    }
  })

  // Verify 2FA code and enable
  router.post('/verify', async (req, res) => {
    try {
      const userId = req.user.id
      const { token } = req.body

      if (!token) {
        return res.status(400).json({ error: 'Token gerekli' })
      }

      const user = await prisma.user.findUnique({ where: { id: userId } })

      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ error: 'Geçersiz 2FA ayarı' })
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2
      })

      if (!verified) {
        return res.status(400).json({ error: 'Geçersiz kod' })
      }

      // Enable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true }
      })

      // Activity log
      try {
        const { ipAddress, userAgent } = extractRequestInfo(req)
        await logActivity({
          userId,
          action: 'ENABLE_2FA',
          details: { email: user.email },
          entityType: 'user',
          entityId: userId,
          ipAddress,
          userAgent
        })
      } catch (e) {
        console.error('Activity log error:', e.message)
      }

      res.json({ success: true, message: '2FA başarıyla aktifleştirildi' })
    } catch (error) {
      console.error('2FA verify error:', error)
      res.status(500).json({ error: '2FA doğrulama hatası' })
    }
  })

  // Disable 2FA for current user
  router.post('/disable', async (req, res) => {
    try {
      const userId = req.user.id
      const { token, password } = req.body

      if (!token && !password) {
        return res.status(400).json({ error: 'Token veya şifre gerekli' })
      }

      const user = await prisma.user.findUnique({ where: { id: userId } })

      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({ error: '2FA aktif değil' })
      }

      // Verify token or password
      let verified = false

      if (token && user.twoFactorSecret) {
        verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token,
          window: 2
        })
      }

      if (!verified && password) {
        const bcrypt = (await import('bcrypt')).default
        verified = await bcrypt.compare(password, user.passwordHash)
      }

      if (!verified) {
        return res.status(400).json({ error: 'Geçersiz doğrulama' })
      }

      // Disable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null
        }
      })

      // Activity log
      try {
        const { ipAddress, userAgent } = extractRequestInfo(req)
        await logActivity({
          userId,
          action: 'DISABLE_2FA',
          details: { email: user.email },
          entityType: 'user',
          entityId: userId,
          ipAddress,
          userAgent
        })
      } catch (e) {
        console.error('Activity log error:', e.message)
      }

      res.json({ success: true, message: '2FA başarıyla devre dışı bırakıldı' })
    } catch (error) {
      console.error('2FA disable error:', error)
      res.status(500).json({ error: '2FA devre dışı bırakma hatası' })
    }
  })

  // Admin: Disable user's 2FA
  router.delete('/admin/:userId', async (req, res) => {
    try {
      if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') {
        return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' })
      }

      const { userId } = req.params
      const user = await prisma.user.findUnique({ where: { id: userId } })

      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' })
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({ error: 'Kullanıcının 2FA\'sı zaten kapalı' })
      }

      // Disable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null
        }
      })

      // Activity log
      try {
        const { ipAddress, userAgent } = extractRequestInfo(req)
        await logActivity({
          userId: req.user.id,
          action: 'ADMIN_DISABLE_2FA',
          details: {
            targetUserEmail: user.email,
            targetUserName: user.username || user.firstName || user.email
          },
          entityType: 'user',
          entityId: userId,
          ipAddress,
          userAgent
        })
      } catch (e) {
        console.error('Activity log error:', e.message)
      }

      res.json({ success: true, message: 'Kullanıcının 2FA\'sı başarıyla devre dışı bırakıldı' })
    } catch (error) {
      console.error('Admin 2FA disable error:', error)
      res.status(500).json({ error: '2FA devre dışı bırakma hatası' })
    }
  })

  // Get current user's 2FA status
  router.get('/status', async (req, res) => {
    try {
      const userId = req.user.id
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          twoFactorEnabled: true
        }
      })

      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' })
      }

      res.json({ enabled: user.twoFactorEnabled })
    } catch (error) {
      console.error('2FA status error:', error)
      res.status(500).json({ error: 'Durum kontrolü hatası' })
    }
  })

  return router
}
