import nodemailer from 'nodemailer'
import { PrismaClient } from '../prismaClient.js'
import { currentYear } from './dateTimeUtils.js'

const prisma = new PrismaClient()

/**
 * SMTP ayarlarını yükle
 */
async function getSMTPSettings() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })

    if (!settings || !settings.smtpHost || !settings.smtpUser) {
      console.warn('SMTP settings not configured')
      return null
    }

    return settings
  } catch (error) {
    console.error('Error loading SMTP settings:', error)
    return null
  }
}

/**
 * Email gönder
 * @param {Object} options
 * @param {string} options.to - Alıcı email adresi
 * @param {string} options.subject - Email konusu
 * @param {string} options.html - HTML içerik
 * @param {string} options.text - Düz metin içerik (optional)
 */
export async function sendEmail({ to, subject, html, text }) {
  const settings = await getSMTPSettings()

  // Development mode: SMTP yapılandırılmamışsa console'a yazdır
  if (!settings || !settings.smtpHost || !settings.smtpUser) {
    console.log('\n' + '='.repeat(80))
    console.log('📧 EMAIL GÖNDERME (DEVELOPMENT MODE - SMTP NOT CONFIGURED)')
    console.log('='.repeat(80))
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('Text:', text)
    console.log('HTML Preview:', html.substring(0, 200) + '...')
    console.log('='.repeat(80) + '\n')

    // Development modunda başarılı say
    return { success: true, messageId: 'dev-mode-' + Date.now() }
  }

  try {
    // Nodemailer transporter oluştur
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpUseSSL, // true for 465, false for other ports
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass
      },
      tls: settings.smtpUseTLS ? {
        rejectUnauthorized: false
      } : undefined
    })

    // Email gönder
    const info = await transporter.sendMail({
      from: `"${settings.smtpFromName}" <${settings.smtpUser}>`,
      to,
      subject,
      text: text || '',
      html
    })

    console.log('Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Email sending error:', error)
    
    // SMTP kimlik doğrulama hatası durumunda development moduna geç
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.log('\n' + '='.repeat(80))
      console.log('📧 EMAIL GÖNDERME (DEVELOPMENT MODE - SMTP AUTH FAILED)')
      console.log('='.repeat(80))
      console.log('To:', to)
      console.log('Subject:', subject)
      console.log('Text:', text)
      console.log('HTML Preview:', html.substring(0, 200) + '...')
      console.log('='.repeat(80) + '\n')
      
      return { success: true, messageId: 'dev-mode-auth-failed-' + Date.now() }
    }
    
    return { success: false, error: error.message }
  }
}

/**
 * Şifre sıfırlama emaili gönder
 */
