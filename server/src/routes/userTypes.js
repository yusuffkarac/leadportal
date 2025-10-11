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

      // Clear existing permissions
      await prisma.userTypePermission.deleteMany({})

      // Create new permissions
      const permissionData = []
      for (const [userTypeId, pagePermissions] of Object.entries(permissions)) {
        for (const [pageId, hasAccess] of Object.entries(pagePermissions)) {
          permissionData.push({
            userTypeId,
            pageId,
            hasAccess
          })
        }
      }

      if (permissionData.length > 0) {
        await prisma.userTypePermission.createMany({
          data: permissionData
        })
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
      
      // Route'u doğru formata çevir
      const pageId = route ? `/${route}` : '/'

      const permission = await prisma.userTypePermission.findUnique({
        where: {
          userTypeId_pageId: {
            userTypeId: userType,
            pageId: pageId
          }
        }
      })

      const hasAccess = permission?.hasAccess || false
      res.json({ hasAccess })
    } catch (error) {
      console.error('Permission check error:', error)
      res.status(500).json({ message: 'Yetki kontrolü yapılamadı' })
    }
  })

  return router
}