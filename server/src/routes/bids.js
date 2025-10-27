import { Router } from 'express'
import { z } from 'zod'
import { sendAppEmail } from '../utils/mailer.js'
import { renderEmailTemplate } from '../utils/emailTemplateRenderer.js'
import { logActivity, ActivityTypes, extractRequestInfo } from '../utils/activityLogger.js'
import { createNotification } from '../services/notificationService.js'
import { getServerTime, getServerTimestamp } from '../utils/serverTime.js'

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

const bidSchema = z.object({
  leadId: z.string().min(1),
  amount: z.number().int().positive()
})

export default function bidsRouter(prisma, io) {
  const router = Router()

  router.post('/', async (req, res) => {
    const parsed = bidSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Ungültige Eingabe' })
    const { leadId, amount } = parsed.data

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { bids: { orderBy: { createdAt: 'desc' }, take: 1 } } })
    if (!lead || !lead.isActive) return res.status(400).json({ error: 'Lead ist nicht aktiv' })

    const current = lead.bids[0]?.amount ?? lead.startPrice
    const minNext = current + lead.minIncrement
    if (amount < minNext) {
      return res.status(400).json({ error: `Mindestgebot ist ${minNext}` })
    }

    const previousTopBid = lead.bids[0] || null
    const bid = await prisma.bid.create({ data: { amount, leadId, userId: req.user.id }, include: { user: true } })

    // Activity log
    try {
      const { ipAddress, userAgent } = extractRequestInfo(req)
      await logActivity({
        userId: req.user.id,
        action: ActivityTypes.CREATE_BID,
        details: { amount, leadTitle: lead.title },
        entityType: 'bid',
        entityId: bid.id,
        ipAddress,
        userAgent
      })
    } catch (e) {
      console.error('Activity log error:', e.message)
    }

    // Socket için anonim bid oluştur (tüm kullanıcılar için anonim)
    const anonymizedBid = {
      ...bid,
      user: anonymizeUser(bid.user)
    }

    io.to(`lead:${leadId}`).emit('bid:new', { leadId, bid: anonymizedBid })

    // Bildirim 1: Teklif veren kullanıcıya
    try {
      await createNotification(
        req.user.id,
        'BID_PLACED',
        'Teklifiniz Alındı',
        `${lead.title} için ${amount} TL teklif verdiniz.`,
        { leadId, bidId: bid.id, amount }
      )
    } catch (e) {
      console.error('Notification error (BID_PLACED):', e.message)
    }

    // Bildirim 2: Lead sahibine
    try {
      if (lead.ownerId !== req.user.id) {
        await createNotification(
          lead.ownerId,
          'BID_RECEIVED',
          'Yeni Teklif Geldi',
          `"${lead.title}" için ${amount} TL teklif geldi.`,
          { leadId, bidId: bid.id, amount }
        )
      }
    } catch (e) {
      console.error('Notification error (BID_RECEIVED):', e.message)
    }

    // E-posta: Teklif verene bilgilendirme gönder
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } })
      if (user?.email) {
        const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
        const companyName = settings?.companyName || 'LeadPortal'
        const leadUrl = process.env.APP_ORIGIN ? `${process.env.APP_ORIGIN}/lead/${leadId}` : ''
        
        const { subject, html, text } = await renderEmailTemplate('bidReceived', {
          companyName,
          leadTitle: lead.title,
          amount,
          currency: 'TL',
          leadUrl,
          year: getServerTime().getFullYear(),
          userName: user.username || user.firstName || user.email.split('@')[0],
          userEmail: user.email,
          newAmount: amount
        })
        
        await sendAppEmail({ to: user.email, subject, text, html })
      }
    } catch (e) {
      console.error('Bid email send error:', e.message)
    }

    // Bildirim 3: Önceki en yüksek teklifi veren kullanıcıya (outbid)
    try {
      if (previousTopBid && previousTopBid.userId !== req.user.id) {
        await createNotification(
          previousTopBid.userId,
          'BID_OUTBID',
          'Teklifiniz Geçildi',
          `"${lead.title}" için teklifiniz geçildi. Yeni teklif: ${amount} TL`,
          { leadId, bidId: bid.id, amount, previousAmount: previousTopBid.amount }
        )
      }
    } catch (e) {
      console.error('Notification error (BID_OUTBID):', e.message)
    }

    // Outbid: önceki en yüksek teklifi veren kullanıcıya haber ver
    try {
      if (previousTopBid && previousTopBid.userId !== req.user.id) {
        const outbidUser = await prisma.user.findUnique({ where: { id: previousTopBid.userId } })
        if (outbidUser?.email) {
          const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
          const companyName = settings?.companyName || 'LeadPortal'
          const leadUrl = process.env.APP_ORIGIN ? `${process.env.APP_ORIGIN}/lead/${leadId}` : ''
          
          const { subject, html, text } = await renderEmailTemplate('outbid', {
            companyName,
            leadTitle: lead.title,
            amount: previousTopBid.amount,
            newAmount: amount,
            currency: 'TL',
            leadUrl,
            year: getServerTime().getFullYear(),
            userName: outbidUser.username || outbidUser.firstName || outbidUser.email.split('@')[0],
            userEmail: outbidUser.email
          })
          
          await sendAppEmail({ to: outbidUser.email, subject, text, html })
        }
      }
    } catch (e) {
      console.error('Outbid email send error:', e.message)
    }

    // Watchers: bu lead'i izleyen herkese bildirim
    try {
      const watchers = await prisma.leadWatch.findMany({ where: { leadId }, include: { user: true } })
      const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
      const companyName = settings?.companyName || 'LeadPortal'
      const leadUrl = process.env.APP_ORIGIN ? `${process.env.APP_ORIGIN}/lead/${leadId}` : ''
      
      await Promise.all(
        watchers
          .filter(w => w.userId !== req.user.id) // kendisine iki mail gitmesin
          .map(async (w) => {
            if (!w.user?.email) return
            
            const { subject, html, text } = await renderEmailTemplate('outbid', {
              companyName,
              leadTitle: lead.title,
              amount: previousTopBid?.amount || lead.startPrice,
              newAmount: amount,
              currency: 'TL',
              leadUrl,
              year: getServerTime().getFullYear(),
              userName: w.user.username || w.user.firstName || w.user.email.split('@')[0],
              userEmail: w.user.email
            })
            
            await sendAppEmail({ to: w.user.email, subject, text, html })
          })
      )
    } catch (e) {
      console.error('Watcher email send error:', e.message)
    }

    // Response için kendi teklifini gören kullanıcı için gerçek bilgiler
    const responseBid = {
      ...bid,
      user: anonymizeUser(bid.user, req.user.id)
    }
    
    res.status(201).json(responseBid)
  })

  return router
}

