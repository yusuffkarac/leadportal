import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'

export default function aboutRouter(prisma) {
  const router = Router()

  // Public: Get all active About sections
  router.get('/', async (req, res) => {
    try {
      const sections = await prisma.about.findMany({
        where: { isActive: true },
        orderBy: [
          { section: 'asc' },
          { sortOrder: 'asc' },
          { createdAt: 'asc' }
        ]
      })

      // Group by section
      const groupedSections = sections.reduce((acc, section) => {
        if (!acc[section.section]) {
          acc[section.section] = []
        }
        acc[section.section].push(section)
        return acc
      }, {})

      res.json(groupedSections)
    } catch (error) {
      console.error('Error fetching About sections:', error)
      res.status(500).json({ message: 'Hakkında bölümleri alınamadı' })
    }
  })

  // Admin: Get all About sections (including inactive)
  router.get('/admin', requireAdmin, async (req, res) => {
    try {
      const sections = await prisma.about.findMany({
        orderBy: [
          { section: 'asc' },
          { sortOrder: 'asc' },
          { createdAt: 'desc' }
        ]
      })
      res.json(sections)
    } catch (error) {
      console.error('Error fetching admin About sections:', error)
      res.status(500).json({ message: 'Hakkında bölümleri alınamadı' })
    }
  })

  // Admin: Get single About section
  router.get('/admin/:id', requireAdmin, async (req, res) => {
    try {
      const section = await prisma.about.findUnique({
        where: { id: req.params.id }
      })
      
      if (!section) {
        return res.status(404).json({ message: 'Bölüm bulunamadı' })
      }
      
      res.json(section)
    } catch (error) {
      console.error('Error fetching About section:', error)
      res.status(500).json({ message: 'Bölüm alınamadı' })
    }
  })

  // Admin: Create new About section
  router.post('/admin', requireAdmin, async (req, res) => {
    try {
      const { section, title, subtitle, content, imageUrl, data, isActive, sortOrder } = req.body

      if (!section) {
        return res.status(400).json({ message: 'Bölüm adı gerekli' })
      }

      const aboutSection = await prisma.about.create({
        data: {
          section,
          title,
          subtitle,
          content,
          imageUrl,
          data: data || null,
          isActive: isActive !== undefined ? isActive : true,
          sortOrder: sortOrder || 0
        }
      })

      res.json({ message: 'Hakkında bölümü başarıyla oluşturuldu', section: aboutSection })
    } catch (error) {
      console.error('Error creating About section:', error)
      res.status(500).json({ message: 'Hakkında bölümü oluşturulamadı' })
    }
  })

  // Admin: Update About section
  router.put('/admin/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params
      const { section, title, subtitle, content, imageUrl, data, isActive, sortOrder } = req.body

      const aboutSection = await prisma.about.update({
        where: { id },
        data: {
          section,
          title,
          subtitle,
          content,
          imageUrl,
          data: data || null,
          isActive,
          sortOrder
        }
      })

      res.json({ message: 'Hakkında bölümü başarıyla güncellendi', section: aboutSection })
    } catch (error) {
      console.error('Error updating About section:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Bölüm bulunamadı' })
      } else {
        res.status(500).json({ message: 'Hakkında bölümü güncellenemedi' })
      }
    }
  })

  // Admin: Delete About section
  router.delete('/admin/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params

      await prisma.about.delete({
        where: { id }
      })

      res.json({ message: 'Hakkında bölümü başarıyla silindi' })
    } catch (error) {
      console.error('Error deleting About section:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Bölüm bulunamadı' })
      } else {
        res.status(500).json({ message: 'Hakkında bölümü silinemedi' })
      }
    }
  })

  // Admin: Reset to default About sections
  router.post('/admin/reset-defaults', requireAdmin, async (req, res) => {
    try {
      // Delete all existing About sections
      await prisma.about.deleteMany({})

      // Insert default About sections
      const defaultSections = [
        {
          section: 'hero',
          title: 'LeadPortal Hakkında',
          subtitle: 'Potansiyel müşteri yönetiminde yeni nesil çözüm',
          content: 'LeadPortal, işletmelerin potansiyel müşterilerini etkili bir şekilde yönetmelerine ve açık artırma sistemi ile satış süreçlerini optimize etmelerine olanak tanıyan yenilikçi bir platformdur.',
          imageUrl: '/images/about-hero-team.jpg',
          isActive: true,
          sortOrder: 1
        },
        {
          section: 'mission',
          title: 'Misyonumuz',
          subtitle: 'Satış süreçlerini dönüştürüyoruz',
          content: 'Müşteri kazanımı süreçlerini dijitalleştirerek, işletmelerin daha verimli ve karlı satış operasyonları yürütmelerine yardımcı olmak. Açık artırma sistemi ile adil ve şeffaf bir pazar yeri oluşturmak.',
          isActive: true,
          sortOrder: 1
        },
        {
          section: 'vision',
          title: 'Vizyonumuz',
          subtitle: 'Geleceğin satış platformu',
          content: 'Lead yönetiminde küresel standart haline gelmek ve tüm sektörlerde işletmelerin tercih ettiği platform olmak. Teknoloji ile satış süreçlerini kolaylaştıran lider çözüm sağlayıcısı olmak.',
          isActive: true,
          sortOrder: 2
        },
        {
          section: 'stats',
          title: 'Rakamlarla LeadPortal',
          data: {
            stats: [
              { number: '500+', label: 'Aktif Kullanıcı' },
              { number: '1000+', label: 'Başarılı Açık Artırma' },
              { number: '50+', label: 'Farklı Sektör' },
              { number: '24/7', label: 'Destek Hizmeti' }
            ]
          },
          isActive: true,
          sortOrder: 1
        },
        {
          section: 'team',
          title: 'Ekibimiz',
          subtitle: 'Deneyimli ve tutkulu profesyoneller',
          content: 'LeadPortal ekibi, satış, pazarlama ve teknoloji alanlarında uzman profesyonellerden oluşmaktadır. Müşteri memnuniyetini ön planda tutarak, sürekli gelişim ve yenilik anlayışı ile çalışmaktayız.',
          imageUrl: '/images/about-hero-team.jpg',
          isActive: true,
          sortOrder: 1
        },
        {
          section: 'features',
          title: 'Özelliklerimiz',
          data: {
            features: [
              {
                title: 'Açık Artırma Sistemi',
                description: 'Şeffaf ve adil fiyatlandırma ile lead satışı',
                icon: 'auction'
              },
              {
                title: 'Gerçek Zamanlı Takip',
                description: 'Anlık bildirimler ve durum güncellemeleri',
                icon: 'realtime'
              },
              {
                title: 'Güvenli Ödeme',
                description: 'SSL şifreleme ile korumalı ödeme sistemi',
                icon: 'security'
              },
              {
                title: 'Detaylı Raporlama',
                description: 'Kapsamlı analitik ve performans raporları',
                icon: 'analytics'
              }
            ]
          },
          isActive: true,
          sortOrder: 1
        }
      ]

      await prisma.about.createMany({
        data: defaultSections
      })

      res.json({ 
        message: 'Varsayılan Hakkında bölümleri başarıyla yüklendi',
        count: defaultSections.length
      })
    } catch (error) {
      console.error('Error resetting About sections:', error)
      res.status(500).json({ message: 'Varsayılan Hakkında bölümleri yüklenemedi' })
    }
  })

  return router
}
