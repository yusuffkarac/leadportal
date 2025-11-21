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
      res.status(500).json({ message: 'Über-Abschnitte konnten nicht abgerufen werden' })
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
      res.status(500).json({ message: 'Über-Abschnitte konnten nicht abgerufen werden' })
    }
  })

  // Admin: Get single About section
  router.get('/admin/:id', requireAdmin, async (req, res) => {
    try {
      const section = await prisma.about.findUnique({
        where: { id: req.params.id }
      })
      
      if (!section) {
        return res.status(404).json({ message: 'Abschnitt nicht gefunden' })
      }
      
      res.json(section)
    } catch (error) {
      console.error('Error fetching About section:', error)
      res.status(500).json({ message: 'Abschnitt konnte nicht abgerufen werden' })
    }
  })

  // Admin: Create new About section
  router.post('/admin', requireAdmin, async (req, res) => {
    try {
      const { section, title, subtitle, content, imageUrl, data, isActive, sortOrder } = req.body

      if (!section) {
        return res.status(400).json({ message: 'Abschnittsname ist erforderlich' })
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

      res.json({ message: 'Über-Abschnitt erfolgreich erstellt', section: aboutSection })
    } catch (error) {
      console.error('Error creating About section:', error)
      res.status(500).json({ message: 'Über-Abschnitt konnte nicht erstellt werden' })
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

      res.json({ message: 'Über-Abschnitt erfolgreich aktualisiert', section: aboutSection })
    } catch (error) {
      console.error('Error updating About section:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Bölüm bulunamadı' })
      } else {
        res.status(500).json({ message: 'Über-Abschnitt konnte nicht aktualisiert werden' })
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

      res.json({ message: 'Über-Abschnitt erfolgreich gelöscht' })
    } catch (error) {
      console.error('Error deleting About section:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Bölüm bulunamadı' })
      } else {
        res.status(500).json({ message: 'Über-Abschnitt konnte nicht gelöscht werden' })
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
          title: 'Über LeadPortal',
          subtitle: 'Next-Generation-Lösung für Lead-Management',
          content: 'LeadPortal ist eine innovative Plattform, die es Unternehmen ermöglicht, ihre potenziellen Kunden effektiv zu verwalten und ihre Verkaufsprozesse durch ein Auktionssystem zu optimieren.',
          imageUrl: '/images/about-hero-team.jpg',
          isActive: true,
          sortOrder: 1
        },
        {
          section: 'mission',
          title: 'Unsere Mission',
          subtitle: 'Wir transformieren Verkaufsprozesse',
          content: 'Durch die Digitalisierung von Kundenakquisitionsprozessen helfen wir Unternehmen, effizientere und profitablere Verkaufsoperationen durchzuführen. Schaffung eines fairen und transparenten Marktplatzes durch ein Auktionssystem.',
          isActive: true,
          sortOrder: 1
        },
        {
          section: 'vision',
          title: 'Unsere Vision',
          subtitle: 'Die Verkaufsplattform der Zukunft',
          content: 'Der globale Standard im Lead-Management zu werden und die bevorzugte Plattform für Unternehmen in allen Branchen zu sein. Der führende Lösungsanbieter zu sein, der Verkaufsprozesse durch Technologie vereinfacht.',
          isActive: true,
          sortOrder: 2
        },
        {
          section: 'stats',
          title: 'LeadPortal in Zahlen',
          data: {
            stats: [
              { number: '500+', label: 'Aktive Benutzer' },
              { number: '1000+', label: 'Erfolgreiche Auktionen' },
              { number: '50+', label: 'Verschiedene Branchen' },
              { number: '24/7', label: 'Support-Service' }
            ]
          },
          isActive: true,
          sortOrder: 1
        },
        {
          section: 'team',
          title: 'Unser Team',
          subtitle: 'Erfahrene und leidenschaftliche Profis',
          content: 'Das LeadPortal-Team besteht aus Experten in den Bereichen Vertrieb, Marketing und Technologie. Wir arbeiten mit einem kontinuierlichen Entwicklungs- und Innovationsansatz und stellen die Kundenzufriedenheit in den Vordergrund.',
          imageUrl: '/images/about-hero-team.jpg',
          isActive: true,
          sortOrder: 1
        },
        {
          section: 'features',
          title: 'Unsere Funktionen',
          data: {
            features: [
              {
                title: 'Auktionssystem',
                description: 'Lead-Verkauf mit transparenter und fairer Preisgestaltung',
                icon: 'auction'
              },
              {
                title: 'Echtzeit-Verfolgung',
                description: 'Sofortige Benachrichtigungen und Status-Updates',
                icon: 'realtime'
              },
              {
                title: 'Sichere Zahlung',
                description: 'Geschütztes Zahlungssystem mit SSL-Verschlüsselung',
                icon: 'security'
              },
              {
                title: 'Detaillierte Berichterstattung',
                description: 'Umfassende Analysen und Leistungsberichte',
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
        message: 'Standard-Über-Abschnitte erfolgreich geladen',
        count: defaultSections.length
      })
    } catch (error) {
      console.error('Error resetting About sections:', error)
      res.status(500).json({ message: 'Standard-Über-Abschnitte konnten nicht geladen werden' })
    }
  })

  return router
}
