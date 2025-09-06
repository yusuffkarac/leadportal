import { Router } from 'express'
import { z } from 'zod'

const createLeadSchema = z.object({
  title: z.string().min(1, 'Başlık zorunlu'),
  description: z.string().min(1, 'Açıklama zorunlu'),
  startPrice: z.number().int().nonnegative(),
  minIncrement: z.number().int().positive(),
  endsAt: z.string().min(1, 'Bitiş zamanı zorunlu').transform((v) => new Date(v))
})

export default function leadsRouter(prisma, io) {
  const router = Router()

  router.get('/', async (_req, res) => {
    const leads = await prisma.lead.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { bids: { orderBy: { createdAt: 'desc' }, take: 1 } }
    })
    res.json(leads)
  })

  // Admin: own leads list with bids (MUST be before '/:id')
  router.get('/admin/mine/list', async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
    const leads = await prisma.lead.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { bids: { orderBy: { createdAt: 'desc' }, include: { user: true } } }
    })
    res.json(leads)
  })

  // Admin: all leads with owner and bids
  router.get('/admin/list', async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
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

  // Admin create
  router.post('/', async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
    const parsed = createLeadSchema.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      return res.status(400).json({ error: 'Validation failed', issues })
    }
    const { title, description, startPrice, minIncrement, endsAt } = parsed.data
    const lead = await prisma.lead.create({
      data: {
        title,
        description,
        startPrice,
        minIncrement,
        endsAt,
        ownerId: req.user.id
      }
    })
    res.status(201).json(lead)
  })

  // Admin update
  router.put('/:id', async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
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
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
    await prisma.lead.delete({ where: { id: req.params.id } })
    io.to(`lead:${req.params.id}`).emit('lead:deleted', { leadId: req.params.id })
    res.json({ ok: true })
  })

  return router
}

