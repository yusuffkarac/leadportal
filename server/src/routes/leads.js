import { Router } from 'express'
import { z } from 'zod'

const createLeadSchema = z.object({
  title: z.string().min(1, 'Başlık zorunlu'),
  description: z.string().min(1, 'Açıklama zorunlu'),
  startPrice: z.number().int().nonnegative(),
  minIncrement: z.number().int().positive(),
  instantBuyPrice: z.number().int().positive().nullable().optional(),
  endsAt: z.string().min(1, 'Bitiş zamanı zorunlu').transform((v) => new Date(v))
})

// Süresi dolmuş lead'leri kontrol et ve en yüksek teklifi veren kişiye sat
async function checkAndSellExpiredLeads(prisma, io) {
  try {
    const now = new Date()
    
    // Süresi dolmuş ve henüz satılmamış lead'leri bul
    const expiredLeads = await prisma.lead.findMany({
      where: {
        isActive: true,
        isSold: false,
        endsAt: {
          lte: now
        }
      },
      include: {
        bids: {
          orderBy: { amount: 'desc' },
          take: 1,
          include: { user: true }
        }
      }
    })

    for (const lead of expiredLeads) {
      if (lead.bids.length > 0) {
        const highestBid = lead.bids[0]
        
        // Lead'i satış olarak işaretle
        await prisma.lead.update({
          where: { id: lead.id },
          data: { 
            isActive: false,
            isSold: true
          }
        })

        // LeadSale kaydı oluştur
        await prisma.leadSale.create({
          data: {
            leadId: lead.id,
            buyerId: highestBid.userId,
            amount: highestBid.amount
          }
        })

        // Socket ile bildirim gönder
        io.emit('lead:sold', {
          leadId: lead.id,
          buyerId: highestBid.userId,
          amount: highestBid.amount,
          title: lead.title
        })

        console.log(`Lead sold: ${lead.title} to ${highestBid.user.email} for ${highestBid.amount}`)
      } else {
        // Teklif yoksa lead'i pasif yap
        await prisma.lead.update({
          where: { id: lead.id },
          data: { isActive: false }
        })
      }
    }
  } catch (error) {
    console.error('Error checking expired leads:', error)
  }
}

