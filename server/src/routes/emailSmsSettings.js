import express from 'express'
import { PrismaClient } from '../prismaClient.js'
import { renderEmailTemplate } from '../utils/emailTemplateRenderer.js'
import { sendAppEmail } from '../utils/mailer.js'

const router = express.Router()
const prisma = new PrismaClient()

// Middleware to check admin role
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ message: 'Token gerekli' })
    }

    const jwt = await import('jsonwebtoken')
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
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

// Email template tipleri ve default içerikleri
const defaultEmailTemplates = [
  {
    type: 'bidReceived',
    name: 'Teklif Alındı',
    description: 'Kullanıcı bir lead\'e teklif verdiğinde gönderilen email',
    subject: 'Teklifiniz alındı: {{leadTitle}}',
    htmlContent: `<div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#2563eb;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;">
        {{companyName}}
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">Teklifiniz alındı</h1>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">
          <strong style="color:#111827;">{{leadTitle}}</strong> ilanına <strong style="color:#111827;">{{amount}} {{currency}}</strong> teklif verdiniz.
        </p>
        <a href="{{leadUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">İlanı Gör</a>
        <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Bu e-posta otomatik olarak gönderildi. Lütfen yanıtlamayınız.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">
        © {{year}} {{companyName}}
      </td>
    </tr>
  </table>
</div>`,
    textContent: 'Teklifiniz alındı\n\n{{leadTitle}} ilanına {{amount}} {{currency}} teklif verdiniz.\n\nİlanı Gör: {{leadUrl}}\n\n{{companyName}}',
    variables: ['companyName', 'leadTitle', 'amount', 'currency', 'leadUrl', 'year']
  },
  {
    type: 'outbid',
    name: 'Teklif Geçildi',
    description: 'Kullanıcının teklifi başka bir teklif tarafından geçildiğinde gönderilen email',
    subject: 'Daha yüksek teklif verildi: {{leadTitle}}',
    htmlContent: `<div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#dc2626;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;">
        {{companyName}}
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">Teklifiniz geçildi</h1>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">
          <strong>{{leadTitle}}</strong> ilanında sizden daha yüksek bir teklif verildi: <strong>{{newAmount}} {{currency}}</strong>.
        </p>
        <a href="{{leadUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">İlanı Gör ve Teklif Ver</a>
        <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Bu e-posta otomatik gönderildi.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">
        © {{year}} {{companyName}}
      </td>
    </tr>
  </table>
</div>`,
    textContent: 'Teklifiniz geçildi\n\n{{leadTitle}} ilanında yeni teklif: {{newAmount}} {{currency}}.\n\nİlan: {{leadUrl}}\n\n{{companyName}}',
    variables: ['companyName', 'leadTitle', 'newAmount', 'currency', 'leadUrl', 'year']
  },
  {
    type: 'leadWon',
    name: 'İhalayı Kazandınız',
    description: 'Kullanıcı bir ihaleyi kazandığında gönderilen email',
    subject: 'Tebrikler! İhaleyi kazandınız: {{leadTitle}}',
    htmlContent: `<div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#059669;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;">
        {{companyName}}
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">🎉 Tebrikler!</h1>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">
          <strong>{{leadTitle}}</strong> ihalasını <strong>{{amount}} {{currency}}</strong> bedel ile kazandınız!
        </p>
        <a href="{{leadUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Lead Detaylarını Gör</a>
        <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Bu e-posta otomatik gönderildi.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">
        © {{year}} {{companyName}}
      </td>
    </tr>
  </table>
</div>`,
    textContent: 'Tebrikler!\n\n{{leadTitle}} ihalasını {{amount}} {{currency}} bedel ile kazandınız!\n\nLead Detayları: {{leadUrl}}\n\n{{companyName}}',
    variables: ['companyName', 'leadTitle', 'amount', 'currency', 'leadUrl', 'year']
  },
  {
    type: 'leadExpired',
    name: 'İhale Süresi Doldu',
    description: 'Takip edilen bir ihalenin süresi dolduğunda gönderilen email',
    subject: 'İhale süresi doldu: {{leadTitle}}',
    htmlContent: `<div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#6b7280;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;">
        {{companyName}}
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">İhale Süresi Doldu</h1>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">
          <strong>{{leadTitle}}</strong> ihalesi sona erdi.
        </p>
        <a href="{{leadUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Yeni İhalelere Göz At</a>
        <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Bu e-posta otomatik gönderildi.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">
        © {{year}} {{companyName}}
      </td>
    </tr>
  </table>
</div>`,
    textContent: 'İhale Süresi Doldu\n\n{{leadTitle}} ihalesi sona erdi.\n\nYeni İhaleler: {{leadUrl}}\n\n{{companyName}}',
    variables: ['companyName', 'leadTitle', 'leadUrl', 'year']
  }
]

