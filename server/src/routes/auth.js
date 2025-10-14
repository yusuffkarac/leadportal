import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(6)
})

const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  email: z.string().email().optional()
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
})

// Multer konfigürasyonu - profil fotoğrafları için
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profile-images'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Sadece resim dosyaları kabul edilir'), false)
    }
  }
})

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
    const { emailOrUsername, password } = parse.data
    
    // Email veya username ile kullanıcıyı bul
    const user = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      },
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

  // Profil bilgilerini getir
  router.get('/profile', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) return res.status(401).json({ error: 'Token gerekli' })
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { userType: true }
      })
      
      if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' })
      
      res.json({ user, userType: user.userType })
    } catch (error) {
      console.error('Profil getirme hatası:', error)
      res.status(401).json({ error: 'Geçersiz token' })
    }
  })

  // Profil bilgilerini güncelle
  router.put('/profile', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) return res.status(401).json({ error: 'Token gerekli' })
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const parse = updateProfileSchema.safeParse(req.body)
      if (!parse.success) return res.status(400).json({ error: 'Geçersiz veri' })
      
      const { firstName, lastName, username, email } = parse.data
      
      // Email benzersizlik kontrolü (kendi email'i hariç)
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: { 
            email: email,
            id: { not: decoded.id }
          }
        })
        if (existingUser) return res.status(409).json({ error: 'Bu email adresi zaten kullanılıyor' })
      }
      
      // Username benzersizlik kontrolü (kendi username'i hariç)
      if (username) {
        const existingUser = await prisma.user.findFirst({
          where: { 
            username: username,
            id: { not: decoded.id }
          }
        })
        if (existingUser) return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' })
      }
      
      const updatedUser = await prisma.user.update({
        where: { id: decoded.id },
        data: {
          firstName: firstName || null,
          lastName: lastName || null,
          username: username || null,
          email: email || undefined
        },
        include: { userType: true }
      })
      
      res.json({ user: updatedUser, userType: updatedUser.userType })
    } catch (error) {
      console.error('Profil güncelleme hatası:', error)
      res.status(500).json({ error: 'Profil güncellenirken hata oluştu' })
    }
  })

  // Şifre değiştir
  router.put('/change-password', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) return res.status(401).json({ error: 'Token gerekli' })
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const parse = changePasswordSchema.safeParse(req.body)
      if (!parse.success) return res.status(400).json({ error: 'Geçersiz veri' })
      
      const { currentPassword, newPassword } = parse.data
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      })
      
      if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' })
      
      // Mevcut şifreyi kontrol et
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isCurrentPasswordValid) return res.status(400).json({ error: 'Mevcut şifre yanlış' })
      
      // Yeni şifreyi hashle ve güncelle
      const newPasswordHash = await bcrypt.hash(newPassword, 10)
      await prisma.user.update({
        where: { id: decoded.id },
        data: { passwordHash: newPasswordHash }
      })
      
      res.json({ message: 'Şifre başarıyla değiştirildi' })
    } catch (error) {
      console.error('Şifre değiştirme hatası:', error)
      res.status(500).json({ error: 'Şifre değiştirilirken hata oluştu' })
    }
  })

  // Profil fotoğrafı yükle
  router.post('/upload-profile-image', upload.single('profileImage'), async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) return res.status(401).json({ error: 'Token gerekli' })
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      
      if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' })
      
      const profileImageUrl = `/uploads/profile-images/${req.file.filename}`
      
      // Eski profil fotoğrafını sil
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { profileImage: true }
      })
      
      if (user?.profileImage) {
        const oldImagePath = user.profileImage.replace('/uploads/profile-images/', 'uploads/profile-images/')
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath)
        }
      }
      
      // Yeni profil fotoğrafını kaydet
      await prisma.user.update({
        where: { id: decoded.id },
        data: { profileImage: profileImageUrl }
      })
      
      res.json({ profileImageUrl })
    } catch (error) {
      console.error('Profil fotoğrafı yükleme hatası:', error)
      res.status(500).json({ error: 'Fotoğraf yüklenirken hata oluştu' })
    }
  })

  // Profil fotoğrafını kaldır
  router.delete('/profile-image', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) return res.status(401).json({ error: 'Token gerekli' })
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { profileImage: true }
      })
      
      if (user?.profileImage) {
        const imagePath = user.profileImage.replace('/uploads/profile-images/', 'uploads/profile-images/')
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath)
        }
      }
      
      await prisma.user.update({
        where: { id: decoded.id },
        data: { profileImage: null }
      })
      
      res.json({ message: 'Profil fotoğrafı kaldırıldı' })
    } catch (error) {
      console.error('Profil fotoğrafı kaldırma hatası:', error)
      res.status(500).json({ error: 'Fotoğraf kaldırılırken hata oluştu' })
    }
  })

  return router
}

