import { Router } from 'express'
import { z } from 'zod'

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

    const bid = await prisma.bid.create({ data: { amount, leadId, userId: req.user.id }, include: { user: true } })

    io.to(`lead:${leadId}`).emit('bid:new', { leadId, bid })

    res.status(201).json(bid)
  })

  return router
}