const defaultSMSTemplates = [
  {
    type: 'bidReceived',
    name: 'Teklif Alındı',
    description: 'Kullanıcı bir lead\'e teklif verdiğinde gönderilen SMS',
    content: '{{leadTitle}} ilanina {{amount}} {{currency}} teklif verdiniz. {{companyName}}',
    variables: ['leadTitle', 'amount', 'currency', 'companyName']
  },
  {
    type: 'outbid',
    name: 'Teklif Geçildi',
    description: 'Kullanıcının teklifi geçildiğinde gönderilen SMS',
    content: '{{leadTitle}} ilaninda teklifiniz gecildi. Yeni teklif: {{newAmount}} {{currency}}. {{companyName}}',
    variables: ['leadTitle', 'newAmount', 'currency', 'companyName']
  },
  {
    type: 'leadWon',
    name: 'İhaleyi Kazandınız',
    description: 'Kullanıcı bir ihaleyi kazandığında gönderilen SMS',
    content: 'Tebrikler! {{leadTitle}} ihalesini {{amount}} {{currency}} bedel ile kazandiniz. {{companyName}}',
    variables: ['leadTitle', 'amount', 'currency', 'companyName']
  },
  {
    type: 'leadExpired',
    name: 'İhale Süresi Doldu',
    description: 'Takip edilen bir ihalenin süresi dolduğunda gönderilen SMS',
    content: '{{leadTitle}} ihalesi sona erdi. {{companyName}}',
    variables: ['leadTitle', 'companyName']
  }
]

// Email Template Routes

// Tüm email template'leri getir
router.get('/email-templates', requireAdmin, async (req, res) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { type: 'asc' }
    })
    
    // Eğer hiç template yoksa, default template'leri oluştur
    if (templates.length === 0) {
      const createdTemplates = await Promise.all(
        defaultEmailTemplates.map(template => 
          prisma.emailTemplate.create({ data: template })
        )
      )
      return res.json(createdTemplates)
    }
    
    res.json(templates)
  } catch (error) {
    console.error('Email templates get error:', error)
    res.status(500).json({ message: 'Email template\'leri alınamadı' })
  }
})

// Belirli bir email template'i getir
router.get('/email-templates/:id', requireAdmin, async (req, res) => {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: req.params.id }
    })
    
    if (!template) {
      return res.status(404).json({ message: 'Email template bulunamadı' })
    }
    
    res.json(template)
  } catch (error) {
    console.error('Email template get error:', error)
    res.status(500).json({ message: 'Email template alınamadı' })
  }
})

// Email template oluştur
router.post('/email-templates', requireAdmin, async (req, res) => {
  try {
    const { type, name, description, subject, htmlContent, textContent, isActive, variables } = req.body
    
    // Validation
    if (!type || !name || !subject || !htmlContent) {
      return res.status(400).json({ message: 'Zorunlu alanlar: type, name, subject, htmlContent' })
    }
    
    // Aynı type'ta template var mı kontrol et
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { type }
    })
    
    if (existingTemplate) {
      return res.status(400).json({ message: 'Bu tipte bir template zaten mevcut' })
    }
    
    const template = await prisma.emailTemplate.create({
      data: {
        type,
        name,
        description,
        subject,
        htmlContent,
        textContent,
        isActive: isActive !== undefined ? isActive : true,
        variables: variables || []
      }
    })
    
    res.status(201).json(template)
  } catch (error) {
    console.error('Email template create error:', error)
    res.status(500).json({ message: 'Email template oluşturulamadı' })
  }
})

