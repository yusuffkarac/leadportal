import { Router } from 'express'
import { PrismaClient } from '../../generated/prisma/index.js'
import { requireAdmin } from '../middleware/auth.js'

export default (prisma) => {
  const router = Router()

  // Get all user types with user counts
  router.get('/', requireAdmin, async (req, res) => {
    try {
      const userTypes = await prisma.userType.findMany({
        include: {
          _count: {
            select: {
              users: true,
              permissions: true
            }
          }
        },
        orderBy: { name: 'asc' }
      })

      res.json(userTypes)
    } catch (error) {
      console.error('Error fetching user types:', error)
      res.status(500).json({ message: 'Kullanıcı tipleri alınamadı' })
    }
  })

  // Get admin users for feedback assignment
  router.get('/admins', requireAdmin, async (req, res) => {
    try {
      const admins = await prisma.user.findMany({
        where: {
          userTypeId: {
            in: ['ADMIN', 'SUPERADMIN']
          }
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        },
        orderBy: { email: 'asc' }
      })

      res.json(admins)
    } catch (error) {
      console.error('Error fetching admin users:', error)
      res.status(500).json({ message: 'Admin kullanıcıları alınamadı' })
    }
  })

  // Create new user type
  router.post('/', requireAdmin, async (req, res) => {
    try {
      const { id, name, description } = req.body
      
      if (!id || !name) {
        return res.status(400).json({ message: 'ID ve isim gerekli' })
      }

      const userType = await prisma.userType.create({
        data: {
          id,
          name,
          description: description || null,
          isActive: true
        }
      })

      res.json({ message: 'Kullanıcı tipi başarıyla oluşturuldu', userType })
    } catch (error) {
      console.error('Error creating user type:', error)
      if (error.code === 'P2002') {
        res.status(400).json({ message: 'Bu ID zaten kullanılıyor' })
      } else {
        res.status(500).json({ message: 'Kullanıcı tipi oluşturulamadı' })
      }
    }
  })

  // Update user type
  router.put('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params
      const { name, description, isActive } = req.body

      const userType = await prisma.userType.update({
        where: { id },
        data: {
          name,
          description,
          isActive
        }
      })

      res.json({ message: 'Kullanıcı tipi başarıyla güncellendi', userType })
    } catch (error) {
      console.error('Error updating user type:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Kullanıcı tipi bulunamadı' })
      } else {
        res.status(500).json({ message: 'Kullanıcı tipi güncellenemedi' })
      }
    }
  })

  // Delete user type
  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params

      await prisma.userType.delete({
        where: { id }
      })

      res.json({ message: 'Kullanıcı tipi başarıyla silindi' })
    } catch (error) {
      console.error('Error deleting user type:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Kullanıcı tipi bulunamadı' })
      } else {
        res.status(500).json({ message: 'Kullanıcı tipi silinemedi' })
      }
    }
  })

  // Get user type permissions
  router.get('/permissions', requireAdmin, async (req, res) => {
    try {
      const permissions = await prisma.userTypePermission.findMany({
        include: {
          userType: true,
          page: true
        }
      })

      // Group permissions by user type
      const groupedPermissions = {}
      permissions.forEach(permission => {
        if (!groupedPermissions[permission.userTypeId]) {
          groupedPermissions[permission.userTypeId] = {}
        }
        groupedPermissions[permission.userTypeId][permission.pageId] = permission.hasAccess
      })

      res.json(groupedPermissions)
    } catch (error) {
      console.error('Error fetching user type permissions:', error)
      res.status(500).json({ message: 'Kullanıcı tipi yetkilendirmeleri alınamadı' })
    }
  })

  // Update user type permissions
  router.post('/permissions', requireAdmin, async (req, res) => {
    try {
      const { permissions } = req.body
      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({ message: 'Geçersiz yetkilendirme verisi' })
      }

      // Her kullanıcı tipi için ayrı ayrı işle
      for (const [userTypeId, pagePermissions] of Object.entries(permissions)) {
        // Bu kullanıcı tipinin mevcut yetkilendirmelerini sil
        await prisma.userTypePermission.deleteMany({
          where: { userTypeId }
        })

        // Yeni yetkilendirmeleri oluştur
        const permissionData = []
        for (const [pageId, hasAccess] of Object.entries(pagePermissions)) {
          permissionData.push({
            userTypeId,
            pageId,
            hasAccess
          })
        }

        if (permissionData.length > 0) {
          await prisma.userTypePermission.createMany({
            data: permissionData
          })
        }
      }

      res.json({ message: 'Yetkilendirmeler başarıyla kaydedildi' })
    } catch (error) {
      console.error('Error updating user type permissions:', error)
      res.status(500).json({ message: 'Yetkilendirmeler kaydedilemedi' })
    }
  })

  // Check user type permission for a specific route
  router.get('/check/:userType', async (req, res) => {
    try {
      const { userType } = req.params
      const route = req.query.route || ''
      
      // SUPERADMIN her yere erişebilir
      if (userType === 'SUPERADMIN') {
        return res.json({ hasAccess: true })
      }
      
      // İstenen path'i normalize et
      const pageId = route ? `/${route}` : '/'

      // 1) Önce birebir eşleşme kontrolü
      const exact = await prisma.userTypePermission.findUnique({
        where: {
          userTypeId_pageId: {
            userTypeId: userType,
            pageId: pageId
          }
        }
      })
      if (exact?.hasAccess) {
        return res.json({ hasAccess: true })
      }

      // 2) Dinamik route kalıpları için (örn: /lead/:id, /x/*) desen eşleştirme
      const allPermissions = await prisma.userTypePermission.findMany({
        where: { userTypeId: userType, hasAccess: true },
        select: { pageId: true, hasAccess: true }
      })

      const hasWildcardAccess = allPermissions.some((perm) => {
        // ":param" bölümlerini tek segmentlik wildcard'a çevir, yıldızı serbest eşleşmeye çevir
        const pattern = '^' + perm.pageId
          .replace(/\//g, '\\/')
          .replace(/:[^/]+/g, '[^/]+')
          .replace(/\*/g, '.*') + '$'
        try {
          return new RegExp(pattern).test(pageId)
        } catch {
          return false
        }
      })

      return res.json({ hasAccess: !!hasWildcardAccess })
    } catch (error) {
      console.error('Permission check error:', error)
      res.status(500).json({ message: 'Yetki kontrolü yapılamadı' })
    }
  })

  return router
}