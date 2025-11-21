import { Router } from 'express'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { logActivity, ActivityTypes, extractRequestInfo } from '../utils/activityLogger.js'
import { createNotification } from '../services/notificationService.js'
import { now, createDate } from '../utils/dateTimeUtils.js'
import { calculateFinalPrice, meetsReservePrice } from '../services/proxyBiddingService.js'
import { serializeBigInt } from '../utils/bigIntSerializer.js'

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
// IMPORTANT: Hide maxBid from all users except the bid owner
function anonymizeBids(bids, currentUserId = null) {
  if (!bids) return []
  return bids.map(bid => {
    const isOwnBid = currentUserId && bid.userId === currentUserId
    return {
      ...bid,
      // Hide maxBid from everyone except the bid owner
      maxBid: isOwnBid ? bid.maxBid : undefined,
      user: anonymizeUser(bid.user, currentUserId)
    }
  })
}

const createLeadSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().min(1, 'Beschreibung ist erforderlich'),
  privateDetails: z.string().max(20000).optional().nullable(),
  postalCode: z.string().min(3).max(12).optional().nullable(),
  leadType: z.enum(['AUCTION', 'SOFORT_KAUF']).optional().default('AUCTION'),
  startPrice: z.number().int().nonnegative('Ungültige Eingabe: erwartet int, erhalten number'),
  minIncrement: z.number().int().positive(),
  instantBuyPrice: z.number().int().positive().nullable().optional(),
  insuranceType: z.string().optional().nullable(),
  startsAt: z.string().optional().nullable().transform((v) => v ? createDate(v) : null),
  endsAt: z.string().min(1, 'Endzeit ist erforderlich').transform((v) => createDate(v)),
  isShowcase: z.boolean().optional(),
  isPremium: z.boolean().optional()
})

