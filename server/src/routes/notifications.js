import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { logActivity } from '../utils/activityLogger.js'
import { prisma } from '../prismaClient.js'
import {
  getNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  getUnreadCount,
  createNotification
} from '../services/notificationService.js'

const router = express.Router()

/**
 * GET /api/notifications/admin/notification-types
 * Tüm bildirim tiplerini getir (Admin)
 */
router.get('/admin/notification-types', requireAuth, async (req, res) => {
  try {
    // Admin kontrolü
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { userTypeId: true }
    })

    if (!user || (user.userTypeId !== 'ADMIN' && user.userTypeId !== 'SUPERADMIN' && user.userTypeId !== 'FULL_ADMIN')) {
      return res.status(403).json({
        success: false,
        message: 'Admin yetkisi gerekli'
      })
    }

    const notificationTypes = await prisma.notificationType.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    res.json(notificationTypes)
  } catch (error) {
    console.error('Error fetching notification types:', error)
    res.status(500).json({
      success: false,
      message: 'Bildirim tipleri getirilirken bir hata oluştu'
    })
  }
})

/**
 * GET /api/notifications/admin/notification-permissions
 * Tüm bildirim izinlerini getir (Admin)
 */
router.get('/admin/notification-permissions', requireAuth, async (req, res) => {
  try {
    // Admin kontrolü
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { userTypeId: true }
    })

    if (!user || (user.userTypeId !== 'ADMIN' && user.userTypeId !== 'SUPERADMIN' && user.userTypeId !== 'FULL_ADMIN')) {
      return res.status(403).json({
        success: false,
        message: 'Admin yetkisi gerekli'
      })
    }

    const permissions = await prisma.notificationRolePermission.findMany({
      include: {
        userType: true,
        notificationType: true
      }
    })

    res.json(permissions)
  } catch (error) {
    console.error('Error fetching notification permissions:', error)
    res.status(500).json({
      success: false,
      message: 'Bildirim izinleri getirilirken bir hata oluştu'
    })
  }
})

/**
 * PUT /api/notifications/admin/notification-permissions
 * Bildirim iznini güncelle (Admin)
 */
router.put('/admin/notification-permissions', requireAuth, async (req, res) => {
  try {
    // Admin kontrolü
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { userTypeId: true }
    })

    if (!user || (user.userTypeId !== 'ADMIN' && user.userTypeId !== 'SUPERADMIN' && user.userTypeId !== 'FULL_ADMIN')) {
      return res.status(403).json({
        success: false,
        message: 'Admin yetkisi gerekli'
      })
    }

    const { userTypeId, notificationTypeId, canReceive } = req.body

    if (!userTypeId || !notificationTypeId || typeof canReceive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz parametreler'
      })
    }

    const permission = await prisma.notificationRolePermission.upsert({
      where: {
        userTypeId_notificationTypeId: {
          userTypeId,
          notificationTypeId
        }
      },
      update: { canReceive },
      create: {
        userTypeId,
        notificationTypeId,
        canReceive
      }
    })

    await logActivity({
      userId: req.user.id,
      action: 'UPDATE_NOTIFICATION_PERMISSION',
      entityType: 'notification_permission',
      details: JSON.stringify({ userTypeId, notificationTypeId, canReceive }),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      permission
    })
  } catch (error) {
    console.error('Error updating notification permission:', error)
    res.status(500).json({
      success: false,
      message: 'Bildirim izni güncellenirken bir hata oluştu'
    })
  }
})

/**
 * GET /api/notifications/unread-count
 * Okunmamış bildirim sayısını getir
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const count = await getUnreadCount(userId)

    res.json({
      success: true,
      count
    })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    res.status(500).json({
      success: false,
      message: 'Bildirim sayısı getirilirken bir hata oluştu'
    })
  }
})

/**
 * GET /api/notifications/unread
 * Okunmamış bildirimleri getir
 */
router.get('/unread', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const limit = parseInt(req.query.limit) || 20

    const notifications = await getUnreadNotifications(userId, limit)

    // await logActivity({
    //   userId,
    //   action: 'VIEW_NOTIFICATIONS',
    //   entityType: 'notification',
    //   details: JSON.stringify({ type: 'unread', count: notifications.length }),
    //   ipAddress: req.ip,
    //   userAgent: req.get('user-agent')
    // })

    res.json({
      success: true,
      notifications
    })
  } catch (error) {
    console.error('Error fetching unread notifications:', error)
    res.status(500).json({
      success: false,
      message: 'Bildirimler getirilirken bir hata oluştu'
    })
  }
})

