import { PrismaClient } from '../prismaClient.js'

const prisma = new PrismaClient()

/**
 * Activity Logger Utility
 * Kullanıcı aktivitelerini kaydeder
 */

// Aktivite tipleri
export const ActivityTypes = {
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',

  // Lead Operations
  VIEW_LEAD: 'VIEW_LEAD',
  CREATE_LEAD: 'CREATE_LEAD',
  EDIT_LEAD: 'EDIT_LEAD',
  DELETE_LEAD: 'DELETE_LEAD',
  PUBLISH_LEAD: 'PUBLISH_LEAD',
  UNPUBLISH_LEAD: 'UNPUBLISH_LEAD',

  // Bid Operations
  CREATE_BID: 'CREATE_BID',
  UPDATE_BID: 'UPDATE_BID',
  DELETE_BID: 'DELETE_BID',

  // Purchase Operations
  PURCHASE_LEAD: 'PURCHASE_LEAD',
  INSTANT_BUY: 'INSTANT_BUY',

  // Watch Operations
  ADD_WATCH: 'ADD_WATCH',
  REMOVE_WATCH: 'REMOVE_WATCH',

  // User Operations
  CREATE_USER: 'CREATE_USER',
  EDIT_USER: 'EDIT_USER',
  DELETE_USER: 'DELETE_USER',
  DEACTIVATE_USER: 'DEACTIVATE_USER',
  RESET_PASSWORD: 'RESET_PASSWORD',

  // Settings
  CHANGE_SETTINGS: 'CHANGE_SETTINGS',
  CHANGE_DESIGN: 'CHANGE_DESIGN',
  CHANGE_BRANDING: 'CHANGE_BRANDING',
  CHANGE_EMAIL_SETTINGS: 'CHANGE_EMAIL_SETTINGS',

  // Admin Operations
  VIEW_STATISTICS: 'VIEW_STATISTICS',
  VIEW_USERS: 'VIEW_USERS',
  VIEW_ACTIVITY_LOG: 'VIEW_ACTIVITY_LOG',
  CHANGE_PERMISSIONS: 'CHANGE_PERMISSIONS',

  // FAQ & About
  CREATE_FAQ: 'CREATE_FAQ',
  EDIT_FAQ: 'EDIT_FAQ',
  DELETE_FAQ: 'DELETE_FAQ',
  EDIT_ABOUT: 'EDIT_ABOUT',

  // 2FA Operations
  INITIATE_2FA: 'INITIATE_2FA',
  ENABLE_2FA: 'ENABLE_2FA',
  DISABLE_2FA: 'DISABLE_2FA',
  ADMIN_DISABLE_2FA: 'ADMIN_DISABLE_2FA',

  // Password Operations
  PASSWORD_RESET: 'PASSWORD_RESET',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',

  // Balance Operations
  ADD_BALANCE: 'ADD_BALANCE',
  DEDUCT_BALANCE: 'DEDUCT_BALANCE',
  TOGGLE_BALANCE: 'TOGGLE_BALANCE',
  UPDATE_PAYMENT_METHOD: 'UPDATE_PAYMENT_METHOD',
}

/**
 * Aktivite kaydı oluştur
 * @param {Object} params
 * @param {string} params.userId - Kullanıcı ID
 * @param {string} params.action - Aktivite tipi (ActivityTypes'tan)
 * @param {Object} params.details - Ek detaylar (obje olarak, JSON'a çevrilecek)
 * @param {string} params.entityType - İlgili entity tipi (lead, bid, user, vb.)
 * @param {string} params.entityId - İlgili entity ID
 * @param {string} params.ipAddress - IP adresi
 * @param {string} params.userAgent - User agent
 */
export async function logActivity({
  userId,
  action,
  details = null,
  entityType = null,
  entityId = null,
  ipAddress = null,
  userAgent = null
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        details: details ? JSON.stringify(details) : null,
        entityType,
        entityId,
        ipAddress,
        userAgent
      }
    })
  } catch (error) {
    // Aktivite log hatası asıl işlemi engellemesin
    console.error('Activity log error:', error)
  }
}

/**
 * Request objesinden IP ve user agent bilgisi çıkarır
 * @param {Object} req - Express request objesi
 * @returns {Object} { ipAddress, userAgent }
 */
export function extractRequestInfo(req) {
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                    req.headers['x-real-ip'] ||
                    req.socket.remoteAddress ||
                    req.connection.remoteAddress

  const userAgent = req.headers['user-agent'] || 'Unknown'

  return { ipAddress, userAgent }
}

/**
 * Express middleware - Request'ten bilgi çıkarıp req.logActivity fonksiyonu ekler
 */
export function activityLoggerMiddleware(req, res, next) {
  const { ipAddress, userAgent } = extractRequestInfo(req)

  // req.logActivity fonksiyonu ekle
  req.logActivity = async (action, details = null, entityType = null, entityId = null) => {
    if (req.user?.id) {
      await logActivity({
        userId: req.user.id,
        action,
        details,
        entityType,
        entityId,
        ipAddress,
        userAgent
      })
    }
  }

  next()
}

export default {
  logActivity,
  extractRequestInfo,
  activityLoggerMiddleware,
  ActivityTypes
}
