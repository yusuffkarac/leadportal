import { Router } from 'express'
import { PrismaClient } from '../../generated/prisma/index.js'
import { requireAdmin } from '../middleware/auth.js'

export default (prisma) => {
  const router = Router()

  // Get all pages
  router.get('/', requireAdmin, async (req, res) => {
    try {
      const pages = await prisma.page.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      })
      res.json(pages)
    } catch (error) {
      console.error('Error fetching pages:', error)
      res.status(500).json({ message: 'Sayfalar alınamadı' })
    }
  })

  // Sync pages from frontend routes
  router.post('/sync', requireAdmin, async (req, res) => {
    try {
      const { routes } = req.body
      
      if (!routes || !Array.isArray(routes)) {
        return res.status(400).json({ message: 'Geçersiz route verisi' })
      }

      const syncedPages = []
      
      for (const route of routes) {
        const page = await prisma.page.upsert({
          where: { id: route.path },
          update: { 
            name: route.name,
            description: route.description || null,
            isActive: true
          },
          create: {
            id: route.path,
            name: route.name,
            description: route.description || null,
            isActive: true
          }
        })
        syncedPages.push(page)
      }

      res.json({ 
        message: 'Sayfalar başarıyla senkronize edildi',
        pages: syncedPages
      })
    } catch (error) {
      console.error('Error syncing pages:', error)
      res.status(500).json({ message: 'Sayfa senkronizasyonu başarısız' })
    }
  })

  // Create new page
  router.post('/', requireAdmin, async (req, res) => {
    try {
      const { id, name, description } = req.body
      
      if (!id || !name) {
        return res.status(400).json({ message: 'ID ve isim gerekli' })
      }

      const page = await prisma.page.create({
        data: {
          id,
          name,
          description: description || null,
          isActive: true
        }
      })

      res.json({ message: 'Sayfa başarıyla oluşturuldu', page })
    } catch (error) {
      console.error('Error creating page:', error)
      if (error.code === 'P2002') {
        res.status(400).json({ message: 'Bu ID zaten kullanılıyor' })
      } else {
        res.status(500).json({ message: 'Sayfa oluşturulamadı' })
      }
    }
  })

  // Update page
  router.put('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params
      const { name, description, isActive } = req.body

      const page = await prisma.page.update({
        where: { id },
        data: {
          name,
          description,
          isActive
        }
      })

      res.json({ message: 'Sayfa başarıyla güncellendi', page })
    } catch (error) {
      console.error('Error updating page:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Sayfa bulunamadı' })
      } else {
        res.status(500).json({ message: 'Sayfa güncellenemedi' })
      }
    }
  })

  // Delete page
  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params

      await prisma.page.delete({
        where: { id }
      })

      res.json({ message: 'Sayfa başarıyla silindi' })
    } catch (error) {
      console.error('Error deleting page:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Sayfa bulunamadı' })
      } else {
        res.status(500).json({ message: 'Sayfa silinemedi' })
      }
    }
  })

  return router
}
