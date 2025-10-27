import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { logActivity, ActivityTypes, extractRequestInfo } from '../utils/activityLogger.js'
import { subtractMinutes, createDate } from '../utils/dateTimeUtils.js'

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

    // Online durumunu hesapla (son 5 dakika içinde aktivite)
    const fiveMinutesAgo = subtractMinutes(5)

    const usersWithOnlineStatus = users.map(user => ({
      ...user,
      isOnline: user.lastActivity ? createDate(user.lastActivity) >= fiveMinutesAgo : false
    }))

    res.json(usersWithOnlineStatus)
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

    // Activity log
    try {
      const { ipAddress, userAgent } = extractRequestInfo(req)
      await logActivity({
        userId: req.user.id,
        action: ActivityTypes.CREATE_USER,
        details: { userEmail: email, userName: username || firstName || email },
        entityType: 'user',
        entityId: user.id,
        ipAddress,
        userAgent
      })
    } catch (e) {
      console.error('Activity log error:', e.message)
    }

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

    // Activity log
    try {
      const { ipAddress, userAgent } = extractRequestInfo(req)
      await logActivity({
        userId: req.user.id,
        action: ActivityTypes.EDIT_USER,
        details: { userEmail: email, userName: username || firstName || email },
        entityType: 'user',
        entityId: user.id,
        ipAddress,
        userAgent
      })
    } catch (e) {
      console.error('Activity log error:', e.message)
    }

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
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } })

    // Activity log
    try {
      const { ipAddress, userAgent } = extractRequestInfo(req)
      await logActivity({
        userId: req.user.id,
        action: ActivityTypes.RESET_PASSWORD,
        details: { targetUserEmail: user.email },
        entityType: 'user',
        entityId: user.id,
        ipAddress,
        userAgent
      })
    } catch (e) {
      console.error('Activity log error:', e.message)
    }

    res.json({ ok: true })
  })

  // Admin: deactivate user
  router.put('/:id/deactivate', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' })
    }

    // Kendini deaktif etmeyi engelle
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Kendinizi deaktif edemezsiniz' })
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: req.params.id } })
      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' })
      }

      await prisma.user.update({ 
        where: { id: req.params.id }, 
        data: { isActive: false } 
      })

      // Activity log
      try {
        const { ipAddress, userAgent } = extractRequestInfo(req)
        await logActivity({
          userId: req.user.id,
          action: ActivityTypes.DEACTIVATE_USER,
          details: { userEmail: user.email, userName: user.username || user.firstName || user.email },
          entityType: 'user',
          entityId: user.id,
          ipAddress,
          userAgent
        })
      } catch (e) {
        console.error('Activity log error:', e.message)
      }

      res.json({ ok: true })
    } catch (error) {
      console.error('Deactivate user error:', error)
      res.status(500).json({ error: 'Kullanıcı deaktif edilirken bir hata oluştu' })
    }
  })

  // Admin: delete user
  router.delete('/:id', async (req, res) => {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' })
    }

    // Kendini silmeyi engelle
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Kendinizi silemezsiniz' })
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: req.params.id } })
      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' })
      }

      await prisma.user.delete({ where: { id: req.params.id } })

      // Activity log
      try {
        const { ipAddress, userAgent } = extractRequestInfo(req)
        await logActivity({
          userId: req.user.id,
          action: ActivityTypes.DELETE_USER,
          details: { userEmail: user.email, userName: user.username || user.firstName || user.email },
          entityType: 'user',
          entityId: user.id,
          ipAddress,
          userAgent
        })
      } catch (e) {
        console.error('Activity log error:', e.message)
      }

      res.json({ ok: true })
    } catch (error) {
      console.error('Delete user error:', error)
      res.status(500).json({ error: 'Kullanıcı silinirken bir hata oluştu' })
    }
  })

  return router
}

