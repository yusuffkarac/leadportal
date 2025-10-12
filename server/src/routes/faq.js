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
      res.status(500).json({ message: 'FAQ\'lar alınamadı' })
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
      res.status(500).json({ message: 'FAQ\'lar alınamadı' })
    }
  })

  // Admin: Get single FAQ
  router.get('/admin/:id', requireAdmin, async (req, res) => {
    try {
      const faq = await prisma.fAQ.findUnique({
        where: { id: req.params.id }
      })
      
      if (!faq) {
        return res.status(404).json({ message: 'FAQ bulunamadı' })
      }
      
      res.json(faq)
    } catch (error) {
      console.error('Error fetching FAQ:', error)
      res.status(500).json({ message: 'FAQ alınamadı' })
    }
  })

  // Admin: Create new FAQ
  router.post('/admin', requireAdmin, async (req, res) => {
    try {
      const { question, answer, category, isActive, sortOrder } = req.body

      if (!question || !answer || !category) {
        return res.status(400).json({ message: 'Soru, cevap ve kategori gerekli' })
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

      res.json({ message: 'FAQ başarıyla oluşturuldu', faq })
    } catch (error) {
      console.error('Error creating FAQ:', error)
      res.status(500).json({ message: 'FAQ oluşturulamadı' })
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

      res.json({ message: 'FAQ başarıyla güncellendi', faq })
    } catch (error) {
      console.error('Error updating FAQ:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'FAQ bulunamadı' })
      } else {
        res.status(500).json({ message: 'FAQ güncellenemedi' })
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

      res.json({ message: 'FAQ başarıyla silindi' })
    } catch (error) {
      console.error('Error deleting FAQ:', error)
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'FAQ bulunamadı' })
      } else {
        res.status(500).json({ message: 'FAQ silinemedi' })
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
      res.status(500).json({ message: 'Kategoriler alınamadı' })
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
          question: 'LeadPortal nedir?',
          answer: 'LeadPortal, potansiyel müşteri yönetimi ve açık artırma platformudur. İşletmeler burada potansiyel müşterilerini açık artırma yöntemiyle satabilir ve alıcılar da rekabetçi fiyatlarla kaliteli lead\'ler satın alabilir.',
          category: 'general',
          isActive: true,
          sortOrder: 1
        },
        {
          question: 'Platform nasıl çalışır?',
          answer: 'Satıcılar potansiyel müşteri bilgilerini platforma yükler, alıcılar bu lead\'ler için teklif verir. En yüksek teklifi veren alıcı, lead bilgilerine erişim hakkı kazanır.',
          category: 'general',
          isActive: true,
          sortOrder: 2
        },
        {
          question: 'Platform ücretsiz mi?',
          answer: 'Temel özellikler ücretsizdir. Premium özellikler ve gelişmiş analitikler için ücretli planlarımız bulunmaktadır.',
          category: 'general',
          isActive: true,
          sortOrder: 3
        },
        {
          question: 'Hangi sektörlerde hizmet veriyorsunuz?',
          answer: 'Emlak, finans, e-ticaret, sağlık, eğitim ve daha birçok sektörde hizmet vermekteyiz. Platformumuz tüm sektörlere uygun esnek yapıya sahiptir.',
          category: 'general',
          isActive: true,
          sortOrder: 4
        },
        {
          question: 'Nasıl teklif verebilirim?',
          answer: 'Üye olduktan sonra istediğiniz lead için \'Teklif Ver\' butonuna tıklayarak teklifinizi girebilirsiniz. Minimum teklif miktarı her lead için belirtilmiştir.',
          category: 'bidding',
          isActive: true,
          sortOrder: 1
        },
        {
          question: 'Teklif verme süresi ne kadar?',
          answer: 'Her açık artırmanın belirli bir süresi vardır. Bu süre lead detay sayfasında görüntülenir. Süre dolduğunda en yüksek teklifi veren kazanır.',
          category: 'bidding',
          isActive: true,
          sortOrder: 2
        },
        {
          question: 'Teklifimi geri çekebilir miyim?',
          answer: 'Evet, açık artırma süresi dolmadan önce teklifinizi geri çekebilirsiniz. Ancak bu işlem için belirli koşullar geçerlidir.',
          category: 'bidding',
          isActive: true,
          sortOrder: 3
        },
        {
          question: 'Minimum teklif artışı nedir?',
          answer: 'Her lead için minimum teklif artışı belirlenmiştir. Bu miktar lead detay sayfasında \'Min. Artış\' olarak gösterilir.',
          category: 'bidding',
          isActive: true,
          sortOrder: 4
        },
        {
          question: 'Hesabımı nasıl oluştururum?',
          answer: 'Ana sayfadaki \'Kayıt Ol\' butonuna tıklayarak e-posta adresiniz ve şifrenizle hesap oluşturabilirsiniz. E-posta doğrulaması gereklidir.',
          category: 'account',
          isActive: true,
          sortOrder: 1
        },
        {
          question: 'Şifremi unuttum, ne yapmalıyım?',
          answer: 'Giriş sayfasında \'Şifremi Unuttum\' linkine tıklayarak e-posta adresinize şifre sıfırlama bağlantısı gönderebilirsiniz.',
          category: 'account',
          isActive: true,
          sortOrder: 2
        },
        {
          question: 'Hesap bilgilerimi nasıl güncelleyebilirim?',
          answer: 'Hesap ayarları sayfasından kişisel bilgilerinizi, iletişim bilgilerinizi ve güvenlik ayarlarınızı güncelleyebilirsiniz.',
          category: 'account',
          isActive: true,
          sortOrder: 3
        },
        {
          question: 'Hesabımı nasıl silebilirim?',
          answer: 'Hesap ayarları sayfasından hesap silme işlemini başlatabilirsiniz. Bu işlem geri alınamaz ve tüm verileriniz silinir.',
          category: 'account',
          isActive: true,
          sortOrder: 4
        },
        {
          question: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?',
          answer: 'Kredi kartı, banka kartı, havale/EFT ve dijital cüzdan ödemelerini kabul ediyoruz. Tüm ödemeler güvenli SSL şifreleme ile korunur.',
          category: 'payment',
          isActive: true,
          sortOrder: 1
        },
        {
          question: 'Ödeme ne zaman alınır?',
          answer: 'Kazandığınız bir açık artırmada ödeme hemen alınır. Ödeme işlemi tamamlandıktan sonra lead bilgilerine erişim sağlanır.',
          category: 'payment',
          isActive: true,
          sortOrder: 2
        },
        {
          question: 'İade politikası nedir?',
          answer: 'Lead bilgileri teslim edildikten sonra iade yapılmaz. Ancak teknik sorunlar durumunda 24 saat içinde iade işlemi gerçekleştirilir.',
          category: 'payment',
          isActive: true,
          sortOrder: 3
        },
        {
          question: 'Fatura alabilir miyim?',
          answer: 'Evet, tüm ödemeler için fatura alabilirsiniz. Fatura bilgilerinizi hesap ayarlarından güncelleyebilirsiniz.',
          category: 'payment',
          isActive: true,
          sortOrder: 4
        }
      ]

      await prisma.fAQ.createMany({
        data: defaultFAQs
      })

      res.json({ 
        message: 'Varsayılan FAQ\'lar başarıyla yüklendi',
        count: defaultFAQs.length
      })
    } catch (error) {
      console.error('Error resetting FAQs:', error)
      res.status(500).json({ message: 'Varsayılan FAQ\'lar yüklenemedi' })
    }
  })

  return router
}