export default function leadsRouter(prisma, io) {
  const router = Router()

  router.get('/', async (_req, res) => {
    // Önce süresi dolmuş lead'leri kontrol et ve sat
    await checkAndSellExpiredLeads(prisma, io)
    
    const leads = await prisma.lead.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { bids: { orderBy: { createdAt: 'desc' }, take: 1 } }
    })
    res.json(leads)
  })

  // Admin: own leads list with bids (MUST be before '/:id')
  router.get('/admin/mine/list', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' })
    const leads = await prisma.lead.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { bids: { orderBy: { createdAt: 'desc' }, include: { user: true } } }
    })
    res.json(leads)
  })

  // Admin: all leads with owner and bids
  router.get('/admin/list', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' })
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: { owner: true, bids: { orderBy: { createdAt: 'desc' }, include: { user: true } } }
    })
    res.json(leads)
  })

  router.get('/:id', async (req, res) => {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: { bids: { orderBy: { createdAt: 'desc' }, include: { user: true } } }
    })
    if (!lead) return res.status(404).json({ error: 'Not found' })
    res.json(lead)
  })

  // Watch: list current watchers for the lead (current user)
  router.get('/:id/watch', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    const exists = await prisma.leadWatch.findUnique({ where: { leadId_userId: { leadId: req.params.id, userId: req.user.id } } })
    res.json({ watching: !!exists })
  })

  // Watch: toggle on/off for current user
  router.post('/:id/watch', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    const exists = await prisma.leadWatch.findUnique({ where: { leadId_userId: { leadId: req.params.id, userId: req.user.id } } })
    if (exists) {
      await prisma.leadWatch.delete({ where: { leadId_userId: { leadId: req.params.id, userId: req.user.id } } })
      return res.json({ watching: false })
    }
    await prisma.leadWatch.create({ data: { leadId: req.params.id, userId: req.user.id } })
    res.json({ watching: true })
  })

  // Admin create
  router.post('/', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' })
    const parsed = createLeadSchema.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      return res.status(400).json({ error: 'Validation failed', issues })
    }
    const { title, description, startPrice, minIncrement, instantBuyPrice, endsAt } = parsed.data
    
    // Ayarlardan ID formatını ve varsayılan değerleri al
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })
    if (!settings) {
      settings = {
        leadIdFormat: 'numeric',
        customFormat: 'L{YYYY}{MM}{DD}-{NUM}',
        leadPrefix: 'LEAD',
        startingNumber: 1,
        numberType: 'sequential',
        defaultMinIncrement: 10
      }
    }

    // Varsayılan değerleri kullan (eğer gönderilmemişse)
    const finalMinIncrement = minIncrement || settings.defaultMinIncrement

    // Mevcut lead sayısını al
    const leadCount = await prisma.lead.count()
    
    // Yeni ID oluştur
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    
    let num
    if (settings.numberType === 'random') {
      // Rastgele sayı (1000-9999 arası)
      num = Math.floor(Math.random() * 9000) + 1000
    } else {
      // Sıralı sayı
      num = settings.startingNumber + leadCount
    }
    
    let customId
    switch (settings.leadIdFormat) {
      case 'numeric':
        customId = num.toString()
        break
      case 'prefixed-numeric':
        customId = `${settings.leadPrefix}-${num}`
        break
      case 'date-numeric':
        customId = `${year}${month}${day}-${num}`
        break
      case 'custom':
        customId = settings.customFormat
          .replace('{YYYY}', year)
          .replace('{MM}', month)
          .replace('{DD}', day)
          .replace('{NUM}', num)
          .replace('{PREFIX}', settings.leadPrefix)
        break
      default:
        customId = num.toString()
    }

    const lead = await prisma.lead.create({
      data: {
        id: customId, // Özel ID kullan
        title,
        description,
        startPrice,
        minIncrement: finalMinIncrement, // Varsayılan değeri kullan
        instantBuyPrice,
        endsAt,
        ownerId: req.user.id
      }
    })
    res.status(201).json(lead)
  })

  // Admin update
  router.put('/:id', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' })
    const schema = createLeadSchema.partial().extend({ isActive: z.boolean().optional() })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      return res.status(400).json({ error: 'Validation failed', issues })
    }
    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: parsed.data
    })
    // Canlı yayın: lead güncellendi
    io.to(`lead:${req.params.id}`).emit('lead:update', { leadId: req.params.id, lead: updated })
    res.json(updated)
  })

  // Admin delete (cascade bids)
  router.delete('/:id', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' })
    await prisma.lead.delete({ where: { id: req.params.id } })
    io.to(`lead:${req.params.id}`).emit('lead:deleted', { leadId: req.params.id })
    res.json({ ok: true })
  })

  // Anında satın alma
  router.post('/:id/instant-buy', async (req, res) => {
    try {
      const leadId = req.params.id
      const userId = req.user.id

      // Lead'i kontrol et
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { bids: { orderBy: { amount: 'desc' }, take: 1 } }
      })

      if (!lead) {
        return res.status(404).json({ error: 'Lead bulunamadı' })
      }

      if (!lead.isActive) {
        return res.status(400).json({ error: 'Bu lead artık aktif değil' })
      }

      if (lead.isSold) {
        return res.status(400).json({ error: 'Bu lead zaten satılmış' })
      }

      if (!lead.instantBuyPrice) {
        return res.status(400).json({ error: 'Bu lead için anında satın alma fiyatı belirlenmemiş' })
      }

      // Lead'i satış olarak işaretle
      await prisma.lead.update({
        where: { id: leadId },
        data: { 
          isActive: false,
          isSold: true
        }
      })

      // LeadSale kaydı oluştur
      const sale = await prisma.leadSale.create({
        data: {
          leadId: leadId,
          buyerId: userId,
          amount: lead.instantBuyPrice
        }
      })

      // Socket ile bildirim gönder
      io.emit('lead:sold', {
        leadId: leadId,
        buyerId: userId,
        amount: lead.instantBuyPrice,
        title: lead.title,
        instantBuy: true
      })

      res.json({ 
        success: true, 
        message: 'Lead başarıyla satın alındı',
        sale: sale
      })

    } catch (error) {
      console.error('Error in instant buy:', error)
      res.status(500).json({ error: 'Anında satın alma işlemi başarısız' })
    }
  })

  return router
}

