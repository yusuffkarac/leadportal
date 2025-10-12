import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

const loginSchema = registerSchema

export default function authRouter(prisma) {
  const router = Router()

  router.post('/register', async (req, res) => {
    const parse = registerSchema.safeParse(req.body)
    if (!parse.success) return res.status(400).json({ error: 'Invalid input' })
    const { email, password } = parse.data
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already in use' })
    
    // Default user type - ilk oluşturulan user type'ı al
    const defaultUserType = await prisma.userType.findFirst({ where: { isActive: true } })
    if (!defaultUserType) return res.status(500).json({ error: 'No user type available' })
    
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ 
      data: { email, passwordHash, userTypeId: defaultUserType.id },
      include: { userType: true }
    })
    const token = jwt.sign({ id: user.id, email: user.email, userTypeId: user.userTypeId }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, email: user.email, userType: user.userType } })
  })

  router.post('/login', async (req, res) => {
    const parse = loginSchema.safeParse(req.body)
    if (!parse.success) return res.status(400).json({ error: 'Invalid input' })
    const { email, password } = parse.data
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { userType: true }
    })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
    const token = jwt.sign({ id: user.id, email: user.email, userTypeId: user.userTypeId }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        userType: user.userType
      } 
    })
  })

  return router
}

