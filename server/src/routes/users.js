import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'

const createSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  userTypeId: z.string().min(1, 'Kullanıcı tipi seçilmelidir'),
})

const updateSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  userTypeId: z.string().min(1, 'Kullanıcı tipi seçilmelidir'),
})

export default function usersRouter(prisma) {
  const router = Router()

  router.get('/', async (req, res) => {
    // Admin kontrolü - userTypeId ile yapılacak
    const users = await prisma.user.findMany({ 
      include: { userType: true },
      orderBy: { createdAt: 'desc' } 
    })
    res.json(users)
  })

  router.post('/', async (req, res) => {
    // Admin kontrolü - userTypeId ile yapılacak
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = parsed.error?.errors?.map(e => e.message).join(', ') || 'Geçersiz veri'
      return res.status(400).json({ error: errors })
    }
    const { email, password, firstName, lastName, username, userTypeId } = parsed.data
    
    // Email kontrolü
    const emailExists = await prisma.user.findUnique({ where: { email } })
    if (emailExists) return res.status(409).json({ error: 'Bu email adresi zaten kullanılıyor' })
    
    // Username kontrolü (eğer verilmişse)
    if (username) {
      const usernameExists = await prisma.user.findUnique({ where: { username } })
      if (usernameExists) return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' })
    }
    
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ 
      data: { email, passwordHash, firstName, lastName, username, userTypeId },
      include: { userType: true }
    })
    res.status(201).json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, username: user.username, userType: user.userType })
  })

  // Admin: update user
  router.put('/:id', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' })
    
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = parsed.error?.errors?.map(e => e.message).join(', ') || 'Geçersiz veri'
      return res.status(400).json({ error: errors })
    }
    
    const { email, firstName, lastName, username, userTypeId } = parsed.data
    
    // Email kontrolü (başka kullanıcıda var mı)
    const emailExists = await prisma.user.findFirst({ 
      where: { 
        email, 
        id: { not: req.params.id } 
      } 
    })
    if (emailExists) return res.status(409).json({ error: 'Bu email adresi zaten kullanılıyor' })
    
    // Username kontrolü (eğer verilmişse ve başka kullanıcıda var mı)
    if (username) {
      const usernameExists = await prisma.user.findFirst({ 
        where: { 
          username, 
          id: { not: req.params.id } 
        } 
      })
      if (usernameExists) return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' })
    }
    
    const user = await prisma.user.update({ 
      where: { id: req.params.id }, 
      data: { email, firstName, lastName, username, userTypeId },
      include: { userType: true }
    })
    res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, username: user.username, userType: user.userType })
  })

  // Admin: reset user password
  router.put('/:id/password', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' })
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

