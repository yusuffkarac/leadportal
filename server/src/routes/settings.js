import express from 'express'
import { PrismaClient } from '../prismaClient.js'
import { logActivity, ActivityTypes, extractRequestInfo } from '../utils/activityLogger.js'

const router = express.Router()
const prisma = new PrismaClient()

const defaultHomepage = {
  hero: {
    eyebrow: 'Sigorta lead pazaryeri',
    title: "Almanya'nın önde gelen",
    highlight: 'sigorta lead',
    titleSuffix: 'pazaryeri',
    subtitle: 'LeadPortal, sigorta brokerleri için profesyonel açık artırma altyapısı, doğrulanmış lead kalitesi ve canlı teklif takibi sunar.',
    primaryText: 'Şimdi kaydol',
    primaryLink: '/login',
    secondaryText: 'Canlı açık artırmaları gör',
    secondaryLink: '/leads'
  },
  featureHeading: "LeadPortal'ı neden seçmelisiniz?",
  features: [
    {
      icon: 'mdi:scale-balance',
      title: 'Adil Açık Artırmalar',
      description: 'Şeffaf kurallar ve gerçek zamanlı teklifler ile esnek açık artırma modelleri.'
    },
    {
      icon: 'mdi:shield-check',
      title: 'Onaylı Kalite',
      description: 'Her lead yayına alınmadan önce kalite ve doğruluk kontrollerinden geçer.'
    },
    {
      icon: 'mdi:account-group',
      title: 'Güvenilir İş Ortağı',
      description: 'Broker topluluğumuz için doğrulama süreci ve puanlama sistemi.'
    }
  ],
  showcase: {
    eyebrow: 'Vitrin leadler',
    title: 'Aktüel açık artırmalar',
    ctaText: 'Hepsini gör',
    ctaLink: '/leads'
  },
  statsHeading: {
    eyebrow: 'Güven veren rakamlar',
    title: 'Broker topluluğumuz büyümeye devam ediyor'
  },
  stats: [
    { value: '2.500+', label: 'Aktif Broker' },
    { value: '15.000+', label: 'Satılan Lead' },
    { value: '98%', label: 'Memnuniyet' },
    { value: '€2.1M', label: 'Toplam Hacim' }
  ],
  cta: {
    title: 'Başlamak için hazır mısınız?',
    subtitle: 'LeadPortal topluluğuna katılın, doğrulanmış leadlere erişin ve işinizi güvenle büyütün.',
    primaryText: 'Ücretsiz kaydol',
    primaryLink: '/login',
    secondaryText: 'Leadleri incele',
    secondaryLink: '/leads'
  }
}

const defaultInsuranceTypes = [
  { name: 'Hayvan', icon: 'fa-paw' },
  { name: 'Araba', icon: 'fa-car' },
  { name: 'Sağlık', icon: 'fa-heart-pulse' }
]

function normalizeInsuranceTypesList(insuranceTypes) {
  if (!insuranceTypes) {
    return defaultInsuranceTypes
  }

  if (Array.isArray(insuranceTypes)) {
    if (insuranceTypes.length === 0) {
      return defaultInsuranceTypes
    }

    const first = insuranceTypes[0]
    if (typeof first === 'string') {
      const defaultIcons = {
        Hayvan: 'fa-paw',
        Araba: 'fa-car',
        Sağlık: 'fa-heart-pulse'
      }
      return insuranceTypes.map(name => ({
        name,
        icon: defaultIcons[name] || 'fa-file-alt'
      }))
    }

    if (typeof first === 'object') {
      return insuranceTypes.map(item => ({
        name: item?.name ?? '',
        icon: item?.icon ?? 'fa-file-alt'
      }))
    }
  }

  return defaultInsuranceTypes
}

