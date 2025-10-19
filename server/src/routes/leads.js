import { Router } from 'express'
import { z } from 'zod'

// Lead tipi yetkilendirmesini kontrol eden helper fonksiyon
async function filterLeadsByPermission(prisma, leads, userId, userTypeId) {
  // SUPERADMIN her şeyi görebilir
  if (userTypeId === 'SUPERADMIN') {
    return leads
  }

  // Kullanıcının TÜM özel izinlerini al (hem true hem false)
  const userPermissions = await prisma.userLeadTypePermission.findMany({
    where: { userId }
  })
  
  // Kullanıcı tipinin TÜM izinlerini al (hem true hem false)
  const userTypePermissions = await prisma.leadTypePermission.findMany({
    where: { userTypeId }
  })

  // Kullanıcı özel izinlerini map'e dönüştür
  const userPermissionMap = {}
  userPermissions.forEach(p => {
    userPermissionMap[p.leadType] = p.hasAccess
  })
  
  // User type izinlerini map'e dönüştür
  const userTypePermissionMap = {}
  userTypePermissions.forEach(p => {
    userTypePermissionMap[p.leadType] = p.hasAccess
  })

  // Lead'leri filtrele
  return leads.filter(lead => {
    // insuranceType yoksa veya null ise, göster (default lead)
    if (!lead.insuranceType) return true
    
    const leadType = lead.insuranceType
    
    // 1. Önce kullanıcı özel iznini kontrol et (varsa override eder)
    if (userPermissionMap.hasOwnProperty(leadType)) {
      return userPermissionMap[leadType]
    }
    
    // 2. Kullanıcı özel izin yoksa, user type iznini kontrol et
    if (userTypePermissionMap.hasOwnProperty(leadType)) {
      return userTypePermissionMap[leadType]
    }
    
    // 3. Hiçbir izin tanımı yoksa, default olarak göster
    return true
  })
}

// User bilgilerini anonim hale getir (kendi teklifi değilse)
function anonymizeUser(user, currentUserId = null) {
  if (!user) return null
  
  // Eğer bu kullanıcının kendi teklifi ise gerçek bilgileri döndür
  if (currentUserId && user.id === currentUserId) {
    return user
  }
  
  // Başkalarının teklifleri için anonim bilgiler
  return {
    id: user.id,
    email: '*** ***',
    firstName: '***',
    lastName: '***',
    username: '***',
    userTypeId: user.userTypeId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}

// Bids array'ini anonim hale getir
function anonymizeBids(bids, currentUserId = null) {
  if (!bids) return []
  return bids.map(bid => ({
    ...bid,
    user: anonymizeUser(bid.user, currentUserId)
  }))
}

const createLeadSchema = z.object({
  title: z.string().min(1, 'Başlık zorunlu'),
  description: z.string().min(1, 'Açıklama zorunlu'),
  privateDetails: z.string().max(20000).optional().nullable(),
  startPrice: z.number().int().nonnegative(),
  minIncrement: z.number().int().positive(),
  instantBuyPrice: z.number().int().positive().nullable().optional(),
  insuranceType: z.string().optional().nullable(),
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

  router.get('/', async (req, res) => {
    // Önce süresi dolmuş lead'leri kontrol et ve sat
    await checkAndSellExpiredLeads(prisma, io)
    
    const leads = await prisma.lead.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { bids: { orderBy: { createdAt: 'desc' }, take: 1, include: { user: true } } }
    })
    
    // Lead tipi yetkilendirmesine göre filtrele
    const filteredLeads = await filterLeadsByPermission(
      prisma, 
      leads, 
      req.user?.id, 
      req.user?.userTypeId
    )
    
    // Bids'leri anonim hale getir (kendi teklifleri hariç)
    const anonymizedLeads = filteredLeads.map(lead => {
      const { privateDetails, ...rest } = lead
      return {
        ...rest,
        // Aktif listede özel detay asla görünmez
        privateDetails: null,
        bids: anonymizeBids(lead.bids, req.user?.id)
      }
    })
    
    res.json(anonymizedLeads)
  })

  // Admin: own leads list with bids (MUST be before '/:id')
  router.get('/admin/mine/list', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' })
    const leads = await prisma.lead.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { bids: { orderBy: { createdAt: 'desc' }, include: { user: true } } }
    })
    
    // Lead tipi yetkilendirmesine göre filtrele (admin de göremeyebilir)
    const filteredLeads = await filterLeadsByPermission(
      prisma, 
      leads, 
      req.user?.id, 
      req.user?.userTypeId
    )
    
    // Bids'leri anonim hale getir (kendi teklifleri hariç)
    const anonymizedLeads = filteredLeads.map(lead => ({
      ...lead,
      bids: anonymizeBids(lead.bids, req.user?.id)
    }))
    
    res.json(anonymizedLeads)
  })

  // Admin: all leads with owner and bids
  router.get('/admin/list', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' })
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: { owner: true, bids: { orderBy: { createdAt: 'desc' }, include: { user: true } } }
    })
    
    // Bids'leri anonim hale getir (kendi teklifleri hariç)
    const anonymizedLeads = leads.map(lead => ({
      ...lead,
      bids: anonymizeBids(lead.bids, req.user?.id)
    }))
    
    res.json(anonymizedLeads)
  })

  router.get('/:id', async (req, res) => {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: { 
        bids: { orderBy: { createdAt: 'desc' }, include: { user: true } },
        sale: { select: { buyerId: true } }
      }
    })
    if (!lead) return res.status(404).json({ error: 'Not found' })
    
    // Bids'leri anonim hale getir (kendi teklifleri hariç)
    const isBuyer = !!(lead.sale && req.user?.id && lead.sale.buyerId === req.user.id)
    const isOwner = !!(req.user?.id && lead.ownerId && req.user.id === lead.ownerId)
    const isAdmin = req.user?.userTypeId === 'ADMIN' || req.user?.userTypeId === 'SUPERADMIN'
    const anonymizedLead = {
      ...lead,
      // Özel detay sadece satın alan, sahip veya admin görür
      privateDetails: isBuyer || isOwner || isAdmin ? lead.privateDetails : null,
      bids: anonymizeBids(lead.bids, req.user?.id)
    }
    
    res.json(anonymizedLead)
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
    const { title, description, privateDetails, startPrice, minIncrement, instantBuyPrice, insuranceType, endsAt } = parsed.data
    
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
        privateDetails: privateDetails || null,
        startPrice,
        minIncrement: finalMinIncrement, // Varsayılan değeri kullan
        instantBuyPrice,
        insuranceType: insuranceType || null,
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

