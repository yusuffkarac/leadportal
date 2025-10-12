import express from 'express'
import { PrismaClient } from '@prisma/client'

const router = express.Router()
const prisma = new PrismaClient()

// Middleware to check admin role
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ message: 'Token gerekli' })
    }

    // JWT token'ı verify et
    const jwt = await import('jsonwebtoken')
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id } // JWT'de 'id' field'ı var, 'userId' değil
    })

    if (!user || (user.userTypeId !== 'ADMIN' && user.userTypeId !== 'SUPERADMIN')) {
      return res.status(403).json({ message: 'Admin yetkisi gerekli' })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Admin check error:', error)
    res.status(500).json({ message: 'Sunucu hatası' })
  }
}

// Get settings
router.get('/', requireAdmin, async (req, res) => {
  try {
    // Settings'i database'den al - sadece 1 tane global ayar var
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })
    
    if (!settings) {
      // İlk kez çalışıyorsa default settings oluştur
      settings = await prisma.settings.create({
        data: {
          id: 'default', // Sabit ID - sadece 1 tane ayar olacak
          leadIdFormat: 'numeric',
          customFormat: 'L{YYYY}{MM}{DD}-{NUM}',
          leadPrefix: 'LEAD',
          startingNumber: 1,
          numberType: 'sequential',
          defaultCurrency: 'TRY',
          defaultAuctionDays: 7,
          defaultMinIncrement: 10,
          maintenanceMode: false,
          maintenanceMessage: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
          smtpHost: '',
          smtpPort: 465,
          smtpUser: '',
          smtpPass: '',
          smtpFromName: 'LeadPortal',
          smtpUseTLS: false,
          smtpUseSSL: true
        }
      })
    }

    res.json(settings)
  } catch (error) {
    console.error('Settings get error:', error)
    res.status(500).json({ message: 'Ayarlar alınamadı' })
  }
})

// Update settings
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      leadIdFormat,
      customFormat,
      leadPrefix,
      startingNumber,
      numberType,
      defaultCurrency,
      defaultAuctionDays,
      defaultMinIncrement,
      maintenanceMode,
      maintenanceMessage,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFromName,
      smtpUseTLS,
      smtpUseSSL
    } = req.body

    // Validation
    if (!leadIdFormat || !['numeric', 'prefixed-numeric', 'date-numeric', 'custom'].includes(leadIdFormat)) {
      return res.status(400).json({ message: 'Geçersiz ID formatı' })
    }

    if (leadIdFormat === 'custom' && !customFormat) {
      return res.status(400).json({ message: 'Özel format gerekli' })
    }

    if (startingNumber < 1) {
      return res.status(400).json({ message: 'Başlangıç numarası 1\'den küçük olamaz' })
    }

    // Settings'i database'e kaydet
    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        leadIdFormat,
        customFormat: customFormat || 'L{YYYY}{MM}{DD}-{NUM}',
        leadPrefix: leadPrefix || 'LEAD',
        startingNumber: startingNumber || 1,
        numberType: numberType || 'sequential',
        defaultCurrency: defaultCurrency || 'TRY',
        defaultAuctionDays: defaultAuctionDays || 7,
        defaultMinIncrement: defaultMinIncrement || 10,
        maintenanceMode: maintenanceMode !== undefined ? maintenanceMode : false,
        maintenanceMessage: maintenanceMessage || 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
        smtpHost: smtpHost ?? '',
        smtpPort: smtpPort ?? 465,
        smtpUser: smtpUser ?? '',
        smtpPass: smtpPass ?? '',
        smtpFromName: smtpFromName ?? 'LeadPortal',
        smtpUseTLS: smtpUseTLS ?? false,
        smtpUseSSL: smtpUseSSL ?? true
      },
      create: {
        id: 'default',
        leadIdFormat,
        customFormat: customFormat || 'L{YYYY}{MM}{DD}-{NUM}',
        leadPrefix: leadPrefix || 'LEAD',
        startingNumber: startingNumber || 1,
        numberType: numberType || 'sequential',
        defaultCurrency: defaultCurrency || 'TRY',
        defaultAuctionDays: defaultAuctionDays || 7,
        defaultMinIncrement: defaultMinIncrement || 10,
        maintenanceMode: maintenanceMode !== undefined ? maintenanceMode : false,
        maintenanceMessage: maintenanceMessage || 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
        smtpHost: smtpHost ?? '',
        smtpPort: smtpPort ?? 465,
        smtpUser: smtpUser ?? '',
        smtpPass: smtpPass ?? '',
        smtpFromName: smtpFromName ?? 'LeadPortal',
        smtpUseTLS: smtpUseTLS ?? false,
        smtpUseSSL: smtpUseSSL ?? true
      }
    })

    res.json({ message: 'Ayarlar başarıyla kaydedildi', settings })
  } catch (error) {
    console.error('Settings update error:', error)
    res.status(500).json({ message: 'Ayarlar kaydedilemedi' })
  }
})

// Get next lead ID
router.get('/next-lead-id', requireAdmin, async (req, res) => {
  try {
    // Mevcut lead'lerin sayısını al
    const leadCount = await prisma.lead.count()
    
    // Settings'i database'den al - sadece 1 tane global ayar var
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })
    if (!settings) {
      settings = {
        leadIdFormat: 'numeric',
        customFormat: 'L{YYYY}{MM}{DD}-{NUM}',
        leadPrefix: 'LEAD',
        startingNumber: 1
      }
    }

    // ID generator logic
    const nextSequenceNumber = leadCount + 1
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    
    let nextId
    switch (settings.leadIdFormat) {
      case 'numeric':
        nextId = (settings.startingNumber + leadCount).toString()
        break
      case 'prefixed-numeric':
        nextId = `${settings.leadPrefix}-${settings.startingNumber + leadCount}`
        break
      case 'date-numeric':
        nextId = `${year}${month}${day}-${settings.startingNumber + leadCount}`
        break
      case 'custom':
        nextId = settings.customFormat
          .replace('{YYYY}', year)
          .replace('{MM}', month)
          .replace('{DD}', day)
          .replace('{NUM}', settings.startingNumber + leadCount)
          .replace('{PREFIX}', settings.leadPrefix)
        break
      default:
        nextId = (settings.startingNumber + leadCount).toString()
    }

    res.json({ nextId, sequenceNumber: nextSequenceNumber })
  } catch (error) {
    console.error('Next lead ID error:', error)
    res.status(500).json({ message: 'Sonraki ID alınamadı' })
  }
})

export default router