// Email template güncelle
router.put('/email-templates/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, subject, htmlContent, textContent, isActive, variables } = req.body
    
    const template = await prisma.emailTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(subject !== undefined && { subject }),
        ...(htmlContent !== undefined && { htmlContent }),
        ...(textContent !== undefined && { textContent }),
        ...(isActive !== undefined && { isActive }),
        ...(variables !== undefined && { variables })
      }
    })
    
    res.json(template)
  } catch (error) {
    console.error('Email template update error:', error)
    res.status(500).json({ message: 'Email template güncellenemedi' })
  }
})

// Email template sil
router.delete('/email-templates/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.emailTemplate.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Email template silindi' })
  } catch (error) {
    console.error('Email template delete error:', error)
    res.status(500).json({ message: 'Email template silinemedi' })
  }
})

// Email template önizle
router.post('/email-templates/:id/preview', requireAdmin, async (req, res) => {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: req.params.id }
    })

    if (!template) {
      return res.status(404).json({ message: 'Email template bulunamadı' })
    }

    // Örnek değişkenleri oluştur
    const exampleVariables = {
      companyName: 'LeadPortal',
      leadTitle: 'Test Lead',
      amount: '5000',
      newAmount: '6500',
      currency: 'TL',
      leadUrl: 'https://leadportal.com/leads/example-123',
      year: new Date().getFullYear(),
      userName: 'John Doe',
      userEmail: 'john@example.com'
    }

    // Template'i render et
    const rendered = await renderEmailTemplate(template.type, exampleVariables)

    res.json({
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      variables: template.variables || []
    })
  } catch (error) {
    console.error('Email template preview error:', error)
    res.status(500).json({ message: 'Email template önizlenemedi' })
  }
})

// Email template test gönder
router.post('/email-templates/:id/send-test', requireAdmin, async (req, res) => {
  try {
    const { testEmail, leadId } = req.body

    if (!testEmail) {
      return res.status(400).json({ message: 'Test email adresi gerekli' })
    }

    const template = await prisma.emailTemplate.findUnique({
      where: { id: req.params.id }
    })

    if (!template) {
      return res.status(404).json({ message: 'Email template bulunamadı' })
    }

    // Ayarlar ve lead verilerini al
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })

    let variables = {
      companyName: settings?.smtpFromName || 'LeadPortal',
      year: new Date().getFullYear(),
      userName: req.user.firstName || req.user.username || 'Admin',
      userEmail: req.user.email
    }

    // Eğer leadId varsa, lead verilerini kullan
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          bids: {
            orderBy: { createdAt: 'desc' },
            take: 2
          },
          owner: true
        }
      })

      if (lead) {
        const latestBid = lead.bids[0]
        const previousBid = lead.bids[1]

        variables = {
          ...variables,
          leadTitle: lead.title,
          amount: latestBid?.amount?.toString() || lead.startPrice.toString(),
          newAmount: (previousBid ? previousBid.amount : lead.startPrice).toString(),
          currency: 'TL',
          leadUrl: `https://${req.hostname}/leads/${lead.id}`
        }
      }
    } else {
      // Örnek değişkenler
      variables = {
        ...variables,
        leadTitle: 'Test Lead',
        amount: '5000',
        newAmount: '6500',
        currency: 'TL',
        leadUrl: 'https://leadportal.com/leads/example-123'
      }
    }

    // Template'i render et
    const rendered = await renderEmailTemplate(template.type, variables)

    // Test email gönder
    await sendAppEmail({
      to: testEmail,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text
    })

    res.json({
      message: 'Test email gönderildi',
      sentTo: testEmail,
      subject: rendered.subject,
      usedVariables: variables
    })
  } catch (error) {
    console.error('Email template send test error:', error)

    // SMTP ayarları olmadığında veya bağlantı hatası olduğunda
    if (error.message.includes('SMTP') || error.message.includes('connect')) {
      return res.status(400).json({
        message: 'SMTP ayarları yapılandırılmamış. Lütfen admin panelinde email ayarlarını kontrol edin.',
        error: error.message
      })
    }

    res.status(500).json({ message: 'Test email gönderilemedi', error: error.message })
  }
})

