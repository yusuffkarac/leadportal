import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'

export default function faqRouter(prisma) {
  const router = Router()

  // Public: Get all active FAQs
  router.get('/', async (req, res) => {
    try {
      const faqs = await prisma.fAQ.findMany({
        where: { isActive: true },
        orderBy: [
          { category: 'asc' },
          { sortOrder: 'asc' },
          { createdAt: 'asc' }
        ]
      })

      // Group by category
      const groupedFAQs = faqs.reduce((acc, faq) => {
        if (!acc[faq.category]) {
          acc[faq.category] = []
        }
        acc[faq.category].push(faq)
        return acc
      }, {})

      res.json(groupedFAQs)
    } catch (error) {
      console.error('Error fetching FAQs:', error)
      res.status(500).json({ message: 'FAQs konnten nicht abgerufen werden' })
    }
  })

  // Admin: Get all FAQs (including inactive)
  router.get('/admin', requireAdmin, async (req, res) => {
    try {
      const faqs = await prisma.fAQ.findMany({
        orderBy: [
          { category: 'asc' },
          { sortOrder: 'asc' },
          { createdAt: 'desc' }
        ]
      })
      res.json(faqs)
    } catch (error) {
      console.error('Error fetching admin FAQs:', error)
      res.status(500).json({ message: 'FAQs konnten nicht abgerufen werden' })
    }
  })

  // Admin: Get single FAQ
  router.get('/admin/:id', requireAdmin, async (req, res) => {
    try {
      const faq = await prisma.fAQ.findUnique({
        where: { id: req.params.id }
      })
      
      if (!faq) {
        return res.status(404).json({ message: 'FAQ nicht gefunden' })
      }
      
      res.json(faq)
    } catch (error) {
      console.error('Error fetching FAQ:', error)
      res.status(500).json({ message: 'FAQ konnte nicht abgerufen werden' })
    }
  })

  // Admin: Create new FAQ
  router.post('/admin', requireAdmin, async (req, res) => {
    try {
      const { question, answer, category, isActive, sortOrder } = req.body

      if (!question || !answer || !category) {
        return res.status(400).json({ message: 'Frage, Antwort und Kategorie sind erforderlich' })
      }

      const faq = await prisma.fAQ.create({
        data: {
          question,
          answer,
          category,
          isActive: isActive !== undefined ? isActive : true,
          sortOrder: sortOrder || 0
        }
      })

      res.json({ message: 'FAQ erfolgreich erstellt', faq })
    } catch (error) {
      console.error('Error creating FAQ:', error)
      res.status(500).json({ message: 'FAQ konnte nicht erstellt werden' })
    }
  })

  // Admin: Update FAQ
  router.put('/admin/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params
      const { question, answer, category, isActive, sortOrder } = req.body

      const faq = await prisma.fAQ.update({
        where: { id },
        data: {
          question,
          answer,
          category,
          isActive,
          sortOrder
        }
      })

      res.json({ message: 'FAQ erfolgreich aktualisiert', faq })
    } catch (error) {
      console.error('Error updating FAQ:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'FAQ nicht gefunden' })
      } else {
        res.status(500).json({ message: 'FAQ konnte nicht aktualisiert werden' })
      }
    }
  })

  // Admin: Delete FAQ
  router.delete('/admin/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params

      await prisma.fAQ.delete({
        where: { id }
      })

      res.json({ message: 'FAQ erfolgreich gelöscht' })
    } catch (error) {
      console.error('Error deleting FAQ:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'FAQ bulunamadı' })
      } else {
        res.status(500).json({ message: 'FAQ konnte nicht gelöscht werden' })
      }
    }
  })

  // Admin: Get categories
  router.get('/admin/categories', requireAdmin, async (req, res) => {
    try {
      const categories = await prisma.fAQ.groupBy({
        by: ['category'],
        where: { isActive: true },
        _count: {
          category: true
        }
      })

      const categoryList = categories.map(cat => ({
        name: cat.category,
        count: cat._count.category
      }))

      res.json(categoryList)
    } catch (error) {
      console.error('Error fetching categories:', error)
      res.status(500).json({ message: 'Kategorien konnten nicht abgerufen werden' })
    }
  })

  // Admin: Reset to default FAQs
  router.post('/admin/reset-defaults', requireAdmin, async (req, res) => {
    try {
      // Delete all existing FAQs
      await prisma.fAQ.deleteMany({})

      // Insert default FAQs
      const defaultFAQs = [
        {
          question: 'Was ist LeadPortal?',
          answer: 'LeadPortal ist eine Plattform für Lead-Management und Auktionen. Unternehmen können hier ihre potenziellen Kunden über ein Auktionssystem verkaufen, und Käufer können qualitativ hochwertige Leads zu wettbewerbsfähigen Preisen erwerben.',
          category: 'general',
          isActive: true,
          sortOrder: 1
        },
        {
          question: 'Wie funktioniert die Plattform?',
          answer: 'Verkäufer laden potenzielle Kundendaten auf die Plattform hoch, Käufer bieten auf diese Leads. Der Käufer mit dem höchsten Gebot erhält Zugriff auf die Lead-Informationen.',
          category: 'general',
          isActive: true,
          sortOrder: 2
        },
        {
          question: 'Ist die Plattform kostenlos?',
          answer: 'Die Grundfunktionen sind kostenlos. Für Premium-Funktionen und erweiterte Analysen stehen kostenpflichtige Pläne zur Verfügung.',
          category: 'general',
          isActive: true,
          sortOrder: 3
        },
        {
          question: 'In welchen Branchen sind Sie tätig?',
          answer: 'Wir sind in Immobilien, Finanzen, E-Commerce, Gesundheit, Bildung und vielen weiteren Branchen tätig. Unsere Plattform verfügt über eine flexible Struktur, die für alle Branchen geeignet ist.',
          category: 'general',
          isActive: true,
          sortOrder: 4
        },
        {
          question: 'Wie kann ich ein Gebot abgeben?',
          answer: 'Nach der Registrierung können Sie auf den gewünschten Lead klicken und über die Schaltfläche "Gebot abgeben" Ihr Gebot eingeben. Der Mindestgebotsbetrag ist für jeden Lead angegeben.',
          category: 'bidding',
          isActive: true,
          sortOrder: 1
        },
        {
          question: 'Wie lange dauert die Gebotsabgabe?',
          answer: 'Jede Auktion hat eine bestimmte Dauer. Diese wird auf der Lead-Detailseite angezeigt. Wenn die Zeit abläuft, gewinnt der Bieter mit dem höchsten Gebot.',
          category: 'bidding',
          isActive: true,
          sortOrder: 2
        },
        {
          question: 'Kann ich mein Gebot zurückziehen?',
          answer: 'Ja, Sie können Ihr Gebot vor Ablauf der Auktionszeit zurückziehen. Für diesen Vorgang gelten jedoch bestimmte Bedingungen.',
          category: 'bidding',
          isActive: true,
          sortOrder: 3
        },
        {
          question: 'Was ist die Mindestgebotserhöhung?',
          answer: 'Für jeden Lead ist eine Mindestgebotserhöhung festgelegt. Dieser Betrag wird auf der Lead-Detailseite als "Min. Erhöhung" angezeigt.',
          category: 'bidding',
          isActive: true,
          sortOrder: 4
        },
        {
          question: 'Wie erstelle ich ein Konto?',
          answer: 'Sie können ein Konto erstellen, indem Sie auf der Startseite auf die Schaltfläche "Registrieren" klicken und Ihre E-Mail-Adresse und Ihr Passwort eingeben. Eine E-Mail-Verifizierung ist erforderlich.',
          category: 'account',
          isActive: true,
          sortOrder: 1
        },
        {
          question: 'Ich habe mein Passwort vergessen, was soll ich tun?',
          answer: 'Sie können auf der Anmeldeseite auf den Link "Passwort vergessen" klicken, um einen Passwort-Reset-Link an Ihre E-Mail-Adresse zu senden.',
          category: 'account',
          isActive: true,
          sortOrder: 2
        },
        {
          question: 'Wie kann ich meine Kontoinformationen aktualisieren?',
          answer: 'Sie können Ihre persönlichen Informationen, Kontaktdaten und Sicherheitseinstellungen auf der Kontoeinstellungsseite aktualisieren.',
          category: 'account',
          isActive: true,
          sortOrder: 3
        },
        {
          question: 'Wie kann ich mein Konto löschen?',
          answer: 'Sie können den Kontolöschungsvorgang auf der Kontoeinstellungsseite starten. Dieser Vorgang kann nicht rückgängig gemacht werden und alle Ihre Daten werden gelöscht.',
          category: 'account',
          isActive: true,
          sortOrder: 4
        },
        {
          question: 'Welche Zahlungsmethoden akzeptieren Sie?',
          answer: 'Wir akzeptieren Kreditkarten, Bankkarten, Überweisungen/SEPA-Überweisungen und digitale Geldbörsen. Alle Zahlungen sind durch sichere SSL-Verschlüsselung geschützt.',
          category: 'payment',
          isActive: true,
          sortOrder: 1
        },
        {
          question: 'Wann wird die Zahlung abgebucht?',
          answer: 'Bei einer gewonnenen Auktion wird die Zahlung sofort abgebucht. Nach Abschluss der Zahlung erhalten Sie Zugriff auf die Lead-Informationen.',
          category: 'payment',
          isActive: true,
          sortOrder: 2
        },
        {
          question: 'Wie ist die Rückerstattungsrichtlinie?',
          answer: 'Nach der Übergabe der Lead-Informationen erfolgt keine Rückerstattung. Bei technischen Problemen wird jedoch innerhalb von 24 Stunden eine Rückerstattung vorgenommen.',
          category: 'payment',
          isActive: true,
          sortOrder: 3
        },
        {
          question: 'Kann ich eine Rechnung erhalten?',
          answer: 'Ja, Sie können für alle Zahlungen eine Rechnung erhalten. Sie können Ihre Rechnungsinformationen in den Kontoeinstellungen aktualisieren.',
          category: 'payment',
          isActive: true,
          sortOrder: 4
        }
      ]

      await prisma.fAQ.createMany({
        data: defaultFAQs
      })

      res.json({ 
        message: 'Standard-FAQs erfolgreich geladen',
        count: defaultFAQs.length
      })
    } catch (error) {
      console.error('Error resetting FAQs:', error)
      res.status(500).json({ message: 'Standard-FAQs konnten nicht geladen werden' })
    }
  })

  return router
}