export async function sendPasswordResetEmail({ email, resetToken, userName }) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`

  // Development mode için console'a link yazdır
  console.log('\n' + '🔐 PASSWORD RESET LINK '.padEnd(80, '='))
  console.log('Email:', email)
  console.log('Reset Link:', resetUrl)
  console.log('Token:', resetToken)
  console.log('Valid for: 1 hour')
  console.log('='.repeat(80) + '\n')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f8fafc;
        }
        .email-wrapper { 
          width: 100%; 
          background-color: #f8fafc; 
          padding: 20px 0;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content { 
          padding: 40px 30px; 
          background: #ffffff;
        }
        .content p {
          margin: 0 0 16px 0;
          font-size: 16px;
          line-height: 1.6;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .button { 
          display: inline-block; 
          background: #3b82f6; 
          color: white!important; 
          padding: 16px 32px; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600;
          font-size: 16px;
          transition: background-color 0.2s;
        }
        .button:hover {
          background: #2563eb;
        }
        .link-container {
          margin: 20px 0;
          padding: 16px;
          background: #f1f5f9;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .link-text {
          word-break: break-all; 
          font-size: 14px;
          color: #3b82f6;
          font-family: 'Courier New', monospace;
        }
        .warning { 
          background: #fef3c7; 
          border: 1px solid #f59e0b;
          border-left: 4px solid #f59e0b; 
          padding: 16px; 
          margin: 24px 0; 
          border-radius: 6px;
        }
        .warning strong {
          color: #92400e;
        }
        .footer { 
          text-align: center; 
          padding: 20px 30px;
          background: #f8fafc;
          color: #64748b; 
          font-size: 14px; 
          border-top: 1px solid #e2e8f0;
        }
        .footer p {
          margin: 4px 0;
        }
        @media only screen and (max-width: 600px) {
          .email-wrapper {
            padding: 10px 0;
          }
          .container {
            margin: 0 10px;
            border-radius: 8px;
          }
          .header {
            padding: 24px 16px;
          }
          .header h1 {
            font-size: 20px;
          }
          .content {
            padding: 24px 20px;
          }
          .button {
            padding: 14px 24px;
            font-size: 15px;
          }
          .footer {
            padding: 16px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <h1>Şifre Sıfırlama</h1>
          </div>
          <div class="content">
            <p>Merhaba${userName ? ' ' + userName : ''},</p>

            <p>Hesabınız için şifre sıfırlama talebinde bulunuldu. Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>

            <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>

            <div class="button-container">
              <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>
            </div>

            <p>Veya aşağıdaki linki tarayıcınıza kopyalayın:</p>
            
            <div class="link-container">
              <div class="link-text">${resetUrl}</div>
            </div>

            <div class="warning">
              <strong>⚠️ Önemli:</strong> Bu link 1 saat içinde geçersiz olacaktır.
            </div>

            <p>Güvenlik nedeniyle, bu linki kimseyle paylaşmayın.</p>
          </div>
          <div class="footer">
            <p>Bu email otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
            <p>&copy; ${currentYear()} LeadPortal. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Merhaba${userName ? ' ' + userName : ''},

Hesabınız için şifre sıfırlama talebinde bulunuldu.

Şifrenizi sıfırlamak için aşağıdaki linki ziyaret edin:
${resetUrl}

Bu link 1 saat içinde geçersiz olacaktır.

Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.

LeadPortal
  `

  return sendEmail({
    to: email,
    subject: 'Şifre Sıfırlama Talebi',
    html,
    text
  })
}

/**
 * Şablon kullanarak bildirim emaili gönder
 * @param {Object} options
 * @param {string} options.to - Alıcı email adresi
 * @param {string} options.template - Template türü
 * @param {Object} options.variables - Şablon değişkenleri
 */
