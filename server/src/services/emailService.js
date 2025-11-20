import nodemailer from 'nodemailer'
import { prisma } from '../prismaClient.js'

/**
 * Email transporter oluştur
 */
async function createTransporter() {
  try {
    // Settings'den SMTP bilgilerini al
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })

    if (!settings || !settings.smtpHost || !settings.smtpUser) {
      console.warn('SMTP settings not configured')
      return null
    }

    const config = {
      host: settings.smtpHost,
      port: settings.smtpPort || 465,
      secure: settings.smtpUseSSL,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass
      }
    }

    // TLS ayarları
    if (settings.smtpUseTLS) {
      config.tls = {
        rejectUnauthorized: false
      }
    }

    const transporter = nodemailer.createTransport(config)

    // Transporter'ı test et
    await transporter.verify()

    return transporter
  } catch (error) {
    console.error('Error creating email transporter:', error.message)
    return null
  }
}

/**
 * Email template'i getir ve değişkenleri yerleştir
 */
async function getEmailTemplate(templateType, variables = {}) {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { type: templateType }
    })

    if (!template || !template.isActive) {
      return null
    }

    // Değişkenleri subject ve content içinde yerine koy
    let subject = template.subject
    let htmlContent = template.htmlContent
    let textContent = template.textContent

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      subject = subject.replace(regex, value)
      htmlContent = htmlContent.replace(regex, value)
      if (textContent) {
        textContent = textContent.replace(regex, value)
      }
    })

    return {
      subject,
      htmlContent,
      textContent
    }
  } catch (error) {
    console.error('Error getting email template:', error)
    return null
  }
}

/**
 * Bildirim emaili gönder
 * @param {object} notification - Bildirim objesi
 * @param {object} user - Kullanıcı objesi
 */
export async function sendNotificationEmail(notification, user) {
  try {
    const transporter = await createTransporter()
    if (!transporter) {
      console.warn('Email transporter not available, skipping email notification')
      return false
    }

    const settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })

    // Bildirim tipine özel template kullan (örn: "NOTIFICATION_BID_RECEIVED")
    const templateType = `NOTIFICATION_${notification.notificationType.code}`

    // Önce özel template'i dene, yoksa generic notification template kullan
    let template = await getEmailTemplate(templateType, {
      userName: user.firstName || user.email,
      title: notification.title,
      message: notification.message,
      siteUrl: process.env.SITE_URL || 'http://localhost:3000'
    })

    // Eğer özel template yoksa, genel bir email oluştur
    if (!template) {
      template = {
        subject: notification.title,
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">${settings.companyName || 'LeadPortal'}</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #667eea; margin-top: 0;">${notification.title}</h2>
              <p style="font-size: 16px; margin: 20px 0;">${notification.message}</p>
              ${notification.data ? `
                <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #666;">Detaylar için lütfen platformumuza giriş yapın.</p>
                </div>
              ` : ''}
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.SITE_URL || 'http://localhost:3000'}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Platforma Git</a>
              </div>
            </div>
            <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
              <p>Bu email ${settings.companyName || 'LeadPortal'} tarafından gönderilmiştir.</p>
              <p>Bildirim tercihlerinizi değiştirmek için <a href="${process.env.SITE_URL || 'http://localhost:3000'}/profile/notifications" style="color: #667eea;">buraya tıklayın</a>.</p>
            </div>
          </body>
          </html>
        `,
        textContent: `${notification.title}\n\n${notification.message}\n\n${process.env.SITE_URL || 'http://localhost:3000'}`
      }
    }

    // Email gönder
    const mailOptions = {
      from: `"${settings.smtpFromName || 'LeadPortal'}" <${settings.smtpUser}>`,
      to: user.email,
      subject: template.subject,
      text: template.textContent,
      html: template.htmlContent
    }

    await transporter.sendMail(mailOptions)

    console.log(`Email notification sent to ${user.email}: ${notification.title}`)
    return true
  } catch (error) {
    console.error('Error sending notification email:', error)
    return false
  }
}

/**
 * Genel email gönderme fonksiyonu
 * @param {string} to - Alıcı email adresi
 * @param {string} subject - Email başlığı
 * @param {string} htmlContent - HTML içerik
 * @param {string} textContent - Text içerik (opsiyonel)
 */
export async function sendEmail(to, subject, htmlContent, textContent = null) {
  try {
    const transporter = await createTransporter()
    if (!transporter) {
      console.warn('Email transporter not available')
      return false
    }

    const settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })

    const mailOptions = {
      from: `"${settings.smtpFromName || 'LeadPortal'}" <${settings.smtpUser}>`,
      to,
      subject,
      text: textContent || subject,
      html: htmlContent
    }

    await transporter.sendMail(mailOptions)

    console.log(`Email sent to ${to}: ${subject}`)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

/**
 * Toplu email gönderme
 * @param {Array} recipients - Alıcı listesi [{email, name}]
 * @param {string} subject - Email başlığı
 * @param {string} htmlContent - HTML içerik
 * @param {string} textContent - Text içerik (opsiyonel)
 */
export async function sendBulkEmail(recipients, subject, htmlContent, textContent = null) {
  try {
    const transporter = await createTransporter()
    if (!transporter) {
      console.warn('Email transporter not available')
      return { success: 0, failed: recipients.length }
    }

    const settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })

    let successCount = 0
    let failedCount = 0

    for (const recipient of recipients) {
      try {
        const mailOptions = {
          from: `"${settings.smtpFromName || 'LeadPortal'}" <${settings.smtpUser}>`,
          to: recipient.email,
          subject,
          text: textContent || subject,
          html: htmlContent
        }

        await transporter.sendMail(mailOptions)
        successCount++
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error.message)
        failedCount++
      }
    }

    console.log(`Bulk email sent: ${successCount} success, ${failedCount} failed`)
    return { success: successCount, failed: failedCount }
  } catch (error) {
    console.error('Error sending bulk email:', error)
    return { success: 0, failed: recipients.length }
  }
}

/**
 * Email template listesi
 */
export async function getEmailTemplates() {
  try {
    return await prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' }
    })
  } catch (error) {
    console.error('Error getting email templates:', error)
    throw error
  }
}

/**
 * Email template oluştur/güncelle
 */
export async function upsertEmailTemplate(templateData) {
  try {
    return await prisma.emailTemplate.upsert({
      where: { type: templateData.type },
      update: templateData,
      create: templateData
    })
  } catch (error) {
    console.error('Error upserting email template:', error)
    throw error
  }
}
