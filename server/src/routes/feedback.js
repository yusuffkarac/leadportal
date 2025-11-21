import { Router } from 'express'
import { z } from 'zod'
import { logActivity } from '../utils/activityLogger.js'
import { extractRequestInfo } from '../utils/activityLogger.js'
import { createNotification } from '../services/notificationService.js'

const feedbackRouter = (prisma, io) => {
  const router = Router()

  // Validation schemas
  const createFeedbackSchema = z.object({
    leadSaleId: z.string().min(1, 'Lead-Verkauf-ID erforderlich'),
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(5000).optional()
  }).refine(data => data.rating || data.comment, {
    message: 'Mindestens eine Sternebewertung oder ein Kommentar erforderlich'
  })

  const replySchema = z.object({
    message: z.string().min(1, 'Nachricht erforderlich').max(5000)
  })

  const updateStatusSchema = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    internalNote: z.string().min(1, 'Interne Notiz ist erforderlich').max(5000)
  })

  const assignSchema = z.object({
    assignedTo: z.string().optional().nullable()
  })

  // POST /api/feedback - Create feedback (User)
  router.post('/', async (req, res) => {
    try {
      const validation = createFeedbackSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message })
      }

      const { leadSaleId, rating, comment } = validation.data

      // Check if leadSale exists and belongs to the user
      const leadSale = await prisma.leadSale.findUnique({
        where: { id: leadSaleId },
        include: { lead: true }
      })

      if (!leadSale) {
        return res.status(404).json({ error: 'Lead-Verkauf nicht gefunden' })
      }

      if (leadSale.buyerId !== req.user.id) {
        return res.status(403).json({ error: 'Sie können für diesen Kauf kein Feedback hinterlassen' })
      }

      // Check if feedback already exists for this leadSale
      const existingFeedback = await prisma.feedback.findUnique({
        where: { leadSaleId }
      })

      if (existingFeedback) {
        return res.status(400).json({ error: 'Sie haben bereits Feedback für diesen Lead hinterlassen' })
      }

      // Create feedback
      const feedback = await prisma.feedback.create({
        data: {
          leadSaleId,
          userId: req.user.id,
          subject: `Feedback: ${leadSale.lead.title} (${leadSale.lead.id})`,
          rating: rating || null,
          comment: comment || null,
          status: 'OPEN',
          priority: 'MEDIUM'
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true }
          },
          leadSale: {
            include: { lead: true }
          }
        }
      })

      // Log activity
      const { ipAddress, userAgent } = extractRequestInfo(req)
      await logActivity({
        userId: req.user.id,
        action: 'CREATE_FEEDBACK',
        details: { feedbackId: feedback.id, leadSaleId },
        entityType: 'feedback',
        entityId: feedback.id,
        ipAddress,
        userAgent
      })

      // Create notification to all users about new feedback
      try {
        const userName = feedback.user.firstName || feedback.user.email.split('@')[0]

        // Get all users
        const allUsers = await prisma.user.findMany({
          select: { id: true }
        })

        // Send FEEDBACK_ALL notification to all users
        // notificationService will check preferences and role permissions
        await Promise.all(
          allUsers.map(user =>
            createNotification(
              user.id,
              'FEEDBACK_ALL',
              'Neues Feedback eingegangen',
              `Benutzer ${userName} hat Feedback zu "${feedback.subject}" gesendet.`,
              {
                feedbackId: feedback.id,
                userId: req.user.id,
                subject: feedback.subject
              }
            ).catch(e => {
              console.error(`[Notification Error] FEEDBACK_ALL for user ${user.id}:`, e.message)
            })
          )
        )
      } catch (notifError) {
        console.error('[Notification Error] New feedback notification:', notifError.message)
      }

      // Notify admins via Socket.IO
      if (io) {
        io.emit('feedback:new', { feedbackId: feedback.id, userId: req.user.id })
      }

      res.status(201).json(feedback)
    } catch (error) {
      console.error('Geri bildirim oluşturma hatası:', error)
      res.status(500).json({ error: 'Feedback konnte nicht erstellt werden' })
    }
  })

  // GET /api/feedback - List user's feedbacks
  router.get('/', async (req, res) => {
    try {
      const feedbacks = await prisma.feedback.findMany({
        where: { userId: req.user.id },
        include: {
          leadSale: {
            include: { lead: { select: { id: true, title: true } } }
          },
          assignedToUser: { select: { id: true, email: true, firstName: true } },
          replies: {
            include: {
              user: { select: { id: true, email: true, firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      res.json(feedbacks)
    } catch (error) {
      console.error('Geri bildirimleri yükleme hatası:', error)
      res.status(500).json({ error: 'Feedbacks konnten nicht geladen werden' })
    }
  })

  // GET /api/feedback/:id - Get feedback details
  router.get('/:id', async (req, res) => {
    try {
      const feedback = await prisma.feedback.findUnique({
        where: { id: req.params.id },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          leadSale: {
            include: { lead: { select: { id: true, title: true, description: true } } }
          },
          assignedToUser: { select: { id: true, email: true, firstName: true } },
          replies: {
            include: {
              user: { select: { id: true, email: true, firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'asc' }
          },
          statusHistory: {
            include: {
              changedByUser: { select: { id: true, email: true, firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      })

      if (!feedback) {
        return res.status(404).json({ error: 'Geri bildirim bulunamadı' })
      }

      // Check access - user can see their own, admins can see all
      if (feedback.userId !== req.user.id && req.user.userTypeId !== 'ADMIN' && req.user.userTypeId !== 'FULL_ADMIN' && req.user.userTypeId !== 'SUPERADMIN') {
        return res.status(403).json({ error: 'Sie können dieses Feedback nicht anzeigen' })
      }


      res.json(feedback)
    } catch (error) {
      console.error('Fehler beim Laden des Feedbacks:', error)
      res.status(500).json({ error: 'Feedback konnte nicht geladen werden' })
    }
  })

  // POST /api/feedback/:id/reply - Add reply to feedback
  router.post('/:id/reply', async (req, res) => {
    try {
      const validation = replySchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message })
      }

      const feedback = await prisma.feedback.findUnique({
        where: { id: req.params.id },
        include: { user: true, leadSale: { include: { lead: true } } }
      })

      if (!feedback) {
        return res.status(404).json({ error: 'Feedback nicht gefunden' })
      }

      // Check if feedback is closed or resolved - cannot reply to closed/resolved feedbacks
      if (feedback.status === 'CLOSED' || feedback.status === 'RESOLVED') {
        return res.status(400).json({ error: 'Auf geschlossene oder gelöste Feedbacks kann nicht geantwortet werden' })
      }

      // Check if user is admin
      const isAdmin = ['ADMIN', 'SUPERADMIN', 'FULL_ADMIN'].includes(req.user?.userTypeId)
      
      // Create reply
      const reply = await prisma.feedbackReply.create({
        data: {
          feedbackId: req.params.id,
          userId: req.user.id,
          message: validation.data.message,
          isAdmin
        },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } }
        }
      })

      console.log('[Feedback Reply Created]', {
        replyId: reply.id,
        feedbackId: req.params.id,
        userId: req.user.id,
        isAdmin,
        messageLength: validation.data.message.length
      })

      // Update feedback status if admin replied
      if (isAdmin && feedback.status === 'OPEN') {
        await prisma.feedback.update({
          where: { id: req.params.id },
          data: { status: 'IN_PROGRESS' }
        })
        console.log('[Feedback Status Updated to IN_PROGRESS]', { feedbackId: req.params.id })
      }

      // Log activity
      const { ipAddress, userAgent } = extractRequestInfo(req)
      await logActivity({
        userId: req.user.id,
        action: 'REPLY_FEEDBACK',
        details: { feedbackId: req.params.id, isAdmin },
        entityType: 'feedback',
        entityId: req.params.id,
        ipAddress,
        userAgent
      })

      // Create notifications based on who replied
      const leadTitle = feedback.leadSale?.lead?.title || 'Lead'
      const leadId = feedback.leadSale?.lead?.id
      const leadTitleWithId = leadId ? `${leadTitle} (${leadId})` : leadTitle

      // Notification 1: FEEDBACK_OWN - Notify feedback owner if admin replied
      if (isAdmin && feedback.userId !== req.user.id) {
        try {
          const adminName = req.user.firstName || req.user.email.split('@')[0]
          await createNotification(
            feedback.userId,
            'FEEDBACK_OWN',
            'Antwort auf Ihr Feedback erhalten',
            `Admin ${adminName} hat auf Ihr Feedback zu "${leadTitleWithId}" geantwortet.`,
            {
              feedbackId: req.params.id,
              replyId: reply.id,
              leadTitle
            }
          )
        } catch (notifError) {
          console.error('[Notification Error] FEEDBACK_OWN:', notifError.message)
        }
      }

      // Notification 2: FEEDBACK_ALL - Notify all users when admin replies
      if (isAdmin) {
        try {
          const adminName = req.user.firstName || req.user.email.split('@')[0]

          // Get all users
          const allUsers = await prisma.user.findMany({
            select: { id: true }
          })

          // Send FEEDBACK_ALL notification to all users
          // notificationService will check preferences and role permissions
          await Promise.all(
            allUsers.map(user =>
              createNotification(
                user.id,
                'FEEDBACK_ALL',
                'Neue Antwort auf Feedback',
                `Admin ${adminName} hat auf das Feedback zu "${leadTitleWithId}" geantwortet.`,
                {
                  feedbackId: req.params.id,
                  replyId: reply.id,
                  leadTitle
                }
              ).catch(e => {
                console.error(`[Notification Error] FEEDBACK_ALL for user ${user.id}:`, e.message)
              })
            )
          )
        } catch (notifError) {
          console.error('[Notification Error] FEEDBACK_ALL (admin reply):', notifError.message)
        }
      }

      // Notification 3: FEEDBACK_ALL - Notify all users when feedback owner replies
      if (!isAdmin && feedback.userId === req.user.id) {
        try {
          const userName = feedback.user.firstName || feedback.user.email.split('@')[0]

          // Get all users
          const allUsers = await prisma.user.findMany({
            select: { id: true }
          })

          // Send FEEDBACK_ALL notification to all users
          // notificationService will check preferences and role permissions
          await Promise.all(
            allUsers.map(user =>
              createNotification(
                user.id,
                'FEEDBACK_ALL',
                'Neue Nachricht im Feedback-Gespräch',
                `Benutzer ${userName} hat auf das Feedback zu "${leadTitleWithId}" geantwortet.`,
                {
                  feedbackId: req.params.id,
                  replyId: reply.id,
                  leadTitle
                }
              ).catch(e => {
                console.error(`[Notification Error] FEEDBACK_ALL for user ${user.id}:`, e.message)
              })
            )
          )
        } catch (notifError) {
          console.error('[Notification Error] FEEDBACK_ALL notification:', notifError.message)
        }
      }

      // Notify other party via Socket.IO
      if (io) {
        io.emit('feedback:reply', {
          feedbackId: req.params.id,
          replyId: reply.id,
          userId: req.user.id,
          isAdmin
        })
      }

      res.status(201).json(reply)
    } catch (error) {
      console.error('Cevap oluşturma hatası:', error)
      res.status(500).json({ error: 'Antwort konnte nicht erstellt werden' })
    }
  })

  // PATCH /api/feedback/:id/status - Update feedback status (Admin only)
  router.patch('/:id/status', async (req, res) => {
    try {
      if (!['ADMIN', 'SUPERADMIN', 'FULL_ADMIN'].includes(req.user?.userTypeId)) {
        return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' })
      }

      const validation = updateStatusSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message })
      }

      const feedback = await prisma.feedback.findUnique({
        where: { id: req.params.id }
      })

      if (!feedback) {
        return res.status(404).json({ error: 'Feedback nicht gefunden' })
      }

      // Eğer durum değişmiyorsa hata ver
      if (feedback.status === validation.data.status) {
        return res.status(400).json({ error: 'Status hat sich nicht geändert' })
      }

      const oldStatus = feedback.status
      const updateData = { status: validation.data.status }
      if (validation.data.priority) {
        updateData.priority = validation.data.priority
      }
      if (validation.data.status === 'CLOSED') {
        updateData.closedAt = new Date()
      }

      // Durum geçmişi kaydı oluştur
      await prisma.feedbackStatusHistory.create({
        data: {
          feedbackId: req.params.id,
          oldStatus: oldStatus,
          newStatus: validation.data.status,
          internalNote: validation.data.internalNote,
          changedBy: req.user.id
        }
      })

      const updated = await prisma.feedback.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          user: { select: { id: true, email: true } }
        }
      })

      // Log activity
      const { ipAddress, userAgent } = extractRequestInfo(req)
      await logActivity({
        userId: req.user.id,
        action: 'UPDATE_FEEDBACK_STATUS',
        details: { feedbackId: req.params.id, newStatus: validation.data.status },
        entityType: 'feedback',
        entityId: req.params.id,
        ipAddress,
        userAgent
      })

      // Notify user
      if (io) {
        io.emit('feedback:statusChanged', {
          feedbackId: req.params.id,
          newStatus: validation.data.status
        })
      }

      res.json(updated)
    } catch (error) {
      console.error('Durum güncelleme hatası:', error)
      res.status(500).json({ error: 'Status konnte nicht aktualisiert werden' })
    }
  })

  // PATCH /api/feedback/:id/assign - Assign feedback to admin
  router.patch('/:id/assign', async (req, res) => {
    try {
      if (!['ADMIN', 'SUPERADMIN', 'FULL_ADMIN'].includes(req.user?.userTypeId)) {
        return res.status(403).json({ error: 'Sie haben keine Berechtigung für diese Aktion' })
      }

      const validation = assignSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message })
      }

      const feedback = await prisma.feedback.findUnique({
        where: { id: req.params.id }
      })

      if (!feedback) {
        return res.status(404).json({ error: 'Feedback nicht gefunden' })
      }

      const updated = await prisma.feedback.update({
        where: { id: req.params.id },
        data: { assignedTo: validation.data.assignedTo },
        include: {
          assignedToUser: { select: { id: true, email: true, firstName: true } }
        }
      })

      // Log activity
      const { ipAddress, userAgent } = extractRequestInfo(req)
      await logActivity({
        userId: req.user.id,
        action: 'ASSIGN_FEEDBACK',
        details: { feedbackId: req.params.id, assignedTo: validation.data.assignedTo },
        entityType: 'feedback',
        entityId: req.params.id,
        ipAddress,
        userAgent
      })

      res.json(updated)
    } catch (error) {
      console.error('Atama hatası:', error)
      res.status(500).json({ error: 'Zuweisung konnte nicht durchgeführt werden' })
    }
  })

  // GET /api/feedback/admin/all - List all feedbacks (Admin only)
  router.get('/admin/all', async (req, res) => {
    try {
      if (!['ADMIN', 'SUPERADMIN', 'FULL_ADMIN'].includes(req.user?.userTypeId)) {
        return res.status(403).json({ error: 'Sie haben keine Berechtigung für diese Aktion' })
      }

      const { status, priority, assignedTo, search } = req.query

      const where = {}
      if (status) where.status = status
      if (priority) where.priority = priority
      if (assignedTo) where.assignedTo = assignedTo
      if (search) {
        where.OR = [
          { comment: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { leadSale: { lead: { title: { contains: search, mode: 'insensitive' } } } }
        ]
      }

      const feedbacks = await prisma.feedback.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          leadSale: {
            include: { lead: { select: { id: true, title: true } } }
          },
          assignedToUser: { select: { id: true, email: true, firstName: true } },
          replies: {
            select: { id: true, createdAt: true, isAdmin: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      res.json(feedbacks)
    } catch (error) {
      console.error('Geri bildirimleri yükleme hatası:', error)
      res.status(500).json({ error: 'Geri bildirimleri yüklenemedi' })
    }
  })

  return router
}

export default feedbackRouter
