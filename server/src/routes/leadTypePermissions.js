import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'

export default (prisma) => {
  const router = Router()

  // Get all lead type permissions (grouped by user type)
  router.get('/user-types', requireAdmin, async (req, res) => {
    try {
      const permissions = await prisma.leadTypePermission.findMany({
        include: {
          userType: true
        }
      })

      // Get all lead types from settings
      const settings = await prisma.settings.findUnique({
        where: { id: 'default' }
      })
      const leadTypes = settings?.insuranceTypes || []

      // Get all user types
      const userTypes = await prisma.userType.findMany({
        where: { isActive: true }
      })

      // Group permissions by user type and lead type
      const groupedPermissions = {}
      userTypes.forEach(userType => {
        groupedPermissions[userType.id] = {}
        leadTypes.forEach(leadType => {
          // Default: herkes her lead tipini görebilir
          groupedPermissions[userType.id][leadType] = true
        })
      })

      // Override with actual permissions
      permissions.forEach(permission => {
        if (groupedPermissions[permission.userTypeId]) {
          groupedPermissions[permission.userTypeId][permission.leadType] = permission.hasAccess
        }
      })

      res.json({ 
        permissions: groupedPermissions,
        leadTypes,
        userTypes
      })
    } catch (error) {
      console.error('Error fetching lead type permissions:', error)
      res.status(500).json({ message: 'Lead tipi yetkileri alınamadı' })
    }
  })

  // Update lead type permissions for user types
  router.post('/user-types', requireAdmin, async (req, res) => {
    try {
      const { permissions } = req.body
      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({ message: 'Geçersiz yetkilendirme verisi' })
      }

      // Clear existing permissions
      await prisma.leadTypePermission.deleteMany({})

      // Create new permissions
      const permissionData = []
      for (const [userTypeId, leadTypePermissions] of Object.entries(permissions)) {
        for (const [leadType, hasAccess] of Object.entries(leadTypePermissions)) {
          // Sadece false olan değerleri kaydet (true default)
          if (!hasAccess) {
            permissionData.push({
              userTypeId,
              leadType,
              hasAccess
            })
          }
        }
      }

      if (permissionData.length > 0) {
        await prisma.leadTypePermission.createMany({
          data: permissionData
        })
      }

      res.json({ message: 'Lead tipi yetkileri başarıyla kaydedildi' })
    } catch (error) {
      console.error('Error updating lead type permissions:', error)
      res.status(500).json({ message: 'Lead tipi yetkileri kaydedilemedi' })
    }
  })

  // Get user-specific lead type permissions
  router.get('/users/:userId', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { userType: true }
      })

      if (!user) {
        return res.status(404).json({ message: 'Kullanıcı bulunamadı' })
      }

      const userPermissions = await prisma.userLeadTypePermission.findMany({
        where: { userId }
      })

      // Get all lead types
      const settings = await prisma.settings.findUnique({
        where: { id: 'default' }
      })
      const leadTypes = settings?.insuranceTypes || []

      // Build permission map
      const permissionMap = {}
      leadTypes.forEach(leadType => {
        permissionMap[leadType] = null // null = use user type default
      })

      userPermissions.forEach(permission => {
        permissionMap[permission.leadType] = permission.hasAccess
      })

      res.json({ 
        user,
        permissions: permissionMap,
        leadTypes
      })
    } catch (error) {
      console.error('Error fetching user lead type permissions:', error)
      res.status(500).json({ message: 'Kullanıcı lead tipi yetkileri alınamadı' })
    }
  })

  // Update user-specific lead type permissions
  router.post('/users/:userId', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params
      const { permissions } = req.body

      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({ message: 'Geçersiz yetkilendirme verisi' })
      }

      // Clear existing user permissions
      await prisma.userLeadTypePermission.deleteMany({
        where: { userId }
      })

      // Create new permissions (only save non-null values)
      const permissionData = []
      for (const [leadType, hasAccess] of Object.entries(permissions)) {
        if (hasAccess !== null) {
          permissionData.push({
            userId,
            leadType,
            hasAccess
          })
        }
      }

      if (permissionData.length > 0) {
        await prisma.userLeadTypePermission.createMany({
          data: permissionData
        })
      }

      res.json({ message: 'Kullanıcı lead tipi yetkileri başarıyla kaydedildi' })
    } catch (error) {
      console.error('Error updating user lead type permissions:', error)
      res.status(500).json({ message: 'Kullanıcı lead tipi yetkileri kaydedilemedi' })
    }
  })

  // Check if user has access to a specific lead type
  router.get('/check/:userId/:leadType', async (req, res) => {
    try {
      const { userId, leadType } = req.params

      // Get user with user type
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { userType: true }
      })

      if (!user) {
        return res.status(404).json({ message: 'Kullanıcı bulunamadı' })
      }

      // SUPERADMIN her şeyi görebilir
      if (user.userTypeId === 'SUPERADMIN') {
        return res.json({ hasAccess: true })
      }

      // 1. Önce kullanıcı özel izinlerini kontrol et
      const userPermission = await prisma.userLeadTypePermission.findUnique({
        where: {
          userId_leadType: {
            userId,
            leadType
          }
        }
      })

      if (userPermission) {
        return res.json({ hasAccess: userPermission.hasAccess })
      }

      // 2. Kullanıcı özel izin yoksa, user type izinlerini kontrol et
      const userTypePermission = await prisma.leadTypePermission.findUnique({
        where: {
          userTypeId_leadType: {
            userTypeId: user.userTypeId,
            leadType
          }
        }
      })

      if (userTypePermission) {
        return res.json({ hasAccess: userTypePermission.hasAccess })
      }

      // 3. Hiçbir izin yoksa, default true (herkes görebilir)
      res.json({ hasAccess: true })
    } catch (error) {
      console.error('Error checking lead type permission:', error)
      res.status(500).json({ message: 'Lead tipi yetkisi kontrol edilemedi' })
    }
  })

  return router
}

