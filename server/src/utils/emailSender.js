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
            subject: 'Yeni Kayıt İsteği - {{userName}}',
            htmlContent: `<div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#2563eb;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;text-align:center;">
        {{companyName}}
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h2 style="margin:0 0 16px 0;font-size:20px;color:#111827;">Yeni Kayıt İsteği</h2>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">Yeni bir kullanıcı kayıt olmak istiyor:</p>
        <ul style="margin:0 0 16px 0;padding-left:20px;color:#374151;">
          <li style="margin-bottom:8px;"><strong>Adı:</strong> {{firstName}} {{lastName}}</li>
          <li style="margin-bottom:8px;"><strong>Email:</strong> {{email}}</li>
          <li style="margin-bottom:8px;"><strong>Kayıt Tarihi:</strong> {{registrationDate}}</li>
        </ul>
        <a href="{{appUrl}}/admin/pending-users" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;margin-top:16px;">Onay Bekleyen Kullanıcıları Gör</a>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">
        © {{year}} {{companyName}}
      </td>
    </tr>
  </table>
</div>`,
            textContent: `Yeni Kayıt İsteği\n\nAdı: {{firstName}} {{lastName}}\nEmail: {{email}}\nKayıt Tarihi: {{registrationDate}}\n\nOnay Bekleyen Kullanıcıları Görmek İçin: {{appUrl}}/admin/pending-users\n\n© {{year}} {{companyName}}`,
            variables: ['firstName', 'lastName', 'userName', 'email', 'registrationDate', 'appUrl', 'companyName', 'year']
          },
          create: {
            type: template,
            name: 'Yeni Kullanıcı Kaydı Bildirimi',
            description: 'Admin\'e yeni kayıt isteği hakkında bildirim',
            subject: 'Yeni Kayıt İsteği - {{userName}}',
            htmlContent: `<div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#2563eb;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;text-align:center;">
        {{companyName}}
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h2 style="margin:0 0 16px 0;font-size:20px;color:#111827;">Yeni Kayıt İsteği</h2>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">Yeni bir kullanıcı kayıt olmak istiyor:</p>
        <ul style="margin:0 0 16px 0;padding-left:20px;color:#374151;">
          <li style="margin-bottom:8px;"><strong>Adı:</strong> {{firstName}} {{lastName}}</li>
          <li style="margin-bottom:8px;"><strong>Email:</strong> {{email}}</li>
          <li style="margin-bottom:8px;"><strong>Kayıt Tarihi:</strong> {{registrationDate}}</li>
        </ul>
        <a href="{{appUrl}}/admin/pending-users" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;margin-top:16px;">Onay Bekleyen Kullanıcıları Gör</a>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">
        © {{year}} {{companyName}}
      </td>
    </tr>
  </table>
</div>`,
            textContent: `.7\n\nAdı: {{firstName}} {{lastName}}\nEmail: {{email}}\nKayıt Tarihi: {{registrationDate}}\n\nOnay Bekleyen Kullanıcıları Görmek İçin: {{appUrl}}/admin/pending-users\n\n© {{year}} {{companyName}}`,
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
            htmlContent: `<div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#2563eb;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;text-align:center;">
        {{companyName}}
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h2 style="margin:0 0 16px 0;font-size:20px;color:#111827;">Hoş Geldiniz!</h2>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">Merhaba {{firstName}},</p>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">{{companyName}}'a kayıt olduğunuz için teşekkür ederiz.</p>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">Kaydınız alındı ve admin onayı bekleniyor. Onaylandıktan sonra tüm özelliklere erişebileceksiniz.</p>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">Bu işlem genellikle 24 saat içinde tamamlanır.</p>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">Sorularınız varsa <a href="mailto:{{supportEmail}}" style="color:#2563eb;">bizimle iletişime geçebilirsiniz</a>.</p>
        <p style="margin:0;line-height:1.6;color:#374151;">Hoş geldiniz!<br/>{{companyName}} Ekibi</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">
        © {{year}} {{companyName}}
      </td>
    </tr>
  </table>
</div>`,
            textContent: `Hoş Geldiniz!\n\nMerhaba {{firstName}},\n\n{{companyName}}'a kayıt olduğunuz için teşekkür ederiz.\n\nKaydınız alındı ve admin onayı bekleniyor. Onaylandıktan sonra tüm özelliklere erişebileceksiniz.\n\nBu işlem genellikle 24 saat içinde tamamlanır.\n\nSorularınız varsa {{supportEmail}} adresinden bize ulaşabilirsiniz.\n\n{{companyName}} Ekibi\n\n© {{year}} {{companyName}}`,
            variables: ['firstName', 'supportEmail', 'companyName', 'year']
          },
          create: {
            type: template,
            name: 'Kaydınız Alındı',
            description: 'Kullanıcıya gönderilen kayıt doğrulama emaili',
            subject: 'Kaydınız Alındı - Admin Onayı Bekleniyor',
            htmlContent: `<div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#2563eb;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;text-align:center;">
        {{companyName}}
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h2 style="margin:0 0 16px 0;font-size:20px;color:#111827;">Hoş Geldiniz!</h2>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">Merhaba {{firstName}},</p>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">{{companyName}}'a kayıt olduğunuz için teşekkür ederiz.</p>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">Kaydınız alındı ve admin onayı bekleniyor. Onaylandıktan sonra tüm özelliklere erişebileceksiniz.</p>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">Bu işlem genellikle 24 saat içinde tamamlanır.</p>
        <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">Sorularınız varsa <a href="mailto:{{supportEmail}}" style="color:#2563eb;">bizimle iletişime geçebilirsiniz</a>.</p>
        <p style="margin:0;line-height:1.6;color:#374151;">Hoş geldiniz!<br/>{{companyName}} Ekibi</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">
        © {{year}} {{companyName}}
      </td>
    </tr>
  </table>
</div>`,
            textContent: `Hoş Geldiniz!\n\nMerhaba {{firstName}},\n\n{{companyName}}'a kayıt olduğunuz için teşekkür ederiz.\n\nKaydınız alındı ve admin onayı bekleniyor. Onaylandıktan sonra tüm özelliklere erişebileceksiniz.\n\nBu işlem genellikle 24 saat içinde tamamlanır.\n\nSorularınız varsa {{supportEmail}} adresinden bize ulaşabilirsiniz.\n\n{{companyName}} Ekibi\n\n© {{year}} {{companyName}}`,
            isActive: true,
            variables: ['firstName', 'supportEmail', 'companyName', 'year']
          }
        })
      }
      // REGISTRATION_APPROVED template'i (ileride kullanılabilir)
      else if (template === 'REGISTRATION_APPROVED') {
        emailTemplate = await prisma.emailTemplate.upsert({
          where: { type: template },
          update: { isActive: true },
          create: {
            type: template,
            name: 'Kaydınız Onaylandı',
            description: 'Kullanıcının kaydı onaylandığında gönderilen email',
            subject: 'Kaydınız Onaylandı - Giriş Yapabilirsiniz',
            htmlContent: `<h2>Kaydınız Onaylandı!</h2>
<p>Merhaba {{firstName}},</p>
<p>Harika haberler! Kaydınız admin tarafından onaylandı.</p>
<p>Artık <a href="{{appUrl}}/login">giriş yapıp</a> tüm özellikleri kullanabilirsiniz.</p>
<p>Başlamak için hazırseniz, <a href="{{appUrl}}/login">buradan giriş yapabilirsiniz</a>.</p>
<p>Başarılar!<br/>LeadPortal Ekibi</p>`,
            textContent: `Kaydınız Onaylandı!\n\nMerhaba {{firstName}},\n\nHarika haberler! Kaydınız admin tarafından onaylandı.\n\nArtık giriş yapıp tüm özellikleri kullanabilirsiniz.\n\nGiriş: {{appUrl}}/login\n\nLeadPortal Ekibi`,
            isActive: true,
            variables: ['firstName', 'appUrl']
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