export async function sendNotificationEmail({ to, template, variables = {} }) {
  try {
    console.log(`[EmailSender] Sending notification email - Template: ${template}, To: ${to}`)
    
    // Email template'i bul
    let emailTemplate = await prisma.emailTemplate.findUnique({
      where: { type: template }
    })
    
    console.log(`[EmailSender] Template found: ${!!emailTemplate}, Active: ${emailTemplate?.isActive}`)

    // Eğer template yoksa, otomatik olarak oluştur
    if (!emailTemplate || !emailTemplate.isActive) {
      console.log(`Email template ${template} not found or inactive, creating it...`)
      
      // NEW_USER_REGISTRATION template'i
      if (template === 'NEW_USER_REGISTRATION') {
        emailTemplate = await prisma.emailTemplate.upsert({
          where: { type: template },
          update: { 
            isActive: true,
            subject: 'Neue Registrierungsanfrage - {{userName}}',
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
                  <td style="width:64px;height:64px;background:#eff6ff;border-radius:50%;text-align:center;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" height="100%">
                      <tr>
                        <td style="text-align:center;vertical-align:middle;padding:8px;">
                          <div style="width:48px;height:48px;background:#1e293b;border-radius:50%;margin:0 auto;text-align:center;line-height:48px;align-items:center;justify-content:center;">
                            <span style="color:#ffffff;font-size:28px;font-weight:bold;display:inline-block;line-height:48px;vertical-align:middle;">👤</span>
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
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e293b;">Neue Registrierungsanfrage</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">Ein neuer Benutzer möchte sich registrieren</p>
      </td>
    </tr>
    <!-- Content Section -->
    <tr>
      <td style="padding:32px;">
        <!-- User Info Card -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Benutzerinformationen</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;"><strong style="color:#1e293b;">Name:</strong> {{firstName}} {{lastName}}</p>
                <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;"><strong style="color:#1e293b;">E-Mail:</strong> {{email}}</p>
                <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;"><strong style="color:#1e293b;">Registrierungsdatum:</strong> {{registrationDate}}</p>
              </td>
            </tr>
          </table>
        </div>
        <!-- Action Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;width:100%;">
          <tr>
            <td style="text-align:center;">
              <a href="{{appUrl}}/admin/pending-users" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">Ausstehende Benutzer ansehen</a>
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
            textContent: `Neue Registrierungsanfrage\n\nName: {{firstName}} {{lastName}}\nE-Mail: {{email}}\nRegistrierungsdatum: {{registrationDate}}\n\nAusstehende Benutzer ansehen: {{appUrl}}/admin/pending-users\n\n© {{year}} {{companyName}}`,
            variables: ['firstName', 'lastName', 'userName', 'email', 'registrationDate', 'appUrl', 'companyName', 'year']
          },
          create: {
            type: template,
            name: 'Neue Benutzerregistrierung',
            description: 'Benachrichtigung an Admin über neue Registrierungsanfrage',
            subject: 'Neue Registrierungsanfrage - {{userName}}',
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
                  <td style="width:64px;height:64px;background:#eff6ff;border-radius:50%;text-align:center;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" height="100%">
                      <tr>
                        <td style="text-align:center;vertical-align:middle;padding:8px;">
                          <div style="width:48px;height:48px;background:#1e293b;border-radius:50%;margin:0 auto;text-align:center;line-height:48px;align-items:center;justify-content:center;">
                            <span style="color:#ffffff;font-size:28px;font-weight:bold;display:inline-block;line-height:48px;vertical-align:middle;">👤</span>
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
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e293b;">Neue Registrierungsanfrage</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">Ein neuer Benutzer möchte sich registrieren</p>
      </td>
    </tr>
    <!-- Content Section -->
    <tr>
      <td style="padding:32px;">
        <!-- User Info Card -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Benutzerinformationen</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;"><strong style="color:#1e293b;">Name:</strong> {{firstName}} {{lastName}}</p>
                <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;"><strong style="color:#1e293b;">E-Mail:</strong> {{email}}</p>
                <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;"><strong style="color:#1e293b;">Registrierungsdatum:</strong> {{registrationDate}}</p>
              </td>
            </tr>
          </table>
        </div>
        <!-- Action Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;width:100%;">
          <tr>
            <td style="text-align:center;">
              <a href="{{appUrl}}/admin/pending-users" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">Ausstehende Benutzer ansehen</a>
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
            textContent: `Neue Registrierungsanfrage\n\nName: {{firstName}} {{lastName}}\nE-Mail: {{email}}\nRegistrierungsdatum: {{registrationDate}}\n\nAusstehende Benutzer ansehen: {{appUrl}}/admin/pending-users\n\n© {{year}} {{companyName}}`,
            isActive: true,
            variables: ['firstName', 'lastName', 'userName', 'email', 'registrationDate', 'appUrl', 'companyName', 'year']
          }
        })
      }
      // REGISTRATION_PENDING_CONFIRMATION template'i
      else if (template === 'REGISTRATION_PENDING_CONFIRMATION') {
        emailTemplate = await prisma.emailTemplate.upsert({
          where: { type: template },
          update: { 
            isActive: true,
            subject: 'Ihre Registrierung wurde erhalten - Admin-Genehmigung ausstehend',
            htmlContent: `<div style="background:#f8fafc;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
    <!-- Header with primary color -->
    <tr>
      <td style="background:#1e293b;color:#ffffff;padding:28px 32px;text-align:center;">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">{{companyName}}</h1>
      </td>
    </tr>
    <!-- Welcome Icon Section -->
    <tr>
      <td style="padding:32px 32px 0;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
          <tr>
            <td style="text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="width:64px;height:64px;background:#eff6ff;border-radius:50%;text-align:center;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" height="100%">
                      <tr>
                        <td style="text-align:center;vertical-align:middle;padding:8px;">
                          <div style="width:48px;height:48px;background:#1e293b;border-radius:50%;margin:0 auto;text-align:center;line-height:48px;align-items:center;justify-content:center;">
                            <span style="color:#ffffff;font-size:28px;font-weight:bold;display:inline-block;line-height:48px;vertical-align:middle;">👋</span>
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
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e293b;">Willkommen!</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">Ihre Registrierung wurde erhalten</p>
      </td>
    </tr>
    <!-- Content Section -->
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Hallo {{firstName}},</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">vielen Dank für Ihre Registrierung bei {{companyName}}.</p>
        <!-- Info Card -->
        <div style="background:#f0f9ff;border-left:4px solid #1e293b;border-radius:6px;padding:20px;margin-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1e293b;">Admin-Genehmigung ausstehend</p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">Ihre Registrierung wurde erhalten und wartet auf die Admin-Genehmigung. Nach der Genehmigung haben Sie Zugriff auf alle Funktionen.</p>
                <p style="margin:12px 0 0;font-size:13px;color:#64748b;">Dieser Vorgang wird in der Regel innerhalb von 24 Stunden abgeschlossen.</p>
              </td>
            </tr>
          </table>
        </div>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">Falls Sie Fragen haben, können Sie uns unter <a href="mailto:{{supportEmail}}" style="color:#1e293b;text-decoration:underline;">{{supportEmail}}</a> kontaktieren.</p>
        <p style="margin:0;font-size:16px;line-height:1.6;color:#374151;">Willkommen!<br/>Das {{companyName}} Team</p>
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
            textContent: `Willkommen!\n\nHallo {{firstName}},\n\nvielen Dank für Ihre Registrierung bei {{companyName}}.\n\nIhre Registrierung wurde erhalten und wartet auf die Admin-Genehmigung. Nach der Genehmigung haben Sie Zugriff auf alle Funktionen.\n\nDieser Vorgang wird in der Regel innerhalb von 24 Stunden abgeschlossen.\n\nFalls Sie Fragen haben, können Sie uns unter {{supportEmail}} kontaktieren.\n\nDas {{companyName}} Team\n\n© {{year}} {{companyName}}`,
            variables: ['firstName', 'supportEmail', 'companyName', 'year']
          },
          create: {
            type: template,
            name: 'Registrierung erhalten',
            description: 'Bestätigungs-E-Mail an Benutzer nach Registrierung',
            subject: 'Ihre Registrierung wurde erhalten - Admin-Genehmigung ausstehend',
            htmlContent: `<div style="background:#f8fafc;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
    <!-- Header with primary color -->
    <tr>
      <td style="background:#1e293b;color:#ffffff;padding:28px 32px;text-align:center;">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">{{companyName}}</h1>
      </td>
    </tr>
    <!-- Welcome Icon Section -->
    <tr>
      <td style="padding:32px 32px 0;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
          <tr>
            <td style="text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="width:64px;height:64px;background:#eff6ff;border-radius:50%;text-align:center;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" height="100%">
                      <tr>
                        <td style="text-align:center;vertical-align:middle;padding:8px;">
                          <div style="width:48px;height:48px;background:#1e293b;border-radius:50%;margin:0 auto;text-align:center;line-height:48px;align-items:center;justify-content:center;">
                            <span style="color:#ffffff;font-size:28px;font-weight:bold;display:inline-block;line-height:48px;vertical-align:middle;">👋</span>
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
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e293b;">Willkommen!</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">Ihre Registrierung wurde erhalten</p>
      </td>
    </tr>
    <!-- Content Section -->
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Hallo {{firstName}},</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">vielen Dank für Ihre Registrierung bei {{companyName}}.</p>
        <!-- Info Card -->
        <div style="background:#f0f9ff;border-left:4px solid #1e293b;border-radius:6px;padding:20px;margin-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1e293b;">Admin-Genehmigung ausstehend</p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">Ihre Registrierung wurde erhalten und wartet auf die Admin-Genehmigung. Nach der Genehmigung haben Sie Zugriff auf alle Funktionen.</p>
                <p style="margin:12px 0 0;font-size:13px;color:#64748b;">Dieser Vorgang wird in der Regel innerhalb von 24 Stunden abgeschlossen.</p>
              </td>
            </tr>
          </table>
        </div>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">Falls Sie Fragen haben, können Sie uns unter <a href="mailto:{{supportEmail}}" style="color:#1e293b;text-decoration:underline;">{{supportEmail}}</a> kontaktieren.</p>
        <p style="margin:0;font-size:16px;line-height:1.6;color:#374151;">Willkommen!<br/>Das {{companyName}} Team</p>
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
            textContent: `Willkommen!\n\nHallo {{firstName}},\n\nvielen Dank für Ihre Registrierung bei {{companyName}}.\n\nIhre Registrierung wurde erhalten und wartet auf die Admin-Genehmigung. Nach der Genehmigung haben Sie Zugriff auf alle Funktionen.\n\nDieser Vorgang wird in der Regel innerhalb von 24 Stunden abgeschlossen.\n\nFalls Sie Fragen haben, können Sie uns unter {{supportEmail}} kontaktieren.\n\nDas {{companyName}} Team\n\n© {{year}} {{companyName}}`,
            isActive: true,
            variables: ['firstName', 'supportEmail', 'companyName', 'year']
          }
        })
      }
      // REGISTRATION_APPROVED template'i
      else if (template === 'REGISTRATION_APPROVED') {
        emailTemplate = await prisma.emailTemplate.upsert({
          where: { type: template },
          update: { 
            isActive: true,
            subject: 'Ihre Registrierung wurde genehmigt - Sie können sich jetzt anmelden',
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
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e293b;">Ihre Registrierung wurde genehmigt!</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">Sie können sich jetzt anmelden</p>
      </td>
    </tr>
    <!-- Content Section -->
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Hallo {{firstName}},</p>
        <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#374151;">großartige Neuigkeiten! Ihre Registrierung wurde vom Administrator genehmigt.</p>
        <!-- Features Card -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Verfügbare Funktionen</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                <ul style="margin:0;padding-left:20px;color:#374151;font-size:15px;line-height:1.8;">
                  <li style="margin-bottom:8px;">Alle Leads anzeigen</li>
                  <li style="margin-bottom:8px;">An Auktionen bieten</li>
                  <li style="margin-bottom:8px;">Leads kaufen und verkaufen</li>
                  <li style="margin-bottom:0;">Ihr Konto verwalten</li>
                </ul>
              </td>
            </tr>
          </table>
        </div>
        <!-- Action Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;width:100%;">
          <tr>
            <td style="text-align:center;">
              <a href="{{appUrl}}/login" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">Jetzt anmelden</a>
            </td>
          </tr>
        </table>
        <p style="margin:28px 0 0;font-size:16px;line-height:1.6;color:#374151;">Viel Erfolg!<br/>Das {{companyName}} Team</p>
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
            textContent: `Ihre Registrierung wurde genehmigt!\n\nHallo {{firstName}},\n\ngroßartige Neuigkeiten! Ihre Registrierung wurde vom Administrator genehmigt.\n\nSie können sich jetzt anmelden und alle Funktionen nutzen:\n- Alle Leads anzeigen\n- An Auktionen bieten\n- Leads kaufen und verkaufen\n- Ihr Konto verwalten\n\nAnmelden: {{appUrl}}/login\n\nViel Erfolg!\nDas {{companyName}} Team`,
            variables: ['firstName', 'appUrl', 'companyName', 'year']
          },
          create: {
            type: template,
            name: 'Registrierung genehmigt',
            description: 'E-Mail, die gesendet wird, wenn die Benutzerregistrierung genehmigt wurde',
            subject: 'Ihre Registrierung wurde genehmigt - Sie können sich jetzt anmelden',
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
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e293b;">Ihre Registrierung wurde genehmigt!</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">Sie können sich jetzt anmelden</p>
      </td>
    </tr>
    <!-- Content Section -->
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Hallo {{firstName}},</p>
        <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#374151;">großartige Neuigkeiten! Ihre Registrierung wurde vom Administrator genehmigt.</p>
        <!-- Features Card -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Verfügbare Funktionen</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                <ul style="margin:0;padding-left:20px;color:#374151;font-size:15px;line-height:1.8;">
                  <li style="margin-bottom:8px;">Alle Leads anzeigen</li>
                  <li style="margin-bottom:8px;">An Auktionen bieten</li>
                  <li style="margin-bottom:8px;">Leads kaufen und verkaufen</li>
                  <li style="margin-bottom:0;">Ihr Konto verwalten</li>
                </ul>
              </td>
            </tr>
          </table>
        </div>
        <!-- Action Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;width:100%;">
          <tr>
            <td style="text-align:center;">
              <a href="{{appUrl}}/login" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">Jetzt anmelden</a>
            </td>
          </tr>
        </table>
        <p style="margin:28px 0 0;font-size:16px;line-height:1.6;color:#374151;">Viel Erfolg!<br/>Das {{companyName}} Team</p>
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
            textContent: `Ihre Registrierung wurde genehmigt!\n\nHallo {{firstName}},\n\ngroßartige Neuigkeiten! Ihre Registrierung wurde vom Administrator genehmigt.\n\nSie können sich jetzt anmelden und alle Funktionen nutzen:\n- Alle Leads anzeigen\n- An Auktionen bieten\n- Leads kaufen und verkaufen\n- Ihr Konto verwalten\n\nAnmelden: {{appUrl}}/login\n\nViel Erfolg!\nDas {{companyName}} Team`,
            isActive: true,
            variables: ['firstName', 'appUrl', 'companyName', 'year']
          }
        })
      }
      // REGISTRATION_REJECTED template'i
      else if (template === 'REGISTRATION_REJECTED') {
        emailTemplate = await prisma.emailTemplate.upsert({
          where: { type: template },
          update: { 
            isActive: true,
            subject: 'Ergebnis Ihrer Registrierungsanfrage',
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
                  <td style="width:64px;height:64px;background:#fef2f2;border-radius:50%;text-align:center;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" height="100%">
                      <tr>
                        <td style="text-align:center;vertical-align:middle;padding:8px;">
                          <div style="width:48px;height:48px;background:#dc2626;border-radius:50%;margin:0 auto;text-align:center;line-height:48px;align-items:center;justify-content:center;">
                            <span style="color:#ffffff;font-size:28px;font-weight:bold;display:inline-block;line-height:48px;vertical-align:middle;">ℹ</span>
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
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e293b;">Ergebnis Ihrer Registrierungsanfrage</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">Ihre Anfrage wurde geprüft</p>
      </td>
    </tr>
    <!-- Content Section -->
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Hallo {{firstName}},</p>
        <!-- Rejection Info Card -->
        <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;padding:20px;margin-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">Nach Prüfung Ihrer Registrierungsanfrage bei {{companyName}} können wir Ihre Registrierung zu diesem Zeitpunkt leider nicht akzeptieren.</p>
              </td>
            </tr>
          </table>
        </div>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">Sie können zu einem späteren Zeitpunkt erneut versuchen, sich zu registrieren, oder uns bei Fragen unter <a href="mailto:{{supportEmail}}" style="color:#1e293b;text-decoration:underline;">{{supportEmail}}</a> kontaktieren.</p>
        <p style="margin:0;font-size:16px;line-height:1.6;color:#374151;">Vielen Dank für Ihr Verständnis.<br/>Das {{companyName}} Team</p>
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
            textContent: `Ergebnis Ihrer Registrierungsanfrage\n\nHallo {{firstName}},\n\nnach Prüfung Ihrer Registrierungsanfrage bei {{companyName}} können wir Ihre Registrierung zu diesem Zeitpunkt leider nicht akzeptieren.\n\nSie können zu einem späteren Zeitpunkt erneut versuchen, sich zu registrieren, oder uns bei Fragen unter {{supportEmail}} kontaktieren.\n\nVielen Dank für Ihr Verständnis.\n\nDas {{companyName}} Team`,
            variables: ['firstName', 'supportEmail', 'companyName', 'year']
          },
          create: {
            type: template,
            name: 'Registrierungsanfrage abgelehnt',
            description: 'E-Mail, die gesendet wird, wenn die Benutzerregistrierung abgelehnt wurde',
            subject: 'Ergebnis Ihrer Registrierungsanfrage',
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
                  <td style="width:64px;height:64px;background:#fef2f2;border-radius:50%;text-align:center;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" height="100%">
                      <tr>
                        <td style="text-align:center;vertical-align:middle;padding:8px;">
                          <div style="width:48px;height:48px;background:#dc2626;border-radius:50%;margin:0 auto;text-align:center;line-height:48px;align-items:center;justify-content:center;">
                            <span style="color:#ffffff;font-size:28px;font-weight:bold;display:inline-block;line-height:48px;vertical-align:middle;">ℹ</span>
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
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1e293b;">Ergebnis Ihrer Registrierungsanfrage</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">Ihre Anfrage wurde geprüft</p>
      </td>
    </tr>
    <!-- Content Section -->
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Hallo {{firstName}},</p>
        <!-- Rejection Info Card -->
        <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;padding:20px;margin-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">Nach Prüfung Ihrer Registrierungsanfrage bei {{companyName}} können wir Ihre Registrierung zu diesem Zeitpunkt leider nicht akzeptieren.</p>
              </td>
            </tr>
          </table>
        </div>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">Sie können zu einem späteren Zeitpunkt erneut versuchen, sich zu registrieren, oder uns bei Fragen unter <a href="mailto:{{supportEmail}}" style="color:#1e293b;text-decoration:underline;">{{supportEmail}}</a> kontaktieren.</p>
        <p style="margin:0;font-size:16px;line-height:1.6;color:#374151;">Vielen Dank für Ihr Verständnis.<br/>Das {{companyName}} Team</p>
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
            textContent: `Ergebnis Ihrer Registrierungsanfrage\n\nHallo {{firstName}},\n\nnach Prüfung Ihrer Registrierungsanfrage bei {{companyName}} können wir Ihre Registrierung zu diesem Zeitpunkt leider nicht akzeptieren.\n\nSie können zu einem späteren Zeitpunkt erneut versuchen, sich zu registrieren, oder uns bei Fragen unter {{supportEmail}} kontaktieren.\n\nVielen Dank für Ihr Verständnis.\n\nDas {{companyName}} Team`,
            isActive: true,
            variables: ['firstName', 'supportEmail', 'companyName', 'year']
          }
        })
      }
      // REGISTRATION_REJECTED template'i
      else if (template === 'REGISTRATION_REJECTED') {
        emailTemplate = await prisma.emailTemplate.upsert({
          where: { type: template },
          update: { 
            isActive: true,
            subject: 'Ergebnis Ihrer Registrierungsanfrage',
            htmlContent: `<div style="background:#f9fafb;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;">
    <tr>
      <td style="padding:32px 32px 24px;border-bottom:1px solid #e5e7eb;">
        <h1 style="margin:0;font-size:24px;font-weight:600;color:#111827;letter-spacing:-0.5px;">{{companyName}}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h2 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#111827;">Ergebnis Ihrer Registrierungsanfrage</h2>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Hallo {{firstName}},</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">nach Prüfung Ihrer Registrierungsanfrage bei {{companyName}} können wir Ihre Registrierung zu diesem Zeitpunkt leider nicht akzeptieren.</p>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">Sie können zu einem späteren Zeitpunkt erneut versuchen, sich zu registrieren, oder uns bei Fragen unter <a href="mailto:{{supportEmail}}" style="color:#111827;text-decoration:underline;">{{supportEmail}}</a> kontaktieren.</p>
        <p style="margin:0;font-size:16px;line-height:1.6;color:#374151;">Vielen Dank für Ihr Verständnis.<br/>Das {{companyName}} Team</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">© {{year}} {{companyName}}. Alle Rechte vorbehalten.</p>
      </td>
    </tr>
  </table>
</div>`,
            textContent: `Ergebnis Ihrer Registrierungsanfrage\n\nHallo {{firstName}},\n\nnach Prüfung Ihrer Registrierungsanfrage bei {{companyName}} können wir Ihre Registrierung zu diesem Zeitpunkt leider nicht akzeptieren.\n\nSie können zu einem späteren Zeitpunkt erneut versuchen, sich zu registrieren, oder uns bei Fragen unter {{supportEmail}} kontaktieren.\n\nVielen Dank für Ihr Verständnis.\n\nDas {{companyName}} Team`,
            variables: ['firstName', 'supportEmail', 'companyName', 'year']
          },
          create: {
            type: template,
            name: 'Registrierungsanfrage abgelehnt',
            description: 'E-Mail, die gesendet wird, wenn die Benutzerregistrierung abgelehnt wurde',
            subject: 'Ergebnis Ihrer Registrierungsanfrage',
            htmlContent: `<div style="background:#f9fafb;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;">
    <tr>
      <td style="padding:32px 32px 24px;border-bottom:1px solid #e5e7eb;">
        <h1 style="margin:0;font-size:24px;font-weight:600;color:#111827;letter-spacing:-0.5px;">{{companyName}}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h2 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#111827;">Ergebnis Ihrer Registrierungsanfrage</h2>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Hallo {{firstName}},</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">nach Prüfung Ihrer Registrierungsanfrage bei {{companyName}} können wir Ihre Registrierung zu diesem Zeitpunkt leider nicht akzeptieren.</p>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">Sie können zu einem späteren Zeitpunkt erneut versuchen, sich zu registrieren, oder uns bei Fragen unter <a href="mailto:{{supportEmail}}" style="color:#111827;text-decoration:underline;">{{supportEmail}}</a> kontaktieren.</p>
        <p style="margin:0;font-size:16px;line-height:1.6;color:#374151;">Vielen Dank für Ihr Verständnis.<br/>Das {{companyName}} Team</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">© {{year}} {{companyName}}. Alle Rechte vorbehalten.</p>
      </td>
    </tr>
  </table>
</div>`,
            textContent: `Ergebnis Ihrer Registrierungsanfrage\n\nHallo {{firstName}},\n\nnach Prüfung Ihrer Registrierungsanfrage bei {{companyName}} können wir Ihre Registrierung zu diesem Zeitpunkt leider nicht akzeptieren.\n\nSie können zu einem späteren Zeitpunkt erneut versuchen, sich zu registrieren, oder uns bei Fragen unter {{supportEmail}} kontaktieren.\n\nVielen Dank für Ihr Verständnis.\n\nDas {{companyName}} Team`,
            isActive: true,
            variables: ['firstName', 'supportEmail', 'companyName', 'year']
          }
        })
      }
      // Eğer template hala yoksa hata döndür
      else if (!emailTemplate) {
        console.error(`Email template not found or inactive: ${template}`)
        return { success: false, error: 'Template not found' }
      }
    }

    // Değişkenleri template'e yerleştir
    let subject = emailTemplate.subject
    let htmlContent = emailTemplate.htmlContent
    let textContent = emailTemplate.textContent || ''

    // Basit variable replacement
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      subject = subject.replace(regex, variables[key] || '')
      htmlContent = htmlContent.replace(regex, variables[key] || '')
      textContent = textContent.replace(regex, variables[key] || '')
    })

    console.log(`[EmailSender] Sending email - Subject: ${subject.substring(0, 50)}...`)
    const result = await sendEmail({
      to,
      subject,
      html: htmlContent,
      text: textContent
    })
    
    console.log(`[EmailSender] Email send result: ${result?.success ? 'SUCCESS' : 'FAILED'}`)
    return result
  } catch (error) {
    console.error('Notification email send error:', error)
    return { success: false, error: error.message }
  }
}

export default {
  sendEmail,
  sendPasswordResetEmail,
  sendNotificationEmail
}