function mapHomepageSettings(settings) {
  const features = []
  if (Array.isArray(settings.homepageFeatures)) {
    settings.homepageFeatures.forEach(item => {
      if (item && typeof item === 'object') {
        features.push({
          icon: item.icon || 'mdi:information',
          title: item.title || '',
          description: item.description || ''
        })
      }
    })
  }

  const stats = []
  if (Array.isArray(settings.homepageStats)) {
    settings.homepageStats.forEach(item => {
      if (item && typeof item === 'object') {
        stats.push({
          value: item.value || '',
          label: item.label || ''
        })
      }
    })
  }

  return {
    hero: {
      eyebrow: settings.homepageHeroEyebrow || defaultHomepage.hero.eyebrow,
      title: settings.homepageHeroTitle || defaultHomepage.hero.title,
      highlight: settings.homepageHeroHighlight || defaultHomepage.hero.highlight,
      titleSuffix: settings.homepageHeroTitleSuffix || defaultHomepage.hero.titleSuffix,
      subtitle: settings.homepageHeroSubtitle || defaultHomepage.hero.subtitle,
      primaryText: settings.homepageHeroPrimaryCtaText || defaultHomepage.hero.primaryText,
      primaryLink: settings.homepageHeroPrimaryCtaLink || defaultHomepage.hero.primaryLink,
      secondaryText: settings.homepageHeroSecondaryCtaText || defaultHomepage.hero.secondaryText,
      secondaryLink: settings.homepageHeroSecondaryCtaLink || defaultHomepage.hero.secondaryLink
    },
    featureHeading: settings.homepageFeatureHeading || defaultHomepage.featureHeading,
    features: features.length ? features : defaultHomepage.features,
    showcase: {
      eyebrow: settings.homepageShowcaseEyebrow || defaultHomepage.showcase.eyebrow,
      title: settings.homepageShowcaseTitle || defaultHomepage.showcase.title,
      ctaText: settings.homepageShowcaseCtaText || defaultHomepage.showcase.ctaText,
      ctaLink: settings.homepageShowcaseCtaLink || defaultHomepage.showcase.ctaLink
    },
    statsHeading: {
      eyebrow: settings.homepageStatsEyebrow || defaultHomepage.statsHeading.eyebrow,
      title: settings.homepageStatsTitle || defaultHomepage.statsHeading.title
    },
    stats: stats.length ? stats : defaultHomepage.stats,
    cta: {
      title: settings.homepageCtaTitle || defaultHomepage.cta.title,
      subtitle: settings.homepageCtaSubtitle || defaultHomepage.cta.subtitle,
      primaryText: settings.homepageCtaPrimaryText || defaultHomepage.cta.primaryText,
      primaryLink: settings.homepageCtaPrimaryLink || defaultHomepage.cta.primaryLink,
      secondaryText: settings.homepageCtaSecondaryText || defaultHomepage.cta.secondaryText,
      secondaryLink: settings.homepageCtaSecondaryLink || defaultHomepage.cta.secondaryLink
    }
  }
}

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
          insuranceTypes: [
            { name: "Hayvan", icon: "fa-paw" },
            { name: "Araba", icon: "fa-car" },
            { name: "Sağlık", icon: "fa-heart-pulse" }
          ],
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

    // Eğer insuranceTypes alanı yoksa default değer ekle
    if (!settings.insuranceTypes) {
      settings.insuranceTypes = [
        { name: "Hayvan", icon: "fa-paw" },
        { name: "Araba", icon: "fa-car" },
        { name: "Sağlık", icon: "fa-heart-pulse" }
      ]
    } else if (Array.isArray(settings.insuranceTypes) && settings.insuranceTypes.length > 0) {
      // Eski format compatibility: string array'i object array'e dönüştür
      const firstItem = settings.insuranceTypes[0]
      
      if (typeof firstItem === 'string') {
        // String array formatında, yeni formata çevir
        const defaultIcons = {
          'Hayvan': 'fa-paw',
          'Araba': 'fa-car',
          'Sağlık': 'fa-heart-pulse'
        }
        
        settings.insuranceTypes = settings.insuranceTypes.map(name => ({
          name: name,
          icon: defaultIcons[name] || 'fa-file-alt'
        }))
        
        // Veritabanını da güncelle
        await prisma.settings.update({
          where: { id: 'default' },
          data: { insuranceTypes: settings.insuranceTypes }
        })
      } else if (firstItem && typeof firstItem === 'object') {
        // Zaten object ama kontrol et
        const needsFix = settings.insuranceTypes.some(type => 
          !type.name || !type.icon || type.name.includes('fa-') || type.name.length < 2
        )
        
        if (needsFix) {
          // Bozuk veri, default'a dön
          settings.insuranceTypes = [
            { name: "Hayvan", icon: "fa-paw" },
            { name: "Araba", icon: "fa-car" },
            { name: "Sağlık", icon: "fa-heart-pulse" }
          ]
          
          await prisma.settings.update({
            where: { id: 'default' },
            data: { insuranceTypes: settings.insuranceTypes }
          })
        }
      }
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
      insuranceTypes,
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

    // Sigorta türleri validasyonu
    if (insuranceTypes && !Array.isArray(insuranceTypes)) {
      return res.status(400).json({ message: 'Sigorta türleri bir dizi olmalıdır' })
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
        insuranceTypes: insuranceTypes || ["Hayvan", "Araba", "Sağlık"],
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
        insuranceTypes: insuranceTypes || ["Hayvan", "Araba", "Sağlık"],
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

    // Activity log
    try {
      const { ipAddress, userAgent } = extractRequestInfo(req)
      await logActivity({
        userId: req.user.id,
        action: ActivityTypes.CHANGE_SETTINGS,
        details: { settingType: 'general' },
        ipAddress,
        userAgent
      })
    } catch (e) {
      console.error('Activity log error:', e.message)
    }

    res.json({ message: 'Ayarlar başarıyla kaydedildi', settings })
  } catch (error) {
    console.error('Settings update error:', error)
    res.status(500).json({ message: 'Ayarlar kaydedilemedi' })
  }
})

