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
      return res.status(401).json({ message: 'Token erforderlich' })
    }

    const jwt = await import('jsonwebtoken')
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    })

    if (!user || (user.userTypeId !== 'ADMIN' && user.userTypeId !== 'SUPERADMIN')) {
      return res.status(403).json({ message: 'Admin-Berechtigung erforderlich' })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Admin check error:', error)
    res.status(500).json({ message: 'Serverfehler' })
  }
}

// Email template tipleri ve default içerikleri
const defaultEmailTemplates = [
  {
    type: 'bidReceived',
    name: 'Gebot erhalten',
    description: 'E-Mail, die gesendet wird, wenn ein Benutzer ein Gebot für einen Lead abgibt',
    subject: 'Ihr Gebot wurde erhalten: {{leadTitle}}',
    htmlContent: `<div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#2563eb;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;">
        {{companyName}}
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">Ihr Gebot wurde erhalten</h1>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">
          Sie haben für die Anzeige <strong style="color:#111827;">{{leadTitle}}</strong> ein Gebot von <strong style="color:#111827;">{{amount}} {{currency}}</strong> abgegeben.
        </p>
        <a href="{{leadUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Anzeige ansehen</a>
        <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Diese E-Mail wurde automatisch gesendet. Bitte antworten Sie nicht.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">
        © {{year}} {{companyName}}
      </td>
    </tr>
  </table>
</div>`,
    textContent: 'Ihr Gebot wurde erhalten\n\nSie haben für die Anzeige {{leadTitle}} ein Gebot von {{amount}} {{currency}} abgegeben.\n\nAnzeige ansehen: {{leadUrl}}\n\n{{companyName}}',
    variables: ['companyName', 'leadTitle', 'amount', 'currency', 'leadUrl', 'year']
  },
  {
    type: 'outbid',
    name: 'Gebot überboten',
    description: 'E-Mail, die gesendet wird, wenn das Gebot des Benutzers von einem anderen Gebot überboten wurde',
    subject: 'Höheres Gebot abgegeben: {{leadTitle}}',
    htmlContent: `<div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#dc2626;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;">
        {{companyName}}
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">Ihr Gebot wurde überboten</h1>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">
          Für die Anzeige <strong>{{leadTitle}}</strong> wurde ein höheres Gebot abgegeben als Ihres: <strong>{{newAmount}} {{currency}}</strong>.
        </p>
        <a href="{{leadUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Anzeige ansehen und bieten</a>
        <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Diese E-Mail wurde automatisch gesendet.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">
        © {{year}} {{companyName}}
      </td>
    </tr>
  </table>
</div>`,
    textContent: 'Ihr Gebot wurde überboten\n\nNeues Gebot für {{leadTitle}}: {{newAmount}} {{currency}}.\n\nAnzeige: {{leadUrl}}\n\n{{companyName}}',
    variables: ['companyName', 'leadTitle', 'newAmount', 'currency', 'leadUrl', 'year']
  },
  {
    type: 'leadWon',
    name: 'Auktion gewonnen',
    description: 'E-Mail, die gesendet wird, wenn ein Benutzer eine Auktion gewinnt',
    subject: 'Glückwunsch! Sie haben die Auktion gewonnen: {{leadTitle}}',
    htmlContent: `<div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#059669;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;">
        {{companyName}}
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">🎉 Glückwunsch!</h1>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">
          Sie haben die Auktion für <strong>{{leadTitle}}</strong> für <strong>{{amount}} {{currency}}</strong> gewonnen!
        </p>
        <a href="{{leadUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Lead-Details ansehen</a>
        <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Diese E-Mail wurde automatisch gesendet.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">
        © {{year}} {{companyName}}
      </td>
    </tr>
  </table>
</div>`,
    textContent: 'Glückwunsch!\n\nSie haben die Auktion für {{leadTitle}} für {{amount}} {{currency}} gewonnen!\n\nLead-Details: {{leadUrl}}\n\n{{companyName}}',
    variables: ['companyName', 'leadTitle', 'amount', 'currency', 'leadUrl', 'year']
  },
  {
    type: 'leadExpired',
    name: 'Auktion abgelaufen',
    description: 'E-Mail, die gesendet wird, wenn eine verfolgte Auktion abgelaufen ist',
    subject: 'Auktion abgelaufen: {{leadTitle}}',
    htmlContent: `<div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#6b7280;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;">
        {{companyName}}
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">Auktion abgelaufen</h1>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">
          Die Auktion für <strong>{{leadTitle}}</strong> ist beendet.
        </p>
        <a href="{{leadUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Neue Auktionen ansehen</a>
        <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Diese E-Mail wurde automatisch gesendet.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">
        © {{year}} {{companyName}}
      </td>
    </tr>
  </table>
</div>`,
    textContent: 'Auktion abgelaufen\n\nDie Auktion für {{leadTitle}} ist beendet.\n\nNeue Auktionen: {{leadUrl}}\n\n{{companyName}}',
    variables: ['companyName', 'leadTitle', 'leadUrl', 'year']
  }
]

