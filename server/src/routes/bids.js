import { Router } from 'express'
import { z } from 'zod'
import { sendAppEmail } from '../utils/mailer.js'
import { bidReceivedTemplate, outbidTemplate } from '../utils/emailTemplates.js'

const bidSchema = z.object({
  leadId: z.string().min(1),
  amount: z.number().int().positive()
})

export default function bidsRouter(prisma, io) {
  const router = Router()

  router.post('/', async (req, res) => {
    const parsed = bidSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })
    const { leadId, amount } = parsed.data

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { bids: { orderBy: { createdAt: 'desc' }, take: 1 } } })
    if (!lead || !lead.isActive) return res.status(400).json({ error: 'Lead is not active' })

    const current = lead.bids[0]?.amount ?? lead.startPrice
    const minNext = current + lead.minIncrement
    if (amount < minNext) {
      return res.status(400).json({ error: `Minimum allowed bid is ${minNext}` })
    }

    const previousTopBid = lead.bids[0] || null
    const bid = await prisma.bid.create({ data: { amount, leadId, userId: req.user.id }, include: { user: true } })

    io.to(`lead:${leadId}`).emit('bid:new', { leadId, bid })

    // E-posta: Teklif verene bilgilendirme gönder
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } })
      if (user?.email) {
        const leadUrl = process.env.APP_ORIGIN ? `${process.env.APP_ORIGIN}/lead/${leadId}` : ''
        const { subject, html, text } = bidReceivedTemplate({ companyName: 'LeadPortal', leadTitle: lead.title, amount, currency: 'TL', leadUrl })
        await sendAppEmail({ to: user.email, subject, text, html })
      }
    } catch (e) {
      console.error('Bid email send error:', e.message)
    }

    // Outbid: önceki en yüksek teklifi veren kullanıcıya haber ver
    try {
      if (previousTopBid && previousTopBid.userId !== req.user.id) {
        const outbidUser = await prisma.user.findUnique({ where: { id: previousTopBid.userId } })
        if (outbidUser?.email) {
          const leadUrl = process.env.APP_ORIGIN ? `${process.env.APP_ORIGIN}/lead/${leadId}` : ''
          const { subject, html, text } = outbidTemplate({ companyName: 'LeadPortal', leadTitle: lead.title, newAmount: amount, currency: 'TL', leadUrl })
          await sendAppEmail({ to: outbidUser.email, subject, text, html })
        }
      }
    } catch (e) {
      console.error('Outbid email send error:', e.message)
    }

    // Watchers: bu lead'i izleyen herkese bildirim
    try {
      const watchers = await prisma.leadWatch.findMany({ where: { leadId }, include: { user: true } })
      const leadUrl = process.env.APP_ORIGIN ? `${process.env.APP_ORIGIN}/lead/${leadId}` : ''
      await Promise.all(
        watchers
          .filter(w => w.userId !== req.user.id) // kendisine iki mail gitmesin
          .map(async (w) => {
            if (!w.user?.email) return
            const { subject, html, text } = outbidTemplate({ companyName: 'LeadPortal', leadTitle: lead.title, newAmount: amount, currency: 'TL', leadUrl })
            await sendAppEmail({ to: w.user.email, subject, text, html })
          })
      )
    } catch (e) {
      console.error('Watcher email send error:', e.message)
    }

    res.status(201).json(bid)
  })

  return router
}

