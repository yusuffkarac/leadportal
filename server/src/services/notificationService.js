import { prisma } from '../prismaClient.js'
import { sendNotificationEmail } from './emailService.js'

/**
 * Bildirim oluşturma servisi
 * @param {string} userId - Bildirim alacak kullanıcı ID
 * @param {string} notificationTypeCode - Bildirim tipi kodu (örn: "BID_RECEIVED")
 * @param {string} title - Bildirim başlığı
 * @param {string} message - Bildirim mesajı
 * @param {object} data - Ek veriler (leadId, bidId, amount vb.)
 * @returns {Promise<object>} - Oluşturulan bildirim
 */
export async function createNotification(userId, notificationTypeCode, title, message, data = null) {
  try {
    // Bildirim tipini bul
    const notificationType = await prisma.notificationType.findUnique({
      where: { code: notificationTypeCode }
    })

    if (!notificationType) {
      throw new Error(`Notification type not found: ${notificationTypeCode}`)
    }

    // Kullanıcının bildirim tercihi var mı kontrol et
    let userPreference = await prisma.notificationPreference.findUnique({
      where: {
        userId_notificationTypeId: {
          userId,
          notificationTypeId: notificationType.id
        }
      }
    })

    // Eğer tercihi yoksa, varsayılan tercih oluştur
    if (!userPreference) {
      userPreference = await prisma.notificationPreference.create({
        data: {
          userId,
          notificationTypeId: notificationType.id,
          emailEnabled: notificationType.defaultEnabled,
          inAppEnabled: notificationType.defaultEnabled
        }
      })
    }

    // Kullanıcının rol izni var mı kontrol et
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    const rolePermission = await prisma.notificationRolePermission.findUnique({
      where: {
        userTypeId_notificationTypeId: {
          userTypeId: user.userTypeId,
          notificationTypeId: notificationType.id
        }
      }
    })

    // Eğer rol izni yoksa veya izin verilmemişse bildirim oluşturma
    if (!rolePermission || !rolePermission.canReceive) {
      console.log(`User ${userId} cannot receive notification type ${notificationTypeCode}`)
      return null
    }

    // In-app bildirimi oluştur (eğer kullanıcı in-app bildirimi aktifse)
    let notification = null
    if (userPreference.inAppEnabled && notificationType.inAppEnabled) {
      notification = await prisma.notification.create({
        data: {
          userId,
          notificationTypeId: notificationType.id,
          title,
          message,
          data,
          isRead: false
        },
        include: {
          notificationType: true
        }
      })
    }

    // Email bildirimi gönder (eğer kullanıcı email bildirimi aktifse)
    if (userPreference.emailEnabled && notificationType.emailEnabled) {
      // Email servisini burada çağıracağız
      // Şimdilik sadece flag'i işaretle
      if (notification) {
        // Email gönderme işlemini async olarak yapacağız
        // Bu sayede kullanıcı beklemek zorunda kalmaz
        sendEmailNotification(notification, user).catch(err => {
          console.error('Email notification error:', err)
        })
      }
    }

    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

/**
 * Email bildirimi gönder
 */
async function sendEmailNotification(notification, user) {
  try {
    // Email servisi ile bildirim emaili gönder
    const sent = await sendNotificationEmail(notification, user)

    // Email gönderildiyse flag'i güncelle
    if (sent) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          emailSent: true,
          emailSentAt: new Date()
        }
      })
    }

    return sent
  } catch (error) {
    console.error('Error sending email notification:', error)
    return false
  }
}

/**
 * Kullanıcının okunmamış bildirimlerini getir
 */
export async function getUnreadNotifications(userId, limit = 20) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        isRead: false
      },
      include: {
        notificationType: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    return notifications
  } catch (error) {
    console.error('Error getting unread notifications:', error)
    throw error
  }
}

/**
 * Kullanıcının tüm bildirimlerini getir (sayfalama ile)
 */
export async function getNotifications(userId, page = 1, limit = 20) {
  try {
    const skip = (page - 1) * limit

    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        include: {
          notificationType: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.notification.count({
        where: { userId }
      })
    ])

    return {
      notifications,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    }
  } catch (error) {
    console.error('Error getting notifications:', error)
    throw error
  }
}

/**
 * Bildirimi okundu olarak işaretle
 */
export async function markAsRead(notificationId, userId) {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId
      }
    })

    if (!notification) {
      throw new Error('Notification not found')
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      },
      include: {
        notificationType: true
      }
    })

    return updatedNotification
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

/**
 * Tüm bildirimleri okundu olarak işaretle
 */
export async function markAllAsRead(userId) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return result
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}

/**
 * Bildirimi sil
 */
export async function deleteNotification(notificationId, userId) {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId
      }
    })

    if (!notification) {
      throw new Error('Notification not found')
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting notification:', error)
    throw error
  }
}

/**
 * Kullanıcının bildirim tercihlerini getir
 */
export async function getNotificationPreferences(userId) {
  try {
    // Tüm bildirim tiplerini getir
    const notificationTypes = await prisma.notificationType.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    // Kullanıcının tercihlerini getir
    const userPreferences = await prisma.notificationPreference.findMany({
      where: { userId },
      include: {
        notificationType: true
      }
    })

    // Kullanıcının rolünü al
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    // Rol izinlerini getir
    const rolePermissions = await prisma.notificationRolePermission.findMany({
      where: {
        userTypeId: user.userTypeId
      }
    })

    // Her bildirim tipi için tercih ve izin bilgisini birleştir
    const preferences = notificationTypes.map(notifType => {
      const userPref = userPreferences.find(p => p.notificationTypeId === notifType.id)
      const rolePerm = rolePermissions.find(p => p.notificationTypeId === notifType.id)

      return {
        notificationType: notifType,
        emailEnabled: userPref?.emailEnabled ?? notifType.defaultEnabled,
        inAppEnabled: userPref?.inAppEnabled ?? notifType.defaultEnabled,
        canReceive: rolePerm?.canReceive ?? true,
        hasPreference: !!userPref
      }
    })

    return preferences
  } catch (error) {
    console.error('Error getting notification preferences:', error)
    throw error
  }
}

/**
 * Kullanıcının bildirim tercihlerini güncelle
 */
export async function updateNotificationPreferences(userId, notificationTypeId, emailEnabled, inAppEnabled) {
  try {
    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_notificationTypeId: {
          userId,
          notificationTypeId
        }
      },
      update: {
        emailEnabled,
        inAppEnabled
      },
      create: {
        userId,
        notificationTypeId,
        emailEnabled,
        inAppEnabled
      },
      include: {
        notificationType: true
      }
    })

    return preference
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    throw error
  }
}

/**
 * Okunmamış bildirim sayısını getir
 */
export async function getUnreadCount(userId) {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    })

    return count
  } catch (error) {
    console.error('Error getting unread count:', error)
    throw error
  }
}