const defaultSMSTemplates = [
  {
    type: 'bidReceived',
    name: 'Gebot erhalten',
    description: 'SMS, die gesendet wird, wenn ein Benutzer ein Gebot für einen Lead abgibt',
    content: 'Sie haben für {{leadTitle}} ein Gebot von {{amount}} {{currency}} abgegeben. {{companyName}}',
    variables: ['leadTitle', 'amount', 'currency', 'companyName']
  },
  {
    type: 'outbid',
    name: 'Gebot überboten',
    description: 'SMS, die gesendet wird, wenn das Gebot des Benutzers überboten wurde',
    content: 'Ihr Gebot für {{leadTitle}} wurde überboten. Neues Gebot: {{newAmount}} {{currency}}. {{companyName}}',
    variables: ['leadTitle', 'newAmount', 'currency', 'companyName']
  },
  {
    type: 'leadWon',
    name: 'Auktion gewonnen',
    description: 'SMS, die gesendet wird, wenn ein Benutzer eine Auktion gewinnt',
    content: 'Glückwunsch! Sie haben die Auktion für {{leadTitle}} für {{amount}} {{currency}} gewonnen. {{companyName}}',
    variables: ['leadTitle', 'amount', 'currency', 'companyName']
  },
  {
    type: 'leadExpired',
    name: 'Auktion abgelaufen',
    description: 'SMS, die gesendet wird, wenn eine verfolgte Auktion abgelaufen ist',
    content: 'Die Auktion für {{leadTitle}} ist beendet. {{companyName}}',
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
    res.status(500).json({ message: 'E-Mail-Vorlagen konnten nicht abgerufen werden' })
  }
})

// Belirli bir email template'i getir
router.get('/email-templates/:id', requireAdmin, async (req, res) => {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: req.params.id }
    })
    
    if (!template) {
      return res.status(404).json({ message: 'E-Mail-Vorlage nicht gefunden' })
    }
    
    res.json(template)
  } catch (error) {
    console.error('Email template get error:', error)
    res.status(500).json({ message: 'E-Mail-Vorlage konnte nicht abgerufen werden' })
  }
})

// Email template oluştur
router.post('/email-templates', requireAdmin, async (req, res) => {
  try {
    const { type, name, description, subject, htmlContent, textContent, isActive, variables } = req.body
    
    // Validation
    if (!type || !name || !subject || !htmlContent) {
      return res.status(400).json({ message: 'Pflichtfelder: type, name, subject, htmlContent' })
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
    res.status(500).json({ message: 'E-Mail-Vorlage konnte nicht erstellt werden' })
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
    res.status(500).json({ message: 'E-Mail-Vorlage konnte nicht aktualisiert werden' })
  }
})

// Email template sil
router.delete('/email-templates/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.emailTemplate.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'E-Mail-Vorlage gelöscht' })
  } catch (error) {
    console.error('Email template delete error:', error)
    res.status(500).json({ message: 'E-Mail-Vorlage konnte nicht gelöscht werden' })
  }
})