// Leads listesini getir (test email için lead seçme)
router.get('/leads-for-test', requireAdmin, async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        startPrice: true,
        bids: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { amount: true }
        },
        owner: {
          select: { firstName: true, username: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    res.json(leads)
  } catch (error) {
    console.error('Error fetching leads for test:', error)
    res.status(500).json({ message: 'Lead\'ler yüklenemedi' })
  }
})

// SMS Template Routes

// Tüm SMS template'leri getir
router.get('/sms-templates', requireAdmin, async (req, res) => {
  try {
    const templates = await prisma.sMSTemplate.findMany({
      orderBy: { type: 'asc' }
    })
    
    // Eğer hiç template yoksa, default template'leri oluştur
    if (templates.length === 0) {
      const createdTemplates = await Promise.all(
        defaultSMSTemplates.map(template => 
          prisma.sMSTemplate.create({ data: template })
        )
      )
      return res.json(createdTemplates)
    }
    
    res.json(templates)
  } catch (error) {
    console.error('SMS templates get error:', error)
    res.status(500).json({ message: 'SMS template\'leri alınamadı' })
  }
})

// Belirli bir SMS template'i getir
router.get('/sms-templates/:id', requireAdmin, async (req, res) => {
  try {
    const template = await prisma.sMSTemplate.findUnique({
      where: { id: req.params.id }
    })
    
    if (!template) {
      return res.status(404).json({ message: 'SMS template bulunamadı' })
    }
    
    res.json(template)
  } catch (error) {
    console.error('SMS template get error:', error)
    res.status(500).json({ message: 'SMS template alınamadı' })
  }
})

// SMS template oluştur
router.post('/sms-templates', requireAdmin, async (req, res) => {
  try {
    const { type, name, description, content, isActive, variables } = req.body
    
    // Validation
    if (!type || !name || !content) {
      return res.status(400).json({ message: 'Zorunlu alanlar: type, name, content' })
    }
    
    // Aynı type'ta template var mı kontrol et
    const existingTemplate = await prisma.sMSTemplate.findUnique({
      where: { type }
    })
    
    if (existingTemplate) {
      return res.status(400).json({ message: 'Bu tipte bir template zaten mevcut' })
    }
    
    const template = await prisma.sMSTemplate.create({
      data: {
        type,
        name,
        description,
        content,
        isActive: isActive !== undefined ? isActive : true,
        variables: variables || []
      }
    })
    
    res.status(201).json(template)
  } catch (error) {
    console.error('SMS template create error:', error)
    res.status(500).json({ message: 'SMS template oluşturulamadı' })
  }
})

// SMS template güncelle
router.put('/sms-templates/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, content, isActive, variables } = req.body
    
    const template = await prisma.sMSTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
        ...(isActive !== undefined && { isActive }),
        ...(variables !== undefined && { variables })
      }
    })
    
    res.json(template)
  } catch (error) {
    console.error('SMS template update error:', error)
    res.status(500).json({ message: 'SMS template güncellenemedi' })
  }
})

// SMS template sil
router.delete('/sms-templates/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.sMSTemplate.delete({
      where: { id: req.params.id }
    })
    
    res.json({ message: 'SMS template silindi' })
  } catch (error) {
    console.error('SMS template delete error:', error)
    res.status(500).json({ message: 'SMS template silinemedi' })
  }
})

// Default template'leri yeniden oluştur
router.post('/reset-defaults', requireAdmin, async (req, res) => {
  try {
    // Mevcut tüm template'leri sil
    await prisma.emailTemplate.deleteMany({})
    await prisma.sMSTemplate.deleteMany({})
    
    // Default template'leri oluştur
    const emailTemplates = await Promise.all(
      defaultEmailTemplates.map(template => 
        prisma.emailTemplate.create({ data: template })
      )
    )
    
    const smsTemplates = await Promise.all(
      defaultSMSTemplates.map(template => 
        prisma.sMSTemplate.create({ data: template })
      )
    )
    
    res.json({ 
      message: 'Default template\'ler yeniden oluşturuldu',
      emailTemplates,
      smsTemplates
    })
  } catch (error) {
    console.error('Reset defaults error:', error)
    res.status(500).json({ message: 'Default template\'ler oluşturulamadı' })
  }
})

export default router

