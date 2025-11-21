import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { requireAdmin } from '../middleware/auth.js'

export default function customPagesRouter(prisma) {
  const router = Router()

  // Multer konfigürasyonu - custom pages görselleri için
  const pageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/custom-pages'
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }
      cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, 'page-' + uniqueSuffix + path.extname(file.originalname))
    }
  })

  const uploadPageImages = multer({
    storage: pageStorage,
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit per file
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true)
      } else {
        cb(new Error('Nur Bilddateien werden akzeptiert'), false)
      }
    }
  })

  // Admin: Get all custom pages
  router.get('/', requireAdmin, async (req, res) => {
    try {
      const pages = await prisma.customPage.findMany({
        orderBy: { createdAt: 'desc' }
      })
      res.json(pages)
    } catch (error) {
      console.error('Error fetching custom pages:', error)
      res.status(500).json({ message: 'Seiten konnten nicht abgerufen werden' })
    }
  })

  // Public: Get all active custom pages (for footer)
  router.get('/public', async (req, res) => {
    try {
      const pages = await prisma.customPage.findMany({
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          slug: true
        },
        orderBy: { createdAt: 'asc' }
      })
      res.json(pages)
    } catch (error) {
      console.error('Error fetching public custom pages:', error)
      res.status(500).json({ message: 'Seiten konnten nicht abgerufen werden' })
    }
  })

  // Public: Get single custom page by slug
  router.get('/:slug', async (req, res) => {
    try {
      const page = await prisma.customPage.findUnique({
        where: { slug: req.params.slug }
      })
      
      if (!page) {
        return res.status(404).json({ message: 'Seite nicht gefunden' })
      }
      
      if (!page.isActive) {
        return res.status(404).json({ message: 'Seite nicht gefunden' })
      }
      
      res.json(page)
    } catch (error) {
      console.error('Error fetching custom page:', error)
      res.status(500).json({ message: 'Seite konnte nicht abgerufen werden' })
    }
  })

  // Admin: Create new custom page
  router.post('/', requireAdmin, async (req, res) => {
    try {
      const { title, content, images, slug, isActive } = req.body

      if (!title || !slug) {
        return res.status(400).json({ message: 'Titel und Slug sind erforderlich' })
      }

      // Slug validation
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
      if (!slugRegex.test(slug)) {
        return res.status(400).json({ message: 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten' })
      }

      const page = await prisma.customPage.create({
        data: {
          title,
          content: content || null,
          images: images || null,
          slug,
          isActive: isActive !== undefined ? isActive : true
        }
      })

      res.json({ message: 'Seite erfolgreich erstellt', page })
    } catch (error) {
      console.error('Error creating custom page:', error)
      if (error.code === 'P2002') {
        res.status(400).json({ message: 'Dieser Slug wird bereits verwendet' })
      } else {
        res.status(500).json({ message: 'Seite konnte nicht erstellt werden' })
      }
    }
  })

  // Admin: Update custom page
  router.put('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params
      const { title, content, images, slug, isActive } = req.body

      // Slug validation if provided
      if (slug) {
        const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
        if (!slugRegex.test(slug)) {
          return res.status(400).json({ message: 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten' })
        }
      }

      const page = await prisma.customPage.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
          ...(images !== undefined && { images }),
          ...(slug !== undefined && { slug }),
          ...(isActive !== undefined && { isActive })
        }
      })

      res.json({ message: 'Seite erfolgreich aktualisiert', page })
    } catch (error) {
      console.error('Error updating custom page:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Sayfa bulunamadı' })
      } else if (error.code === 'P2002') {
        res.status(400).json({ message: 'Dieser Slug wird bereits verwendet' })
      } else {
        res.status(500).json({ message: 'Seite konnte nicht aktualisiert werden' })
      }
    }
  })

  // Admin: Delete custom page
  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params

      // Get page to delete images
      const page = await prisma.customPage.findUnique({
        where: { id }
      })

      if (page && page.images) {
        // Delete associated images
        const imageArray = Array.isArray(page.images) ? page.images : []
        imageArray.forEach(imageUrl => {
          if (imageUrl && typeof imageUrl === 'string') {
            const imagePath = imageUrl.replace('/uploads/custom-pages/', 'uploads/custom-pages/')
            if (fs.existsSync(imagePath)) {
              try {
                fs.unlinkSync(imagePath)
              } catch (err) {
                console.error('Error deleting image:', err)
              }
            }
          }
        })
      }

      await prisma.customPage.delete({
        where: { id }
      })

      res.json({ message: 'Seite erfolgreich gelöscht' })
    } catch (error) {
      console.error('Error deleting custom page:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Sayfa bulunamadı' })
      } else {
        res.status(500).json({ message: 'Seite konnte nicht gelöscht werden' })
      }
    }
  })

  // Admin: Upload images (multiple)
  router.post('/upload-image', requireAdmin, uploadPageImages.array('images', 10), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Keine Datei hochgeladen' })
      }
      
      const imageUrls = req.files.map(file => `/uploads/custom-pages/${file.filename}`)
      
      res.json({ 
        message: 'Fotos erfolgreich hochgeladen',
        images: imageUrls
      })
    } catch (error) {
      console.error('Fehler beim Hochladen der Fotos:', error)
      res.status(500).json({ error: 'Fehler beim Hochladen der Fotos' })
    }
  })

  return router
}

