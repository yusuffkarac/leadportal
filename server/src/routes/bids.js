import { Router } from 'express'
import { z } from 'zod'
import { sendAppEmail } from '../utils/mailer.js'
import { renderEmailTemplate } from '../utils/emailTemplateRenderer.js'
import { logActivity, ActivityTypes, extractRequestInfo } from '../utils/activityLogger.js'
import { createNotification } from '../services/notificationService.js'
import { now, currentYear } from '../utils/dateTimeUtils.js'
import {
  processProxyBid,
  meetsReservePrice,
  checkAntiSnipe,
  sanitizeBidForUser
} from '../services/proxyBiddingService.js'

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

// Proxy Bidding: maxBid is now required
const bidSchema = z.object({
  leadId: z.string().min(1),
  maxBid: z.number().int().positive() // User's maximum bid (hidden)
})

export default function bidsRouter(prisma, io) {
  const router = Router()

  router.post('/', async (req, res) => {
    try {
      const parsed = bidSchema.safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: 'Ungültige Eingabe' })
      const { leadId, maxBid } = parsed.data

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
            error: `Teklif verme saatleri ${settings.biddingStartHour} - ${settings.biddingEndHour} arasındadır. Lütfen bu saatler arasında tekrar deneyin.`
          })
        }
      }

      // Fetch lead with all necessary data
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          bids: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { user: true }
          },
          owner: true
        }
      })

      if (!lead || !lead.isActive) {
        return res.status(400).json({ error: 'Lead ist nicht aktiv' })
      }

      // Check if lead has expired using server time
      const currentTime = now()
      if (lead.endsAt < currentTime) {
        return res.status(400).json({ error: 'Bu lead\'in süresi dolmuştur' })
      }

      // Check if lead is scheduled for future start
      if (lead.startsAt && lead.startsAt > currentTime) {
        return res.status(400).json({ error: 'Bu lead henüz başlamamıştır. Açık artırma başladığında teklif verebilirsiniz.' })
      }

      // Validate minimum bid requirement
      const currentVisibleBid = lead.bids[0]?.amount ?? lead.startPrice
      const minRequired = currentVisibleBid + lead.minIncrement

      if (maxBid < minRequired) {
        return res.status(400).json({
          error: `Minimum teklif ${minRequired} olmalı. Bu sizin maksimum teklifinizdir - görünür fiyat daha düşük olabilir.`
        })
      }

      // Process the proxy bid
      const proxyResult = await processProxyBid(prisma, leadId, req.user.id, maxBid, lead)

      if (!proxyResult.success) {
        return res.status(400).json({ error: proxyResult.message || 'Teklif işlenemedi' })
      }

      // Check reserve price
      const reserveMet = meetsReservePrice(proxyResult.visiblePrice, lead.reservePrice)

      // Check anti-sniping
      const antiSnipeResult = checkAntiSnipe(lead.endsAt, lead.antiSnipeSeconds)

      // If anti-sniping triggered, extend auction
      if (antiSnipeResult.shouldExtend) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { endsAt: antiSnipeResult.newEndsAt }
        })

        // Notify all watchers about extension
        io.to(`lead:${leadId}`).emit('lead:extended', {
          leadId,
          newEndsAt: antiSnipeResult.newEndsAt,
          extensionSeconds: antiSnipeResult.extensionSeconds
        })
      }

      // Activity log for user's bid
      try {
        const { ipAddress, userAgent } = extractRequestInfo(req)
        await logActivity({
          userId: req.user.id,
          action: ActivityTypes.CREATE_BID,
          details: {
            maxBid,
            visiblePrice: proxyResult.visiblePrice,
            isLeader: proxyResult.isLeader,
            leadTitle: lead.title
          },
          entityType: 'bid',
          entityId: proxyResult.userBid.id,
          ipAddress,
          userAgent
        })
      } catch (e) {
        console.error('Activity log error:', e.message)
      }

      // Eğer leaderAutoBid varsa, otomatik teklif için ayrıca activity log kaydı oluştur
      if (proxyResult.leaderAutoBid) {
        try {
          const { ipAddress, userAgent } = extractRequestInfo(req)
          await logActivity({
            userId: proxyResult.leaderAutoBid.userId, // mevcut liderin id'si
            action: ActivityTypes.CREATE_BID,
            details: {
              isAuto: true,
              visiblePrice: proxyResult.leaderAutoBid.amount,
              leadTitle: lead.title
            },
            entityType: 'bid',
            entityId: proxyResult.leaderAutoBid.id,
            ipAddress,
            userAgent
          })
        } catch (e) {
          console.error('Activity log error (auto-bid):', e.message)
        }
      }

      // Emit socket event for the visible bid change
      // Show the most recent bid (which has the current visible price)
      const latestBid = proxyResult.leaderAutoBid || proxyResult.userBid
      const anonymizedBid = {
        ...latestBid,
        maxBid: null, // Never expose max bid via socket
        user: anonymizeUser(latestBid.user)
      }

      console.log('[Socket] Emitting bid:new to room lead:' + leadId, {
        leadId,
        bidAmount: anonymizedBid.amount,
        userId: anonymizedBid.user?.id
      })

      io.to(`lead:${leadId}`).emit('bid:new', {
        leadId,
        bid: anonymizedBid,
        reserveMet
      })

      // Notification 1: Teklif veren kullanıcıya
      try {
        let notificationMessage = `${lead.title} için maksimum ${maxBid} TL teklif verdiniz.`

        if (proxyResult.isLeader) {
          notificationMessage += ` Şu anda lidersiniz! Mevcut fiyat: ${proxyResult.visiblePrice} TL.`
        } else {
          notificationMessage += ` Teklifiniz başka bir kullanıcının maksimumunun altında kaldı. Lider olmak için daha yüksek bir maksimum teklif verin.`
        }

        if (!reserveMet) {
          notificationMessage += ` Not: Rezerv fiyat henüz karşılanmadı.`
        }

        await createNotification(
          req.user.id,
          'BID_PLACED',
          'Teklifiniz Alındı',
          notificationMessage,
          {
            leadId,
            bidId: proxyResult.userBid.id,
            maxBid,
            visiblePrice: proxyResult.visiblePrice,
            isLeader: proxyResult.isLeader
          }
        )
      } catch (e) {
        console.error('Notification error (BID_PLACED):', e.message)
      }

      // Notification 2: Lead sahibine
      try {
        if (lead.ownerId !== req.user.id) {
          await createNotification(
            lead.ownerId,
            'BID_RECEIVED',
            'Yeni Teklif Geldi',
            `"${lead.title}" için yeni teklif geldi. Mevcut fiyat: ${proxyResult.visiblePrice} TL.`,
            { leadId, visiblePrice: proxyResult.visiblePrice, reserveMet }
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
            amount: proxyResult.visiblePrice,
            currency: 'TL',
            leadUrl,
            year: currentYear(),
            userName: user.username || user.firstName || user.email.split('@')[0],
            userEmail: user.email,
            newAmount: proxyResult.visiblePrice
          })

          await sendAppEmail({ to: user.email, subject, text, html })
        }
      } catch (e) {
        console.error('Bid email send error:', e.message)
      }

      // Notification 3: Önceki lider outbid edildi (yalnızca lider değişirse)
      try {
        if (proxyResult.isLeader && proxyResult.previousLeaderId && proxyResult.previousLeaderId !== req.user.id) {
          await createNotification(
            proxyResult.previousLeaderId,
            'BID_OUTBID',
            'Teklifiniz Geçildi',
            `"${lead.title}" için maksimum teklifiniz geçildi. Yeni fiyat: ${proxyResult.visiblePrice} TL. Daha yüksek bir maksimum teklif verin.`,
            {
              leadId,
              visiblePrice: proxyResult.visiblePrice
            }
          )

          // Email to outbid user
          const outbidUser = await prisma.user.findUnique({ where: { id: proxyResult.previousLeaderId } })
          if (outbidUser?.email) {
            const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
            const companyName = settings?.companyName || 'LeadPortal'
            const leadUrl = process.env.APP_ORIGIN ? `${process.env.APP_ORIGIN}/lead/${leadId}` : ''

            const { subject, html, text } = await renderEmailTemplate('outbid', {
              companyName,
              leadTitle: lead.title,
              amount: currentVisibleBid,
              newAmount: proxyResult.visiblePrice,
              currency: 'TL',
              leadUrl,
              year: currentYear(),
              userName: outbidUser.username || outbidUser.firstName || outbidUser.email.split('@')[0],
              userEmail: outbidUser.email
            })

            await sendAppEmail({ to: outbidUser.email, subject, text, html })
          }
        }
      } catch (e) {
        console.error('Notification error (BID_OUTBID):', e.message)
      }

      // Notification 4: Eğer auto-bid tetiklendi ama lider değişmedi
      // Bu durumda mevcut lidere bilgi ver
      try {
        if (!proxyResult.isLeader && proxyResult.leaderAutoBid) {
          await createNotification(
            proxyResult.previousLeaderId,
            'BID_AUTO_INCREASED',
            'Otomatik Teklifiniz Arttırıldı',
            `"${lead.title}" için otomatik teklifiniz ${proxyResult.visiblePrice} TL'ye yükseltildi. Hala lidersiniz!`,
            {
              leadId,
              visiblePrice: proxyResult.visiblePrice
            }
          )
        }
      } catch (e) {
        console.error('Notification error (BID_AUTO_INCREASED):', e.message)
      }

      // Watchers: bu lead'i izleyen herkese bildirim
      try {
        const watchers = await prisma.leadWatch.findMany({
          where: { leadId },
          include: { user: true }
        })
        const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
        const companyName = settings?.companyName || 'LeadPortal'
        const leadUrl = process.env.APP_ORIGIN ? `${process.env.APP_ORIGIN}/lead/${leadId}` : ''

        await Promise.all(
          watchers
            .filter(w => w.userId !== req.user.id && w.userId !== proxyResult.previousLeaderId) // Avoid duplicate emails
            .map(async (w) => {
              if (!w.user?.email) return

              const { subject, html, text } = await renderEmailTemplate('outbid', {
                companyName,
                leadTitle: lead.title,
                amount: currentVisibleBid,
                newAmount: proxyResult.visiblePrice,
                currency: 'TL',
                leadUrl,
                year: currentYear(),
                userName: w.user.username || w.user.firstName || w.user.email.split('@')[0],
                userEmail: w.user.email
              })

              await sendAppEmail({ to: w.user.email, subject, text, html })
            })
        )
      } catch (e) {
        console.error('Watcher email send error:', e.message)
      }

      // Response için sanitized bid (hide maxBid from response if not leader or show with confirmation)
      const responseBid = {
        ...proxyResult.userBid,
        user: anonymizeUser(proxyResult.userBid.user, req.user.id),
        visiblePrice: proxyResult.visiblePrice,
        isLeader: proxyResult.isLeader,
        reserveMet,
        message: proxyResult.message,
        antiSnipeTriggered: antiSnipeResult.shouldExtend,
        newEndsAt: antiSnipeResult.shouldExtend ? antiSnipeResult.newEndsAt : undefined
      }

      res.status(201).json(responseBid)
    } catch (error) {
      console.error('Bid creation error:', error)
      res.status(500).json({
        error: error.message || 'Teklif oluşturulurken bir hata oluştu'
      })
    }
  })

  return router
}