// Get branding settings (public - no auth required)
router.get('/branding', async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' },
      select: {
        companyName: true,
        companyLogoUrl: true,
        faviconUrl: true,
        footerPhone: true,
        footerEmail: true,
        footerNote: true,
        footerDescription: true,
        tradeRegisterNumber: true,
        servicesLinks: true,
        supportLinks: true,
        legalLinks: true,
        socialMedia: true
      }
    })
    
    if (!settings) {
      // Return default branding
      settings = {
        companyName: 'LeadPortal',
        companyLogoUrl: '',
        faviconUrl: '',
        footerPhone: '+90 (212) 123 45 67',
        footerEmail: 'info@leadportal.com',
        footerNote: '',
        footerDescription: 'Almanya\'nın önde gelen lead pazar yeri. Profesyonel açık artırmalar ve lead yönetimi platformu.',
        tradeRegisterNumber: 'İstanbul Ticaret Sicil No: 12345',
        servicesLinks: null,
        supportLinks: null,
        legalLinks: null,
        socialMedia: null
      }
    }

    res.json(settings)
  } catch (error) {
    console.error('Branding get error:', error)
    res.status(500).json({ message: 'Branding ayarları alınamadı' })
  }
})

// Update branding settings
router.post('/branding', requireAdmin, async (req, res) => {
  try {
    const {
      companyName,
      companyLogoUrl,
      faviconUrl,
      footerPhone,
      footerEmail,
      footerNote,
      footerDescription,
      tradeRegisterNumber,
      servicesLinks,
      supportLinks,
      legalLinks,
      socialMedia
    } = req.body

    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        companyName: companyName || 'LeadPortal',
        companyLogoUrl: companyLogoUrl || '',
        faviconUrl: faviconUrl || '',
        footerPhone: footerPhone || '+90 (212) 123 45 67',
        footerEmail: footerEmail || 'info@leadportal.com',
        footerNote: footerNote || '',
        footerDescription: footerDescription || 'Almanya\'nın önde gelen lead pazar yeri. Profesyonel açık artırmalar ve lead yönetimi platformu.',
        tradeRegisterNumber: tradeRegisterNumber || 'İstanbul Ticaret Sicil No: 12345',
        servicesLinks: servicesLinks || null,
        supportLinks: supportLinks || null,
        legalLinks: legalLinks || null,
        socialMedia: socialMedia || null
      },
      create: {
        id: 'default',
        companyName: companyName || 'LeadPortal',
        companyLogoUrl: companyLogoUrl || '',
        faviconUrl: faviconUrl || '',
        footerPhone: footerPhone || '+90 (212) 123 45 67',
        footerEmail: footerEmail || 'info@leadportal.com',
        footerNote: footerNote || '',
        footerDescription: footerDescription || 'Almanya\'nın önde gelen lead pazar yeri. Profesyonel açık artırmalar ve lead yönetimi platformu.',
        tradeRegisterNumber: tradeRegisterNumber || 'İstanbul Ticaret Sicil No: 12345',
        servicesLinks: servicesLinks || null,
        supportLinks: supportLinks || null,
        legalLinks: legalLinks || null,
        socialMedia: socialMedia || null
      }
    })

    // Activity log
    try {
      const { ipAddress, userAgent } = extractRequestInfo(req)
      await logActivity({
        userId: req.user.id,
        action: ActivityTypes.CHANGE_BRANDING,
        details: { companyName },
        ipAddress,
        userAgent
      })
    } catch (e) {
      console.error('Activity log error:', e.message)
    }

    res.json({ message: 'Branding ayarları başarıyla kaydedildi', settings })
  } catch (error) {
    console.error('Branding update error:', error)
    res.status(500).json({ message: 'Branding ayarları kaydedilemedi' })
  }
})

// Get homepage settings (public)
router.get('/homepage', async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 'default' }
      })
    }

    const homepage = mapHomepageSettings(settings)
    const insuranceTypes = normalizeInsuranceTypesList(settings.insuranceTypes)

    res.json({
      hero: homepage.hero,
      featureHeading: homepage.featureHeading,
      features: homepage.features,
      showcase: homepage.showcase,
      statsHeading: homepage.statsHeading,
      stats: homepage.stats,
      cta: homepage.cta,
      defaultCurrency: settings.defaultCurrency || 'TRY',
      insuranceTypes
    })
  } catch (error) {
    console.error('Homepage settings get error:', error)
    res.status(500).json({ message: 'Ana sayfa ayarları alınamadı' })
  }
})

