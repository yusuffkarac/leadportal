import { Router } from 'express'
import { PrismaClient } from '../../generated/prisma/index.js'
import { requireAdmin } from '../middleware/auth.js'

export default (prisma) => {
  const router = Router()

  // Statik sayfa listesi
  const STATIC_PAGES = [
    { id: '/', name: 'Ana Sayfa' },
    { id: '/about', name: 'Hakkında' },
    { id: '/faq', name: 'SSS' },
    { id: '/purchased-leads', name: 'Satın Aldıklarım' },
    { id: '/lead/:id', name: 'Lead Detayı' },
    // Admin
    { id: '/admin/leads', name: 'Lead Yönetimi' },
    { id: '/admin/leads/new', name: 'Yeni Lead' },
    { id: '/admin/leads/:id', name: 'Lead Düzenle' },
    { id: '/admin/users/new', name: 'Kullanıcı Ekle' },
    { id: '/admin/settings', name: 'Ayarlar' },
    { id: '/admin/company-settings', name: 'Firma Ayarları' },
    { id: '/admin/user-types', name: 'Kullanıcı Tipleri' },
    { id: '/admin/faq', name: 'FAQ Yönetimi' },
    { id: '/admin/about', name: 'Hakkında Yönetimi' },
  ]

  // Get all pages (statik listeyi DB'ye yazar ve döner)
  router.get('/', requireAdmin, async (_req, res) => {
    try {
      // Upsert statik sayfalar
      for (const p of STATIC_PAGES) {
        await prisma.page.upsert({
          where: { id: p.id },
          update: { name: p.name, description: null, isActive: true },
          create: { id: p.id, name: p.name, description: null, isActive: true }
        })
      }
      const pages = await prisma.page.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
      return res.json(pages)
    } catch (error) {
      console.error('Error fetching pages:', error)
      res.status(500).json({ message: 'Sayfalar alınamadı' })
    }
  })
  
  // Create new page (isteğe bağlı: manuel ekleme desteği)
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