/**
 * GET /api/notifications/unread-count
 * Okunmamış bildirim sayısını getir
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const count = await getUnreadCount(userId)

    res.json({
      success: true,
      count
    })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    res.status(500).json({
      success: false,
      message: 'Bildirim sayısı getirilirken bir hata oluştu'
    })
  }
})

/**
 * GET /api/notifications
 * Tüm bildirimleri getir (sayfalama ile)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    const result = await getNotifications(userId, page, limit)

    // await logActivity({
    //   userId,
    //   action: 'VIEW_NOTIFICATIONS',
    //   entityType: 'notification',
    //   details: JSON.stringify({ page, limit }),
    //   ipAddress: req.ip,
    //   userAgent: req.get('user-agent')
    // })

    res.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({
      success: false,
      message: 'Bildirimler getirilirken bir hata oluştu'
    })
  }
})

/**
 * PUT /api/notifications/:id/read
 * Bildirimi okundu olarak işaretle
 */
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const notificationId = req.params.id

    const notification = await markAsRead(notificationId, userId)

    await logActivity({
      userId,
      action: 'MARK_NOTIFICATION_READ',
      entityType: 'notification',
      entityId: notificationId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      notification
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(error.message === 'Notification not found' ? 404 : 500).json({
      success: false,
      message: error.message === 'Notification not found'
        ? 'Bildirim bulunamadı'
        : 'Bildirim güncellenirken bir hata oluştu'
    })
  }
})

/**
 * PUT /api/notifications/read-all
 * Tüm bildirimleri okundu olarak işaretle
 */
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    const result = await markAllAsRead(userId)

    await logActivity({
      userId,
      action: 'MARK_ALL_NOTIFICATIONS_READ',
      entityType: 'notification',
      details: JSON.stringify({ count: result.count }),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      message: 'Tüm bildirimler okundu olarak işaretlendi',
      count: result.count
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    res.status(500).json({
      success: false,
      message: 'Bildirimler güncellenirken bir hata oluştu'
    })
  }
})

/**
 * DELETE /api/notifications/:id
 * Bildirimi sil
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const notificationId = req.params.id

    await deleteNotification(notificationId, userId)

    await logActivity({
      userId,
      action: 'DELETE_NOTIFICATION',
      entityType: 'notification',
      entityId: notificationId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      message: 'Bildirim silindi'
    })
  } catch (error) {
    console.error('Error deleting notification:', error)
    res.status(error.message === 'Notification not found' ? 404 : 500).json({
      success: false,
      message: error.message === 'Notification not found'
        ? 'Bildirim bulunamadı'
        : 'Bildirim silinirken bir hata oluştu'
    })
  }
})

/**
 * GET /api/notifications/preferences
 * Kullanıcının bildirim tercihlerini getir
 */
router.get('/preferences', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    const preferences = await getNotificationPreferences(userId)

    await logActivity({
      userId,
      action: 'VIEW_NOTIFICATION_PREFERENCES',
      entityType: 'notification_preference',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      preferences
    })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    res.status(500).json({
      success: false,
      message: 'Bildirim tercihleri getirilirken bir hata oluştu'
    })
  }
})

/**
 * PUT /api/notifications/preferences/:notificationTypeId
 * Kullanıcının bildirim tercihlerini güncelle
 */
router.put('/preferences/:notificationTypeId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const notificationTypeId = req.params.notificationTypeId
    const { emailEnabled, inAppEnabled } = req.body

    if (typeof emailEnabled !== 'boolean' || typeof inAppEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'emailEnabled ve inAppEnabled boolean değerler olmalıdır'
      })
    }

    const preference = await updateNotificationPreferences(
      userId,
      notificationTypeId,
      emailEnabled,
      inAppEnabled
    )

    await logActivity({
      userId,
      action: 'UPDATE_NOTIFICATION_PREFERENCE',
      entityType: 'notification_preference',
      entityId: notificationTypeId,
      details: JSON.stringify({ emailEnabled, inAppEnabled }),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      preference
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    res.status(500).json({
      success: false,
      message: 'Bildirim tercihleri güncellenirken bir hata oluştu'
    })
  }
})

/**
 * POST /api/notifications/test
 * Test bildirimi oluştur (sadece development için)
 */
router.post('/test', requireAuth, async (req, res) => {
  try {
    // Bu endpoint sadece development ortamında kullanılmalı
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Bu endpoint production ortamında kullanılamaz'
      })
    }

    const userId = req.user.id
    const { notificationTypeCode, title, message, data } = req.body

    if (!notificationTypeCode || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'notificationTypeCode, title ve message gereklidir'
      })
    }

    const notification = await createNotification(
      userId,
      notificationTypeCode,
      title,
      message,
      data
    )

    res.json({
      success: true,
      notification
    })
  } catch (error) {
    console.error('Error creating test notification:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

export default router