// Update homepage settings
router.post('/homepage', requireAdmin, async (req, res) => {
  try {
    const {
      hero = {},
      featureHeading,
      features,
      showcase = {},
      statsHeading = {},
      stats,
      cta = {}
    } = req.body

    const sanitizeString = (value, fallback = '') =>
      typeof value === 'string' && value.trim().length ? value.trim() : fallback

    const sanitizedFeatures = Array.isArray(features)
      ? features
          .map(item => ({
            icon: sanitizeString(item?.icon, 'mdi:information'),
            title: sanitizeString(item?.title),
            description: sanitizeString(item?.description)
          }))
          .filter(item => item.title || item.description)
      : []

    const sanitizedStats = Array.isArray(stats)
      ? stats
          .map(item => ({
            value: sanitizeString(item?.value),
            label: sanitizeString(item?.label)
          }))
          .filter(item => item.value || item.label)
      : []

    const updateData = {
      homepageHeroEyebrow: sanitizeString(hero.eyebrow, defaultHomepage.hero.eyebrow),
      homepageHeroTitle: sanitizeString(hero.title, defaultHomepage.hero.title),
      homepageHeroHighlight: sanitizeString(hero.highlight, defaultHomepage.hero.highlight),
      homepageHeroTitleSuffix: sanitizeString(hero.titleSuffix, defaultHomepage.hero.titleSuffix),
      homepageHeroSubtitle: sanitizeString(hero.subtitle, defaultHomepage.hero.subtitle),
      homepageHeroPrimaryCtaText: sanitizeString(hero.primaryText, defaultHomepage.hero.primaryText),
      homepageHeroPrimaryCtaLink: sanitizeString(hero.primaryLink, defaultHomepage.hero.primaryLink),
      homepageHeroSecondaryCtaText: sanitizeString(hero.secondaryText, defaultHomepage.hero.secondaryText),
      homepageHeroSecondaryCtaLink: sanitizeString(hero.secondaryLink, defaultHomepage.hero.secondaryLink),
      homepageFeatureHeading: sanitizeString(featureHeading, defaultHomepage.featureHeading),
      homepageFeatures: sanitizedFeatures.length ? sanitizedFeatures : defaultHomepage.features,
      homepageShowcaseEyebrow: sanitizeString(showcase.eyebrow, defaultHomepage.showcase.eyebrow),
      homepageShowcaseTitle: sanitizeString(showcase.title, defaultHomepage.showcase.title),
      homepageShowcaseCtaText: sanitizeString(showcase.ctaText, defaultHomepage.showcase.ctaText),
      homepageShowcaseCtaLink: sanitizeString(showcase.ctaLink, defaultHomepage.showcase.ctaLink),
      homepageStatsEyebrow: sanitizeString(statsHeading.eyebrow, defaultHomepage.statsHeading.eyebrow),
      homepageStatsTitle: sanitizeString(statsHeading.title, defaultHomepage.statsHeading.title),
      homepageStats: sanitizedStats.length ? sanitizedStats : defaultHomepage.stats,
      homepageCtaTitle: sanitizeString(cta.title, defaultHomepage.cta.title),
      homepageCtaSubtitle: sanitizeString(cta.subtitle, defaultHomepage.cta.subtitle),
      homepageCtaPrimaryText: sanitizeString(cta.primaryText, defaultHomepage.cta.primaryText),
      homepageCtaPrimaryLink: sanitizeString(cta.primaryLink, defaultHomepage.cta.primaryLink),
      homepageCtaSecondaryText: sanitizeString(cta.secondaryText, defaultHomepage.cta.secondaryText),
      homepageCtaSecondaryLink: sanitizeString(cta.secondaryLink, defaultHomepage.cta.secondaryLink)
    }

    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData
      }
    })

    // Activity log
    try {
      const { ipAddress, userAgent } = extractRequestInfo(req)
      await logActivity({
        userId: req.user.id,
        action: ActivityTypes.CHANGE_SETTINGS,
        details: { settingType: 'homepage' },
        ipAddress,
        userAgent
      })
    } catch (e) {
      console.error('Activity log error:', e.message)
    }

    res.json({
      message: 'Ana sayfa ayarları başarıyla kaydedildi',
      homepage: mapHomepageSettings(settings)
    })
  } catch (error) {
    console.error('Homepage settings update error:', error)
    res.status(500).json({ message: 'Ana sayfa ayarları kaydedilemedi' })
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
