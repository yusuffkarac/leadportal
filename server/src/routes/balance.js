import { Router } from 'express'
import { z } from 'zod'
import { logActivity, ActivityTypes, extractRequestInfo } from '../utils/activityLogger.js'
import { createNotification } from '../services/notificationService.js'

const addBalanceSchema = z.object({
  userId: z.string().min(1, 'Kullanıcı ID gereklidir'),
  amount: z.number().positive('Miktar pozitif olmalıdır'),
  description: z.string().optional()
})

const updateBalanceEnabledSchema = z.object({
  userId: z.string().min(1, 'Kullanıcı ID gereklidir'),
  enabled: z.boolean()
})

export default function balanceRouter(prisma) {
  const router = Router()

  // Admin: Kullanıcılara bakiye ekle
  router.post('/admin/add', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' })
    }

    const parsed = addBalanceSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = parsed.error?.errors?.map(e => e.message).join(', ') || 'Geçersiz veri'
      return res.status(400).json({ error: errors })
    }

    const { userId, amount, description } = parsed.data

    try {
      // Kullanıcının mevcut durumunu kontrol et
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' })
      }

      // Bakiye ekle ve transaction kaydı oluştur
      const [updatedUser, transaction] = await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            balance: {
              increment: amount
            }
          }
        }),
        prisma.balanceTransaction.create({
          data: {
            userId,
            amount,
            type: 'ADMIN_ADD',
            description: description || `Admin tarafından ${amount}€ bakiye eklendi`,
            adminId: req.user.id
          }
        })
      ])

      // Activity log
      try {
        const { ipAddress, userAgent } = extractRequestInfo(req)
        await logActivity({
          userId: req.user.id,
          action: ActivityTypes.ADD_BALANCE,
          details: {
            targetUserId: userId,
            targetUserEmail: user.email,
            amount,
            newBalance: updatedUser.balance,
            description
          },
          entityType: 'balance',
          entityId: transaction.id,
          ipAddress,
          userAgent
        })
      } catch (e) {
        console.error('Activity log error:', e.message)
      }

      // Bildirim: Kullanıcıya bakiye eklendi bildirimi
      try {
        await createNotification(
          userId,
          'BALANCE_ADDED',
          'Bakiye Eklendi',
          `Hesabınıza ${amount}€ bakiye eklendi. Yeni bakiyeniz: ${updatedUser.balance}€`,
          {
            amount,
            newBalance: updatedUser.balance,
            transactionId: transaction.id,
            description
          }
        )
      } catch (e) {
        console.error('Notification error (BALANCE_ADDED):', e.message)
      }

      res.json({
        ok: true,
        newBalance: updatedUser.balance,
        transaction
      })
    } catch (error) {
      console.error('Add balance error:', error)
      res.status(500).json({ error: 'Bakiye eklenirken bir hata oluştu' })
    }
  })

  // Admin: Kullanıcının bakiye özelliğini aç/kapat
  router.put('/admin/toggle-enabled', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' })
    }

    const parsed = updateBalanceEnabledSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = parsed.error?.errors?.map(e => e.message).join(', ') || 'Geçersiz veri'
      return res.status(400).json({ error: errors })
    }

    const { userId, enabled } = parsed.data

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' })
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          balanceEnabled: enabled
        }
      })

      // Activity log
      try {
        const { ipAddress, userAgent } = extractRequestInfo(req)
        await logActivity({
          userId: req.user.id,
          action: ActivityTypes.TOGGLE_BALANCE,
          details: {
            targetUserId: userId,
            targetUserEmail: user.email,
            enabled
          },
          entityType: 'user',
          entityId: userId,
          ipAddress,
          userAgent
        })
      } catch (e) {
        console.error('Activity log error:', e.message)
      }

      res.json({
        ok: true,
        balanceEnabled: updatedUser.balanceEnabled
      })
    } catch (error) {
      console.error('Toggle balance enabled error:', error)
      res.status(500).json({ error: 'Bakiye durumu güncellenirken bir hata oluştu' })
    }
  })

  // Admin: Tüm kullanıcıların bakiye bilgilerini getir
  router.get('/admin/all', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' })
    }

    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          balance: true,
          balanceEnabled: true,
          paymentMethod: true,
          userType: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      res.json(users)
    } catch (error) {
      console.error('Get all balances error:', error)
      res.status(500).json({ error: 'Bakiye bilgileri alınırken bir hata oluştu' })
    }
  })

  // Admin: Kullanıcının bakiye geçmişini getir
  router.get('/admin/history/:userId', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' })
    }

    const { userId } = req.params

    try {
      const transactions = await prisma.balanceTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100
      })

      res.json(transactions)
    } catch (error) {
      console.error('Get balance history error:', error)
      res.status(500).json({ error: 'Bakiye geçmişi alınırken bir hata oluştu' })
    }
  })

  // Kullanıcı: Kendi bakiyesini görüntüle
  router.get('/my-balance', async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          balance: true,
          balanceEnabled: true,
          paymentMethod: true
        }
      })

      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' })
      }

      res.json(user)
    } catch (error) {
      console.error('Get my balance error:', error)
      res.status(500).json({ error: 'Bakiye bilgisi alınırken bir hata oluştu' })
    }
  })

  // Kullanıcı: Kendi bakiye geçmişini görüntüle
  router.get('/my-history', async (req, res) => {
    try {
      const transactions = await prisma.balanceTransaction.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      res.json(transactions)
    } catch (error) {
      console.error('Get my balance history error:', error)
      res.status(500).json({ error: 'Bakiye geçmişi alınırken bir hata oluştu' })
    }
  })

  return router
}
