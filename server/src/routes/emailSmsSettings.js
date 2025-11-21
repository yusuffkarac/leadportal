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

// Email template tipleri und default Inhalte
const defaultEmailTemplates = [
  {
    type: 'bidReceived',
    name: 'Gebot erhalten',
    description: 'E-Mail, die gesendet wird, wenn ein Benutzer ein Gebot für einen Lead abgibt',
    subject: 'Ihr Gebot wurde erhalten: {{leadTitle}}',
    htmlContent: `<div style="background:#f8fafc;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
    <!-- Header with primary color -->
    <tr>
      <td style="background:#1e293b;color:#ffffff;padding:28px 32px;text-align:center;">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">{{companyName}}</h1>
      </td>
    </tr>
    <!-- Success Icon Section -->
    <tr>
      <td style="padding:32px 32px 0;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
          <tr>
            <td style="text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="width:64px;height:64px;background:#f0fdf4;border-radius:50%;text-align:center;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" height="100%">
                      <tr>
                        <td style="text-align:center;vertical-align:middle;padding:8px;">
                          <div style="width:48px;height:48px;background:#059669;border-radius:50%;margin:0 auto;text-align:center;line-height:48px;align-items:center;justify-content:center;">
                            <span style="color:#ffffff;font-size:28px;font-weight:bold;display:inline-block;line-height:48px;vertical-align:middle;">✓</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e293b;">Ihr Gebot wurde erhalten</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">Vielen Dank für Ihr Gebot</p>
      </td>
    </tr>
    <!-- Content Section -->
    <tr>
      <td style="padding:32px;">
        <!-- Lead Info Card -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Anzeige</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#1e293b;line-height:1.4;">{{leadTitle}}</p>
                <p style="margin:0;font-size:13px;color:#64748b;">Anzeigen-ID: <span style="color:#1e293b;font-weight:500;">{{leadId}}</span></p>
              </td>
            </tr>
          </table>
        </div>
        <!-- Bid Amount Card -->
        <div style="background:#f0fdf4;border-left:4px solid #059669;border-radius:6px;padding:20px;margin-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Ihr Gebot</p>
                <p style="margin:0;font-size:28px;font-weight:700;color:#059669;line-height:1.2;">{{amount}} {{currency}}</p>
              </td>
            </tr>
          </table>
        </div>
        <!-- Action Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;width:100%;">
          <tr>
            <td style="text-align:center;">
              <a href="{{leadUrl}}" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">Anzeige ansehen</a>
            </td>
          </tr>
        </table>
        <p style="margin:28px 0 0;font-size:13px;color:#64748b;line-height:1.5;text-align:center;">Diese E-Mail wurde automatisch gesendet. Bitte antworten Sie nicht.</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#64748b;text-align:center;">© {{year}} {{companyName}}. Alle Rechte vorbehalten.</p>
      </td>
    </tr>
  </table>
</div>`,
    textContent: 'Ihr Gebot wurde erhalten\n\nSie haben für die Anzeige {{leadTitle}} ({{leadId}}) ein Gebot von {{amount}} {{currency}} abgegeben.\n\nAnzeige ansehen: {{leadUrl}}\n\n© {{year}} {{companyName}}',
    variables: ['companyName', 'leadTitle', 'leadId', 'amount', 'currency', 'leadUrl', 'year']
  },
  {
    type: 'outbid',
    name: 'Gebot überboten',
    description: 'E-Mail, die gesendet wird, wenn das Gebot des Benutzers von einem anderen Gebot überboten wurde',
    subject: 'Höheres Gebot abgegeben: {{leadTitle}}',
    htmlContent: `<div style="background:#f8fafc;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
    <!-- Header with primary color -->
    <tr>
      <td style="background:#1e293b;color:#ffffff;padding:28px 32px;text-align:center;">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">{{companyName}}</h1>
      </td>
    </tr>
    <!-- Warning Icon Section -->
    <tr>
      <td style="padding:32px 32px 0;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
          <tr>
            <td style="text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="width:64px;height:64px;background:#fef3c7;border-radius:50%;text-align:center;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" height="100%">
                      <tr>
                        <td style="text-align:center;vertical-align:middle;padding:8px;">
                          <div style="width:48px;height:48px;background:#d97706;border-radius:50%;margin:0 auto;text-align:center;line-height:48px;align-items:center;justify-content:center;">
                            <span style="color:#ffffff;font-size:28px;font-weight:bold;display:inline-block;line-height:48px;vertical-align:middle;">⬆</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e293b;">Ihr Gebot wurde überboten</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">Ein höheres Gebot wurde abgegeben</p>
      </td>
    </tr>
    <!-- Content Section -->
    <tr>
      <td style="padding:32px;">
        <!-- Lead Info Card -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Anzeige</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#1e293b;line-height:1.4;">{{leadTitle}}</p>
                <p style="margin:0;font-size:13px;color:#64748b;">Anzeigen-ID: <span style="color:#1e293b;font-weight:500;">{{leadId}}</span></p>
              </td>
            </tr>
          </table>
        </div>
        <!-- New Bid Amount Card -->
        <div style="background:#fef3c7;border-left:4px solid #d97706;border-radius:6px;padding:20px;margin-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Neues Höchstgebot</p>
                <p style="margin:0;font-size:28px;font-weight:700;color:#d97706;line-height:1.2;">{{newAmount}} {{currency}}</p>
              </td>
            </tr>
          </table>
        </div>
        <!-- Action Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;width:100%;">
          <tr>
            <td style="text-align:center;">
              <a href="{{leadUrl}}" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">Anzeige ansehen und bieten</a>
            </td>
          </tr>
        </table>
        <p style="margin:28px 0 0;font-size:13px;color:#64748b;line-height:1.5;text-align:center;">Diese E-Mail wurde automatisch gesendet.</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#64748b;text-align:center;">© {{year}} {{companyName}}. Alle Rechte vorbehalten.</p>
      </td>
    </tr>
  </table>
</div>`,
    textContent: 'Ihr Gebot wurde überboten\n\nNeues Gebot für {{leadTitle}} ({{leadId}}): {{newAmount}} {{currency}}.\n\nAnzeige: {{leadUrl}}\n\n© {{year}} {{companyName}}',
    variables: ['companyName', 'leadTitle', 'leadId', 'newAmount', 'currency', 'leadUrl', 'year']
  },
  {
    type: 'leadWon',
    name: 'Auktion gewonnen',
    description: 'E-Mail, die gesendet wird, wenn ein Benutzer eine Auktion gewinnt',
    subject: 'Glückwunsch! Sie haben die Auktion gewonnen: {{leadTitle}}',
    htmlContent: `<div style="background:#f8fafc;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
    <!-- Header with primary color -->
    <tr>
      <td style="background:#1e293b;color:#ffffff;padding:28px 32px;text-align:center;">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">{{companyName}}</h1>
      </td>
    </tr>
    <!-- Success Icon Section -->
    <tr>
      <td style="padding:32px 32px 0;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
          <tr>
            <td style="text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="width:64px;height:64px;background:#f0fdf4;border-radius:50%;text-align:center;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" height="100%">
                      <tr>
                        <td style="text-align:center;vertical-align:middle;padding:8px;">
                          <div style="width:48px;height:48px;background:#059669;border-radius:50%;margin:0 auto;text-align:center;line-height:48px;align-items:center;justify-content:center;">
                            <span style="color:#ffffff;font-size:28px;font-weight:bold;display:inline-block;line-height:48px;vertical-align:middle;">🎉</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e293b;">Glückwunsch!</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">Sie haben die Auktion gewonnen</p>
      </td>
    </tr>
    <!-- Content Section -->
    <tr>
      <td style="padding:32px;">
        <!-- Lead Info Card -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Gewonnene Anzeige</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#1e293b;line-height:1.4;">{{leadTitle}}</p>
                <p style="margin:0;font-size:13px;color:#64748b;">Anzeigen-ID: <span style="color:#1e293b;font-weight:500;">{{leadId}}</span></p>
              </td>
            </tr>
          </table>
        </div>
        <!-- Winning Bid Amount Card -->
        <div style="background:#f0fdf4;border-left:4px solid #059669;border-radius:6px;padding:20px;margin-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Gewinngebot</p>
                <p style="margin:0;font-size:28px;font-weight:700;color:#059669;line-height:1.2;">{{amount}} {{currency}}</p>
              </td>
            </tr>
          </table>
        </div>
        <!-- Action Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;width:100%;">
          <tr>
            <td style="text-align:center;">
              <a href="{{leadUrl}}" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">Lead-Details ansehen</a>
            </td>
          </tr>
        </table>
        <p style="margin:28px 0 0;font-size:13px;color:#64748b;line-height:1.5;text-align:center;">Diese E-Mail wurde automatisch gesendet.</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#64748b;text-align:center;">© {{year}} {{companyName}}. Alle Rechte vorbehalten.</p>
      </td>
    </tr>
  </table>
</div>`,
    textContent: 'Glückwunsch!\n\nSie haben die Auktion für {{leadTitle}} ({{leadId}}) für {{amount}} {{currency}} gewonnen!\n\nLead-Details: {{leadUrl}}\n\n© {{year}} {{companyName}}',
    variables: ['companyName', 'leadTitle', 'leadId', 'amount', 'currency', 'leadUrl', 'year']
  },
  {
    type: 'leadExpired',
    name: 'Auktion abgelaufen',
    description: 'E-Mail, die gesendet wird, wenn eine verfolgte Auktion abgelaufen ist',
    subject: 'Auktion abgelaufen: {{leadTitle}}',
    htmlContent: `<div style="background:#f8fafc;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
    <!-- Header with primary color -->
    <tr>
      <td style="background:#1e293b;color:#ffffff;padding:28px 32px;text-align:center;">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">{{companyName}}</h1>
      </td>
    </tr>
    <!-- Info Icon Section -->
    <tr>
      <td style="padding:32px 32px 0;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
          <tr>
            <td style="text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="width:64px;height:64px;background:#f3f4f6;border-radius:50%;text-align:center;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" height="100%">
                      <tr>
                        <td style="text-align:center;vertical-align:middle;padding:8px;">
                          <div style="width:48px;height:48px;background:#64748b;border-radius:50%;margin:0 auto;text-align:center;line-height:48px;align-items:center;justify-content:center;">
                            <span style="color:#ffffff;font-size:28px;font-weight:bold;display:inline-block;line-height:48px;vertical-align:middle;">⏱</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e293b;">Auktion abgelaufen</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">Die Auktion ist beendet</p>
      </td>
    </tr>
    <!-- Content Section -->
    <tr>
      <td style="padding:32px;">
        <!-- Lead Info Card -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Abgelaufene Anzeige</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#1e293b;line-height:1.4;">{{leadTitle}}</p>
                <p style="margin:0;font-size:13px;color:#64748b;">Anzeigen-ID: <span style="color:#1e293b;font-weight:500;">{{leadId}}</span></p>
              </td>
            </tr>
          </table>
        </div>
        <!-- Action Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;width:100%;">
          <tr>
            <td style="text-align:center;">
              <a href="{{leadUrl}}" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">Neue Auktionen ansehen</a>
            </td>
          </tr>
        </table>
        <p style="margin:28px 0 0;font-size:13px;color:#64748b;line-height:1.5;text-align:center;">Diese E-Mail wurde automatisch gesendet.</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#64748b;text-align:center;">© {{year}} {{companyName}}. Alle Rechte vorbehalten.</p>
      </td>
    </tr>
  </table>
</div>`,
    textContent: 'Auktion abgelaufen\n\nDie Auktion für {{leadTitle}} ({{leadId}}) ist beendet.\n\nNeue Auktionen: {{leadUrl}}\n\n© {{year}} {{companyName}}',
    variables: ['companyName', 'leadTitle', 'leadId', 'leadUrl', 'year']
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

// Default template'leri yeniden oluştur (mevcut template'leri güncelle)
router.post('/reset-defaults', requireAdmin, async (req, res) => {
  try {
    // Default email template'leri güncelle veya oluştur (upsert)
    const emailTemplates = await Promise.all(
      defaultEmailTemplates.map(template => 
        prisma.emailTemplate.upsert({
          where: { type: template.type },
          update: {
            name: template.name,
            description: template.description,
            subject: template.subject,
            htmlContent: template.htmlContent,
            textContent: template.textContent,
            variables: template.variables,
            isActive: true
          },
          create: template
        })
      )
    )
    
    // Default SMS template'leri güncelle veya oluştur (upsert)
    const smsTemplates = await Promise.all(
      defaultSMSTemplates.map(template => 
        prisma.sMSTemplate.upsert({
          where: { type: template.type },
          update: {
            name: template.name,
            description: template.description,
            content: template.content,
            variables: template.variables,
            isActive: true
          },
          create: template
        })
      )
    )
    
    res.json({ 
      message: 'Standard-Vorlagen wurden aktualisiert',
      emailTemplates,
      smsTemplates
    })
  } catch (error) {
    console.error('Reset defaults error:', error)
    res.status(500).json({ message: 'Standard-Vorlagen konnten nicht aktualisiert werden' })
  }
})

export default router

