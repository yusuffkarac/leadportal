import { Router } from 'express'
import { z } from 'zod'
import { logActivity, ActivityTypes, extractRequestInfo } from '../utils/activityLogger.js'
import { createNotification } from '../services/notificationService.js'

const addBalanceSchema = z.object({
  userId: z.string().min(1, 'Benutzer-ID ist erforderlich'),
  amount: z.number().positive('Betrag muss positiv sein'),
  description: z.string().optional()
})

const deductBalanceSchema = z.object({
  userId: z.string().min(1, 'Benutzer-ID ist erforderlich'),
  amount: z.number().positive('Betrag muss positiv sein'),
  description: z.string().min(1, 'Beschreibung ist erforderlich')
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
      return res.status(403).json({ error: 'Sie haben keine Berechtigung für diese Aktion' })
    }

    const parsed = addBalanceSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = parsed.error?.errors?.map(e => e.message).join(', ') || 'Ungültige Daten'
      return res.status(400).json({ error: errors })
    }

    const { userId, amount, description } = parsed.data

    try {
      // Kullanıcının mevcut durumunu kontrol et
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden' })
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
            description: description || `Guthaben von ${amount}€ wurde vom Admin hinzugefügt`,
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
          'Guthaben hinzugefügt',
          `Ihrem Konto wurde ${amount}€ Guthaben hinzugefügt. Ihr neues Guthaben: ${updatedUser.balance}€`,
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
      res.status(500).json({ error: 'Fehler beim Hinzufügen des Guthabens' })
    }
  })

  // Admin: Kullanıcıdan bakiye sil
  router.post('/admin/deduct', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Sie haben keine Berechtigung für diese Aktion' })
    }

    const parsed = deductBalanceSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = parsed.error?.errors?.map(e => e.message).join(', ') || 'Ungültige Daten'
      return res.status(400).json({ error: errors })
    }

    const { userId, amount, description } = parsed.data

    try {
      // Kullanıcının mevcut durumunu kontrol et
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden' })
      }

      // Kullanıcının bakiyesinin yeterli olup olmadığını kontrol et
      if (user.balance < amount) {
        return res.status(400).json({
          error: 'Unzureichendes Guthaben des Benutzers',
          currentBalance: user.balance,
          requestedAmount: amount
        })
      }

      // Bakiye düş ve transaction kaydı oluştur
      const [updatedUser, transaction] = await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            balance: {
              decrement: amount
            }
          }
        }),
        prisma.balanceTransaction.create({
          data: {
            userId,
            amount: -amount,
            type: 'ADMIN_DEDUCT',
            description,
            adminId: req.user.id
          }
        })
      ])

      // Activity log
      try {
        const { ipAddress, userAgent } = extractRequestInfo(req)
        await logActivity({
          userId: req.user.id,
          action: ActivityTypes.DEDUCT_BALANCE,
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

      // Bildirim: Kullanıcıya bakiye silindi bildirimi
      try {
        await createNotification(
          userId,
          'BALANCE_DEDUCTED',
          'Guthaben abgezogen',
          `Von Ihrem Konto wurde ${amount}€ Guthaben abgezogen. Ihr neues Guthaben: ${updatedUser.balance}€`,
          {
            amount,
            newBalance: updatedUser.balance,
            transactionId: transaction.id,
            description
          }
        )
      } catch (e) {
        console.error('Notification error (BALANCE_DEDUCTED):', e.message)
      }

      res.json({
        ok: true,
        newBalance: updatedUser.balance,
        transaction
      })
    } catch (error) {
      console.error('Deduct balance error:', error)
      res.status(500).json({ error: 'Fehler beim Abziehen des Guthabens' })
    }
  })

  // Admin: Kullanıcının bakiye özelliğini aç/kapat
  router.put('/admin/toggle-enabled', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Sie haben keine Berechtigung für diese Aktion' })
    }

    const parsed = updateBalanceEnabledSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = parsed.error?.errors?.map(e => e.message).join(', ') || 'Ungültige Daten'
      return res.status(400).json({ error: errors })
    }

    const { userId, enabled } = parsed.data

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden' })
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
      res.status(500).json({ error: 'Fehler beim Aktualisieren des Guthabenstatus' })
    }
  })

  // Admin: Tüm kullanıcıların bakiye bilgilerini getir
  router.get('/admin/all', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Sie haben keine Berechtigung für diese Aktion' })
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
      res.status(500).json({ error: 'Fehler beim Abrufen der Guthabeninformationen' })
    }
  })

  // Admin: Kullanıcının bakiye geçmişini getir
  router.get('/admin/history/:userId', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Sie haben keine Berechtigung für diese Aktion' })
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
      res.status(500).json({ error: 'Fehler beim Abrufen des Guthabenverlaufs' })
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
        return res.status(404).json({ error: 'Benutzer nicht gefunden' })
      }

      res.json(user)
    } catch (error) {
      console.error('Get my balance error:', error)
      res.status(500).json({ error: 'Fehler beim Abrufen der Guthabeninformation' })
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
      res.status(500).json({ error: 'Fehler beim Abrufen des Guthabenverlaufs' })
    }
  })

  return router
}