// Email template önizle
router.post('/email-templates/:id/preview', requireAdmin, async (req, res) => {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: req.params.id }
    })

    if (!template) {
      return res.status(404).json({ message: 'E-Mail-Vorlage nicht gefunden' })
    }

    // Örnek değişkenleri oluştur
    const exampleVariables = {
      companyName: 'LeadPortal',
      leadTitle: 'Test Lead',
      leadId: 'example-123',
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
    res.status(500).json({ message: 'E-Mail-Vorlage konnte nicht in der Vorschau angezeigt werden' })
  }
})

// Email template test gönder
router.post('/email-templates/:id/send-test', requireAdmin, async (req, res) => {
  try {
    const { testEmail, leadId } = req.body

    if (!testEmail) {
      return res.status(400).json({ message: 'Test-E-Mail-Adresse erforderlich' })
    }

    const template = await prisma.emailTemplate.findUnique({
      where: { id: req.params.id }
    })

    if (!template) {
      return res.status(404).json({ message: 'E-Mail-Vorlage nicht gefunden' })
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
          leadId: lead.id,
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
        leadId: 'example-123',
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
      message: 'Test-E-Mail gesendet',
      sentTo: testEmail,
      subject: rendered.subject,
      usedVariables: variables
    })
  } catch (error) {
    console.error('Email template send test error:', error)

    // SMTP ayarları olmadığında veya bağlantı hatası olduğunda
    if (error.message.includes('SMTP') || error.message.includes('connect')) {
      return res.status(400).json({
        message: 'SMTP-Einstellungen nicht konfiguriert. Bitte überprüfen Sie die E-Mail-Einstellungen im Admin-Panel.',
        error: error.message
      })
    }

    res.status(500).json({ message: 'Test-E-Mail konnte nicht gesendet werden', error: error.message })
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
    res.status(500).json({ message: 'Leads konnten nicht geladen werden' })
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
    res.status(500).json({ message: 'SMS-Vorlagen konnten nicht abgerufen werden' })
  }
})

// Belirli bir SMS template'i getir
router.get('/sms-templates/:id', requireAdmin, async (req, res) => {
  try {
    const template = await prisma.sMSTemplate.findUnique({
      where: { id: req.params.id }
    })
    
    if (!template) {
      return res.status(404).json({ message: 'SMS-Vorlage nicht gefunden' })
    }
    
    res.json(template)
  } catch (error) {
    console.error('SMS template get error:', error)
    res.status(500).json({ message: 'SMS-Vorlage konnte nicht abgerufen werden' })
  }
})

// SMS template oluştur
router.post('/sms-templates', requireAdmin, async (req, res) => {
  try {
    const { type, name, description, content, isActive, variables } = req.body
    
    // Validation
    if (!type || !name || !content) {
      return res.status(400).json({ message: 'Pflichtfelder: type, name, content' })
    }
    
    // Aynı type'ta template var mı kontrol et
    const existingTemplate = await prisma.sMSTemplate.findUnique({
      where: { type }
    })
    
    if (existingTemplate) {
      return res.status(400).json({ message: 'Eine Vorlage dieses Typs existiert bereits' })
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
    res.status(500).json({ message: 'SMS-Vorlage konnte nicht erstellt werden' })
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
    res.status(500).json({ message: 'SMS-Vorlage konnte nicht aktualisiert werden' })
  }
})

// SMS template sil
router.delete('/sms-templates/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.sMSTemplate.delete({
      where: { id: req.params.id }
    })
    
    res.json({ message: 'SMS-Vorlage gelöscht' })
  } catch (error) {
    console.error('SMS template delete error:', error)
    res.status(500).json({ message: 'SMS-Vorlage konnte nicht gelöscht werden' })
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
      message: 'Standard-Vorlagen wurden neu erstellt',
      emailTemplates,
      smsTemplates
    })
  } catch (error) {
    console.error('Reset defaults error:', error)
    res.status(500).json({ message: 'Standard-Vorlagen konnten nicht erstellt werden' })
  }
})

export default router