// Süresi dolmuş lead'leri kontrol et ve en yüksek teklifi veren kişiye sat
// UPDATED FOR PROXY BIDDING: Winner pays visible price, not their maximum
async function checkAndSellExpiredLeads(prisma, io) {
  try {
    const currentTime = now()

    // Süresi dolmuş ve henüz satılmamış lead'leri bul
    const expiredLeads = await prisma.lead.findMany({
      where: {
        isActive: true,
        isSold: false,
        endsAt: {
          lte: currentTime
        }
      },
      include: {
        bids: {
          orderBy: { createdAt: 'desc' },
          include: { user: true }
        }
      }
    })

    for (const lead of expiredLeads) {
      if (lead.bids.length > 0) {
        // Calculate final price using proxy bidding logic
        const finalPriceResult = await calculateFinalPrice(prisma, lead.id)

        if (!finalPriceResult.hasWinner) {
          // No valid bids, mark as inactive
          await prisma.lead.update({
            where: { id: lead.id },
            data: { isActive: false }
          })
          continue
        }

        // Check reserve price
        const reserveMet = meetsReservePrice(finalPriceResult.finalPrice, lead.reservePrice)

        if (!reserveMet) {
          // Reserve price not met, mark as inactive (not sold)
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              isActive: false,
              isSold: false
            }
          })

          // Notify owner that reserve was not met
          await createNotification(
            lead.ownerId,
            'LEAD_NOT_SOLD',
            'Lead hat Mindestpreis nicht erreicht',
            `Der Lead "${lead.title}" wurde nicht verkauft, da der Mindestpreis nicht erreicht wurde. Höchstes Gebot: ${finalPriceResult.finalPrice} TL`,
            { leadId: lead.id, highestBid: finalPriceResult.finalPrice, reservePrice: lead.reservePrice }
          )

          console.log(`Lead not sold (reserve not met): ${lead.title} - highest bid: ${finalPriceResult.finalPrice}, reserve: ${lead.reservePrice}`)
          continue
        }

        // Winner pays the VISIBLE price (not their max bid)
        const saleAmount = finalPriceResult.finalPrice
        const winnerId = finalPriceResult.winnerId

        // Lead'i satış olarak işaretle
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            isActive: false,
            isSold: true
          }
        })

        // Önce mevcut bakiyeyi al
        const currentUser = await prisma.user.findUnique({
          where: { id: winnerId },
          select: { balance: true, email: true }
        })

        const balanceBefore = currentUser.balance
        const balanceAfter = balanceBefore - saleAmount

        // LeadSale kaydı oluştur
        await prisma.leadSale.create({
          data: {
            leadId: lead.id,
            buyerId: winnerId,
            amount: saleAmount, // Visible price, not max bid
            paymentMethod: 'balance',
            balanceBefore: balanceBefore,
            balanceAfter: balanceAfter
          }
        })

        // Bakiyeyi düş
        await prisma.user.update({
          where: { id: winnerId },
          data: {
            balance: {
              decrement: saleAmount
            }
          }
        })

        // Bakiye transaction kaydı oluştur
        await prisma.balanceTransaction.create({
          data: {
            userId: winnerId,
            amount: -saleAmount,
            type: 'PURCHASE_DEDUCT',
            description: `Lead satın alma: ${lead.title}`,
            relatedId: lead.id
          }
        })

        // Socket ile bildirim gönder
        io.emit('lead:sold', {
          leadId: lead.id,
          buyerId: winnerId,
          amount: saleAmount,
          title: lead.title,
          savedAmount: finalPriceResult.savedAmount // How much winner saved
        })

        console.log(`Lead sold: ${lead.title} to ${currentUser.email} for ${saleAmount} TL (max bid: ${finalPriceResult.winnerMaxBid} TL, saved: ${finalPriceResult.savedAmount} TL)`)
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

    const showcaseOnly = req.query.showcase === 'true' || req.query.showcase === '1'
    const leadTypeFilter = req.query.leadType // 'AUCTION' or 'SOFORT_KAUF'

    // Süresi dolmuş leadları göster mi diye kontrol et
    const settings = await prisma.settings.findFirst()
    const showExpiredLeads = settings?.showExpiredLeads || false

    const where = {
      isActive: true
    }
    if (showcaseOnly) {
      where.isShowcase = true
    }
    if (leadTypeFilter && (leadTypeFilter === 'AUCTION' || leadTypeFilter === 'SOFORT_KAUF')) {
      where.leadType = leadTypeFilter
    }

    // Süresi dolmuş/satılmış leadları filtrele (ayar kapalıysa)
    if (!showExpiredLeads) {
      const currentTime = now()
      where.AND = [
        {
          OR: [
            { endsAt: { gt: currentTime } },  // Süresi geçmemiş
            { isSold: false }  // veya satılmamış
          ]
        }
      ]
    }

    const leads = await prisma.lead.findMany({
      where,
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

    // Zamanlanmış leadleri belirle ve sırala
    const currentTime = now()
    const activeLeads = []
    const scheduledLeads = []

    filteredLeads.forEach(lead => {
      const isScheduled = lead.startsAt && new Date(lead.startsAt) > currentTime
      if (isScheduled) {
        scheduledLeads.push({ ...lead, isScheduled: true })
      } else {
        activeLeads.push({ ...lead, isScheduled: false })
      }
    })

    // Aktif leadleri en yeni önce, zamanlanmış leadleri en sona
    const sortedLeads = [...activeLeads, ...scheduledLeads]

    // Bids'leri anonim hale getir (kendi teklifleri hariç)
    const anonymizedLeads = sortedLeads.map(lead => {
      const { privateDetails, ...rest } = lead
      return {
        ...rest,
        // Aktif listede özel detay asla görünmez
        privateDetails: null,
        bids: anonymizeBids(lead.bids, req.user?.id)
      }
    })

    res.json(serializeBigInt(anonymizedLeads))
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
    
    res.json(serializeBigInt(anonymizedLeads))
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
    
    res.json(serializeBigInt(anonymizedLeads))
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

    // // Log activity
    // if (req.user?.id) {
    //   const { ipAddress, userAgent } = extractRequestInfo(req)
    //   await logActivity({
    //     userId: req.user.id,
    //     action: ActivityTypes.VIEW_LEAD,
    //     details: { leadTitle: lead.title },
    //     entityType: 'lead',
    //     entityId: lead.id,
    //     ipAddress,
    //     userAgent
    //   })
    // }

    res.json(serializeBigInt(anonymizedLead))
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

    const { ipAddress, userAgent } = extractRequestInfo(req)

    if (exists) {
      await prisma.leadWatch.delete({ where: { leadId_userId: { leadId: req.params.id, userId: req.user.id } } })

      // Log remove watch
      await logActivity({
        userId: req.user.id,
        action: ActivityTypes.REMOVE_WATCH,
        entityType: 'lead',
        entityId: req.params.id,
        ipAddress,
        userAgent
      })

      return res.json({ watching: false })
    }

    await prisma.leadWatch.create({ data: { leadId: req.params.id, userId: req.user.id } })

    // Log add watch
    await logActivity({
      userId: req.user.id,
      action: ActivityTypes.ADD_WATCH,
      entityType: 'lead',
      entityId: req.params.id,
      ipAddress,
      userAgent
    })

    res.json({ watching: true })
  })

  // Admin create
  router.post('/', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' })
    const parsed = createLeadSchema.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      return res.status(400).json({ error: 'Validierung fehlgeschlagen', issues })
    }
    const { title, description, privateDetails, postalCode, leadType, startPrice, minIncrement, instantBuyPrice, insuranceType, startsAt, endsAt, isShowcase = false } = parsed.data
    
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
    const currentTime = now()
    const year = currentTime.getFullYear()
    const month = String(currentTime.getMonth() + 1).padStart(2, '0')
    const day = String(currentTime.getDate()).padStart(2, '0')
    
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
        postalCode: postalCode || null,
        leadType: leadType || 'AUCTION',
        startPrice,
        minIncrement: finalMinIncrement, // Varsayılan değeri kullan
        instantBuyPrice,
        insuranceType: insuranceType || null,
        startsAt: startsAt || null,
        endsAt,
        isShowcase,
        ownerId: req.user.id
      }
    })

    // Log activity
    const { ipAddress, userAgent } = extractRequestInfo(req)
    await logActivity({
      userId: req.user.id,
      action: ActivityTypes.CREATE_LEAD,
      details: { leadTitle: title, leadId: customId },
      entityType: 'lead',
      entityId: lead.id,
      ipAddress,
      userAgent
    })

    res.status(201).json(lead)
  })

  // Admin update
  router.put('/:id', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' })
    const schema = createLeadSchema.partial().extend({ 
      isActive: z.boolean().optional(),
      description: z.union([z.string().min(1), z.null()]).optional()
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      return res.status(400).json({ error: 'Validierung fehlgeschlagen', issues })
    }
    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: parsed.data
    })

    // Log activity
    const { ipAddress, userAgent } = extractRequestInfo(req)
    await logActivity({
      userId: req.user.id,
      action: ActivityTypes.EDIT_LEAD,
      details: { leadTitle: updated.title },
      entityType: 'lead',
      entityId: req.params.id,
      ipAddress,
      userAgent
    })

    // Canlı yayın: lead güncellendi
    io.to(`lead:${req.params.id}`).emit('lead:update', { leadId: req.params.id, lead: updated })
    res.json(serializeBigInt(updated))
  })

  // Admin delete (cascade bids)
  router.delete('/:id', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' })

    try {
      const lead = await prisma.lead.findUnique({ where: { id: req.params.id } })

      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' })
      }

      // Delete related LeadSale first (since it has foreign key to Lead)
      await prisma.leadSale.deleteMany({ where: { leadId: req.params.id } })

      // Delete the lead (Bid cascades automatically)
      await prisma.lead.delete({ where: { id: req.params.id } })

      // Log activity with deletion reason
      const { ipAddress, userAgent } = extractRequestInfo(req)
      await logActivity({
        userId: req.user.id,
        action: ActivityTypes.DELETE_LEAD,
        details: {
          leadId: lead?.id || req.params.id,
          leadTitle: lead?.title,
          deletionReason: req.body?.deletionReason || 'No reason provided'
        },
        entityType: 'lead',
        entityId: req.params.id,
        ipAddress,
        userAgent
      })

      io.to(`lead:${req.params.id}`).emit('lead:deleted', { leadId: req.params.id })
      res.json({ ok: true })
    } catch (error) {
      console.error('Delete lead error:', error)
      res.status(500).json({ error: error.message || 'Failed to delete lead' })
    }
  })

  // Anında satın alma
  router.post('/:id/instant-buy', async (req, res) => {
    try {
      console.log('=== INSTANT BUY REQUEST ===')
      console.log('Lead ID:', req.params.id)
      console.log('User ID:', req.user?.id)
      console.log('Request body:', req.body)
      
      const leadId = req.params.id
      const userId = req.user.id

      // Kullanıcının bilgilerini al
      const buyer = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          balance: true,
          balanceEnabled: true,
          paymentMethod: true,
          email: true,
          ibanNumber: true,
          ibanAccountHolder: true,
          ibanBic: true,
          ibanAddress: true,
          ibanPostalCode: true,
          ibanCity: true
        }
      })

      if (!buyer) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden' })
      }

      // Lead'i kontrol et
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { bids: { orderBy: { amount: 'desc' }, take: 1 } }
      })

      if (!lead) {
        return res.status(404).json({ error: 'Lead nicht gefunden' })
      }

      if (!lead.isActive) {
        return res.status(400).json({ error: 'Dieser Lead ist nicht mehr aktiv' })
      }

      if (lead.isSold) {
        return res.status(400).json({ error: 'Dieser Lead wurde bereits verkauft' })
      }

      // Aynı lead için daha önce bir satış oluşturulmuş mu?
      const existingSale = await prisma.leadSale.findUnique({ where: { leadId } })
      if (existingSale) {
        return res.status(400).json({ error: 'Dieser Lead wurde bereits verkauft' })
      }

      // Check bidding hours restriction
      const settings = await prisma.settings.findUnique({
        where: { id: 'default' }
      })

      if (settings && settings.enableBiddingHours) {
        const currentTime = new Date()
        const currentHour = currentTime.getHours()
        const currentMinute = currentTime.getMinutes()
        const currentTimeInMinutes = currentHour * 60 + currentMinute

        // Parse start and end hours (format: "HH:MM")
        const [startHour, startMinute] = settings.biddingStartHour.split(':').map(Number)
        const [endHour, endMinute] = settings.biddingEndHour.split(':').map(Number)
        const startTimeInMinutes = startHour * 60 + startMinute
        const endTimeInMinutes = endHour * 60 + endMinute

        // Check if current time is within allowed bidding hours
        if (currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes >= endTimeInMinutes) {
          return res.status(400).json({
            error: `Kaufzeiten sind zwischen ${settings.biddingStartHour} - ${settings.biddingEndHour}. Bitte versuchen Sie es zu diesen Zeiten erneut.`
          })
        }
      }

      // Check if lead is scheduled for future start or has expired
      const serverTime = now()
      if (lead.startsAt && lead.startsAt > serverTime) {
        return res.status(400).json({ error: 'Dieser Lead hat noch nicht begonnen. Sie können kaufen, sobald die Auktion startet.' })
      }

      // Check if lead has expired
      if (lead.endsAt && lead.endsAt < serverTime) {
        return res.status(400).json({ error: 'Dieser Lead ist abgelaufen' })
      }

      // Fiyatı belirle: SOFORT_KAUF için startPrice, AUCTION için instantBuyPrice
      let purchasePrice
      if (lead.leadType === 'SOFORT_KAUF') {
        purchasePrice = lead.startPrice
      } else {
        if (!lead.instantBuyPrice) {
          return res.status(400).json({ error: 'Für diesen Lead wurde kein Sofortkaufpreis festgelegt' })
        }
        purchasePrice = lead.instantBuyPrice
      }

      // Ödeme yöntemi mantığı
      const hasIban = !!buyer.ibanNumber
      const userPreferredBalance = buyer.balanceEnabled && buyer.paymentMethod === 'balance'
      const hasSufficientBalance = buyer.balance >= purchasePrice

      // Karar mantığı:
      // 1. Kullanıcı bakiye tercih etti VE bakiye yeterli → Bakiyeden çek
      // 2. Kullanıcı bakiye tercih etti VE bakiye yetersiz VE IBAN var → IBAN'dan çek
      // 3. Kullanıcı bakiye tercih etti VE bakiye yetersiz VE IBAN yok → Hata
      // 4. Kullanıcı IBAN tercih etti VE IBAN var → IBAN'dan çek
      // 5. Kullanıcı IBAN tercih etti VE IBAN yok → Hata

      let paymentMethod = 'balance'

      if (userPreferredBalance) {
        // Kullanıcı bakiye tercih etti
        if (hasSufficientBalance) {
          paymentMethod = 'balance'
        } else if (hasIban) {
          // Bakiye yetersiz ama IBAN var
          paymentMethod = 'iban'
        } else {
          // Bakiye yetersiz ve IBAN yok
          return res.status(400).json({
            error: 'Bitte fügen Sie Ihre IBAN-Daten hinzu oder laden Sie Guthaben auf.',
            errorType: 'INSUFFICIENT_BALANCE',
            required: purchasePrice,
            available: buyer.balance
          })
        }
      } else {
        // Kullanıcı IBAN tercih etti
        if (hasIban) {
          paymentMethod = 'iban'
        } else {
          return res.status(400).json({
            error: 'Ihre IBAN-Daten sind nicht registriert. Bitte fügen Sie zuerst Ihre IBAN-Daten hinzu.',
            errorType: 'IBAN_NOT_FOUND'
          })
        }
      }

      // Ödeme işlemi
      if (paymentMethod === 'balance') {

        // Önce mevcut bakiyeyi al
        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { balance: true }
        })
        
        const balanceBefore = currentUser.balance
        const balanceAfter = balanceBefore - purchasePrice

        // Transaction ile bakiyeyi düş ve satışı kaydet
        const [sale, updatedUser, balanceTransaction] = await prisma.$transaction([
          // LeadSale kaydı oluştur
          prisma.leadSale.create({
            data: {
              leadId: leadId,
              buyerId: userId,
              amount: purchasePrice,
              paymentMethod: 'balance',
              balanceBefore: balanceBefore,
              balanceAfter: balanceAfter
            }
          }),
          // Bakiyeyi düş
          prisma.user.update({
            where: { id: userId },
            data: {
              balance: {
                decrement: purchasePrice
              }
            }
          }),
          // Bakiye transaction kaydı oluştur
          prisma.balanceTransaction.create({
            data: {
              userId: userId,
              amount: -purchasePrice,
              type: 'PURCHASE_DEDUCT',
              description: `Lead satın alma: ${lead.title}`,
              relatedId: leadId
            }
          }),
          // Lead'i satış olarak işaretle
          prisma.lead.update({
            where: { id: leadId },
            data: {
              isActive: false,
              isSold: true
            }
          })
        ])

        // Activity log
        try {
          const { ipAddress, userAgent } = extractRequestInfo(req)
          await logActivity({
            userId: userId,
            action: ActivityTypes.INSTANT_BUY,
            details: {
              leadId: leadId,
              leadTitle: lead.title,
              amount: purchasePrice,
              paymentMethod: 'balance',
              newBalance: updatedUser.balance
            },
            entityType: 'lead',
            entityId: leadId,
            ipAddress,
            userAgent
          })
        } catch (e) {
          console.error('Activity log error:', e.message)
        }

        // Socket ile bildirim gönder
        io.emit('lead:sold', {
          leadId: leadId,
          buyerId: userId,
          amount: purchasePrice,
          title: lead.title,
          instantBuy: true,
          paymentMethod: 'balance'
        })

        // Bildirim 1: Satın alan kullanıcıya
        try {
          await createNotification(
            userId,
            'LEAD_PURCHASED',
            'Lead gekauft',
            `Sie haben den Lead "${lead.title} (${leadId})" für ${purchasePrice} TL gekauft.`,
            { leadId, saleId: sale.id, amount: purchasePrice }
          )
        } catch (e) {
          console.error('Notification error (LEAD_PURCHASED):', e.message)
        }

        // Bildirim 2: Lead sahibine
        try {
          await createNotification(
            lead.ownerId,
            'LEAD_SOLD',
            'Lead verkauft',
            `Ihr Lead "${lead.title} (${leadId})" wurde für ${purchasePrice} TL verkauft.`,
            { leadId, saleId: sale.id, amount: purchasePrice }
          )
        } catch (e) {
          console.error('Notification error (LEAD_SOLD):', e.message)
        }

        // Bildirim 3: Ödeme bildirimi (satıcıya)
        try {
          await createNotification(
            lead.ownerId,
            'PAYMENT_RECEIVED',
            'Zahlung erhalten',
            `Sie haben ${purchasePrice} TL Zahlung für den Verkauf von "${lead.title} (${leadId})" erhalten.`,
            { leadId, saleId: sale.id, amount: purchasePrice }
          )
        } catch (e) {
          console.error('Notification error (PAYMENT_RECEIVED):', e.message)
        }

        res.json(serializeBigInt({
          success: true,
          message: 'Lead erfolgreich gekauft',
          sale: sale,
          paymentMethod: 'balance',
          newBalance: updatedUser.balance
        }))
      } else if (paymentMethod === 'iban') {
        // IBAN ile ödeme
        const [sale] = await prisma.$transaction([
          // LeadSale kaydı oluştur (PENDING status ile)
          prisma.leadSale.create({
            data: {
              leadId: leadId,
              buyerId: userId,
              amount: purchasePrice,
              paymentMethod: 'iban',
              paymentStatus: 'PENDING',
              balanceBefore: null,
              balanceAfter: null
            }
          }),
          // Lead'i satış olarak işaretle
          prisma.lead.update({
            where: { id: leadId },
            data: {
              isActive: false,
              isSold: true
            }
          })
        ])

        // Activity log
        try {
          const { ipAddress, userAgent } = extractRequestInfo(req)
          await logActivity({
            userId: userId,
            action: ActivityTypes.INSTANT_BUY,
            details: {
              leadId: leadId,
              leadTitle: lead.title,
              amount: purchasePrice,
              paymentMethod: 'iban'
            },
            entityType: 'lead',
            entityId: leadId,
            ipAddress,
            userAgent
          })
        } catch (e) {
          console.error('Activity log error:', e.message)
        }

        // Socket ile bildirim gönder
        io.emit('lead:sold', {
          leadId: leadId,
          buyerId: userId,
          amount: purchasePrice,
          title: lead.title,
          instantBuy: true,
          paymentMethod: 'iban'
        })

        // Admin'lere PAYMENT_PENDING bildirimi gönder
        try {
          const adminUsers = await prisma.user.findMany({
            where: {
              userTypeId: {
                in: ['FULL_ADMIN', 'ADMIN', 'SUPERADMIN']
              }
            }
          })

          for (const admin of adminUsers) {
            await createNotification(
              admin.id,
              'PAYMENT_PENDING',
              'Neue IBAN-Zahlung wartet',
              `${buyer.email} hat ${purchasePrice} TL per IBAN für "${lead.title} (${leadId})" gezahlt. Genehmigung ausstehend.`,
              { leadId, saleId: sale.id, amount: purchasePrice, buyerId: userId, buyerEmail: buyer.email }
            )
          }
        } catch (e) {
          console.error('Notification error (PAYMENT_PENDING):', e.message)
        }

        // Bildirim: Satın alan kullanıcıya (IBAN ile ödeme bekliyor)
        try {
          await createNotification(
            userId,
            'LEAD_PURCHASED',
            'Lead gekauft - Zahlung ausstehend',
            `Sie haben den Lead "${lead.title} (${leadId})" für ${purchasePrice} TL gekauft. IBAN-Zahlung wartet auf Admin-Genehmigung.`,
            { leadId, saleId: sale.id, amount: purchasePrice, paymentStatus: 'PENDING' }
          )
        } catch (e) {
          console.error('Notification error (LEAD_PURCHASED):', e.message)
        }

        // Bildirim: Lead sahibine
        try {
          await createNotification(
            lead.ownerId,
            'LEAD_SOLD',
            'Lead verkauft - Zahlung ausstehend',
            `Ihr Lead "${lead.title} (${leadId})" wurde für ${purchasePrice} TL verkauft. IBAN-Zahlung wartet auf Admin-Genehmigung.`,
            { leadId, saleId: sale.id, amount: purchasePrice, paymentStatus: 'PENDING' }
          )
        } catch (e) {
          console.error('Notification error (LEAD_SOLD):', e.message)
        }

        res.json(serializeBigInt({
          success: true,
          message: 'Lead erfolgreich gekauft - Zahlung wird per IBAN verarbeitet',
          sale: sale,
          paymentMethod: 'iban',
          paymentStatus: 'PENDING'
        }))
      }

    } catch (error) {
      console.error('=== INSTANT BUY ERROR ===')
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      console.error('Lead ID:', req.params.id)
      console.error('User ID:', req.user?.id)
      // Unique constraint (leadId) ihlali: lead zaten satılmış
      if (error?.code === 'P2002' && Array.isArray(error?.meta?.target) && error.meta.target.includes('leadId')) {
        return res.status(400).json({ error: 'Dieser Lead wurde bereits verkauft' })
      }
      res.status(500).json({ error: 'Sofortkauf fehlgeschlagen', errorMessage: error.message })
    }
  })

  // Formleadport entegrasyonu - form verilerini çek
  router.get('/formleadport-data/:formId', async (req, res) => {
    try {
      const { formId } = req.params
      
      // Formleadport API'sine istek gönder
      const formleadportUrl = process.env.FORMLEADPORT_URL || 'https://15935test.leadport.de'
      
      // Farklı endpoint'ler deneyelim
      const possibleEndpoints = [
        `/api/form-data/${formId}/`,
        `/api/forms/${formId}/`,
        `/api/form/${formId}/`,
        `/api/data/${formId}/`,
        `/form-data/${formId}/`,
        `/forms/${formId}/`
      ]
      
      const apiUrl = `${formleadportUrl}${possibleEndpoints[0]}`
      console.log('apiUrl:', apiUrl)
      console.log('Trying endpoint:', possibleEndpoints[0])
      // JWT token oluştur (formleadport için)
      const jwtSecret = process.env.FORMLEADPORT_JWT_SECRET || 'your-secret-key-change-this-in-production'
      console.log('jwtSecret:' ,jwtSecret)
      const token = jwt.sign(
        { 
          source: 'leadportal',
          timestamp: Date.now()
        },
        jwtSecret,
        { expiresIn: '1h' }
      )
      
      // Formleadport'a istek gönder
      console.log('Sending request to:', apiUrl)
      console.log('Using token:', token.substring(0, 20) + '...')
      
      // Client IP adresini al - rate limiting bypass için farklı IP'ler deneyelim
      const originalIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '127.0.0.1'
      
      // Rate limiting bypass için farklı IP'ler
      const bypassIPs = [
        originalIP,
        '127.0.0.1',
        '::1',
        '10.0.0.1',
        '192.168.1.1',
        '8.8.8.8'
      ]
      
      const clientIP = bypassIPs[0] // İlk IP'yi dene
      console.log('Original IP:', originalIP)
      console.log('Using IP:', clientIP)
      
      // Rate limiting bypass için farklı header kombinasyonları dene
      const headerSets = [
        {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'X-Forwarded-For': clientIP,
          'X-Real-IP': clientIP,
          'X-Client-IP': clientIP,
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-Host': '15935test.leadport.de'
        },
        {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'curl/7.68.0',
          'Accept': 'application/json',
          'X-Forwarded-For': '127.0.0.1',
          'X-Real-IP': '127.0.0.1'
        },
        {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'LeadPortal/1.0',
          'Accept': 'application/json'
        }
      ]
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headerSets[0], // İlk header setini dene
        timeout: 30000  // 30 saniye timeout
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ 
            success: false, 
            error: 'Form bulunamadı' 
          })
        } else if (response.status === 401) {
          return res.status(401).json({ 
            success: false, 
            error: 'Yetkilendirme hatası' 
          })
        } else if (response.status === 429) {
          return res.status(429).json({ 
            success: false, 
            error: 'Çok fazla istek gönderildi, lütfen bekleyin' 
          })
        } else {
          console.log('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            headers: Object.fromEntries(response.headers.entries())
          })
          
          // Response body'yi oku
          let errorBody = ''
          try {
            errorBody = await response.text()
            console.log('Error Response Body:', errorBody.substring(0, 500))
          } catch (e) {
            console.log('Could not read error response body:', e.message)
          }
          
          return res.status(response.status).json({ 
            success: false, 
            error: `Formleadport API hatası: ${response.status} ${response.statusText}`,
            details: errorBody.substring(0, 200)
          })
        }
      }
      
      const data = await response.json()
      
      if (data.success) {
        res.json(serializeBigInt({
          success: true,
          data: data.data
        }))
      } else {
        res.status(400).json({
          success: false,
          error: data.error || 'Form verileri alınamadı'
        })
      }
      
    } catch (error) {
      console.error('Formleadport API error:', error)
      res.status(500).json({
        success: false,
        error: 'Formleadport bağlantı hatası'
      })
    }
  })

  return router
}
