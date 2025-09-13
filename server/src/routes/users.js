import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'

const createSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  role: z.enum(['USER','ADMIN']).default('USER'),
})

export default function usersRouter(prisma) {
  const router = Router()

  router.get('/', async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(users)
  })

  router.post('/', async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = parsed.error?.errors?.map(e => e.message).join(', ') || 'Geçersiz veri'
      return res.status(400).json({ error: errors })
    }
    const { email, password, role } = parsed.data
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(409).json({ error: 'Email already exists' })
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { email, passwordHash, role } })
    res.status(201).json({ id: user.id, email: user.email, role: user.role })
  })

  // Admin: reset user password
  router.put('/:id/password', async (req, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
    const body = z.object({ password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır') }).safeParse(req.body)
    if (!body.success) {
      const errors = body.error?.errors?.map(e => e.message).join(', ') || 'Geçersiz şifre'
      return res.status(400).json({ error: errors })
    }
    const passwordHash = await bcrypt.hash(body.data.password, 10)
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } })
    res.json({ ok: true })
  })

  return router
}

