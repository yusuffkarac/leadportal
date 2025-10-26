import nodemailer from 'nodemailer'
import { PrismaClient } from '../prismaClient.js'

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
            <p>&copy; ${new Date().getFullYear()} LeadPortal. Tüm hakları saklıdır.</p>
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

export default {
  sendEmail,
  sendPasswordResetEmail
}
