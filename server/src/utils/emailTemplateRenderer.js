import { PrismaClient } from '../prismaClient.js'
import { currentYear } from './dateTimeUtils.js'

const prisma = new PrismaClient()

/**
 * Database'den email template'i alıp değişkenleri render eder
 * @param {string} templateType - Template tipi (bidReceived, outbid, etc.)
 * @param {object} variables - Değişkenler objesi
 * @returns {Promise<{subject: string, html: string, text: string}>}
 */
export async function renderEmailTemplate(templateType, variables = {}) {
  try {
    // Database'den template'i al
    const template = await prisma.emailTemplate.findUnique({
      where: { type: templateType }
    })

    // Template bulunamazsa fallback kullan
    if (!template || !template.isActive) {
      console.warn(`Email template not found or inactive: ${templateType}`)
      return getFallbackTemplate(templateType, variables)
    }

    // Değişkenleri render et
    const renderedSubject = renderVariables(template.subject, variables)
    const renderedHtml = renderVariables(template.htmlContent, variables)
    const renderedText = template.textContent ? renderVariables(template.textContent, variables) : null

    return {
      subject: renderedSubject,
      html: renderedHtml,
      text: renderedText || renderedSubject
    }
  } catch (error) {
    console.error('Email template render error:', error)
    return getFallbackTemplate(templateType, variables)
  }
}

/**
 * Template içindeki {{variable}} değişkenlerini gerçek değerlerle değiştirir
 * @param {string} template - Template string
 * @param {object} variables - Değişkenler objesi
 * @returns {string}
 */
function renderVariables(template, variables) {
  if (!template) return ''
  
  let rendered = template
  
  // Önce leadTitle'ı özel olarak işle - eğer leadId varsa, leadTitle'ın yanına ekle
  if (variables.leadTitle !== undefined && variables.leadId !== undefined && variables.leadId !== null) {
    const leadTitleWithId = `${variables.leadTitle} (${variables.leadId})`
    const regex = new RegExp(`{{leadTitle}}`, 'g')
    rendered = rendered.replace(regex, leadTitleWithId)
  }
  
  // {{variable}} formatındaki tüm değişkenleri bul ve değiştir
  Object.keys(variables).forEach(key => {
    // leadTitle'ı zaten işledik, tekrar işleme
    if (key === 'leadTitle' && variables.leadId !== undefined && variables.leadId !== null) {
      return
    }
    const regex = new RegExp(`{{${key}}}`, 'g')
    const value = variables[key] !== undefined && variables[key] !== null ? variables[key] : ''
    rendered = rendered.replace(regex, value)
  })
  
  return rendered
}

/**
 * Template bulunamazsa kullanılacak fallback template'ler
 */
function getFallbackTemplate(templateType, variables) {
  const { companyName = 'LeadPortal', leadTitle = '', leadId = null, amount = 0, currency = 'TL', leadUrl = '', newAmount = 0 } = variables
  
  // Lead title'a ID ekle
  const leadTitleWithId = leadId ? `${leadTitle} (${leadId})` : leadTitle

  const fallbacks = {
    bidReceived: {
      subject: `Teklifiniz alındı: ${leadTitleWithId}`,
      html: `
        <div style="background:#f6f8fb;padding:24px;font-family:system-ui,sans-serif;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
            <h1 style="color:#2563eb;margin:0 0 16px 0;">${companyName}</h1>
            <h2 style="margin:0 0 16px 0;">Teklifiniz alındı</h2>
            <p><strong>${leadTitleWithId}</strong> ilanına <strong>${amount} ${currency}</strong> teklif verdiniz.</p>
            ${leadUrl ? `<a href="${leadUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;margin-top:16px;">İlanı Gör</a>` : ''}
            <p style="margin-top:24px;color:#6b7280;font-size:12px;">© ${currentYear()} ${companyName}</p>
          </div>
        </div>
      `,
      text: `Teklifiniz alındı\n\n${leadTitleWithId} ilanına ${amount} ${currency} teklif verdiniz.\n\n${leadUrl ? `İlan: ${leadUrl}\n\n` : ''}${companyName}`
    },
    outbid: {
      subject: `Daha yüksek teklif verildi: ${leadTitleWithId}`,
      html: `
        <div style="background:#f6f8fb;padding:24px;font-family:system-ui,sans-serif;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
            <h1 style="color:#dc2626;margin:0 0 16px 0;">${companyName}</h1>
            <h2 style="margin:0 0 16px 0;">Teklifiniz geçildi</h2>
            <p><strong>${leadTitleWithId}</strong> ilanında yeni teklif: <strong>${newAmount} ${currency}</strong></p>
            ${leadUrl ? `<a href="${leadUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;margin-top:16px;">Yeni Teklif Ver</a>` : ''}
            <p style="margin-top:24px;color:#6b7280;font-size:12px;">© ${currentYear()} ${companyName}</p>
          </div>
        </div>
      `,
      text: `Teklifiniz geçildi\n\n${leadTitleWithId} ilanında yeni teklif: ${newAmount} ${currency}\n\n${leadUrl ? `İlan: ${leadUrl}\n\n` : ''}${companyName}`
    }
  }

  return fallbacks[templateType] || {
    subject: `${companyName} - Bildirim`,
    html: `<p>Bildirim mesajı</p>`,
    text: 'Bildirim mesajı'
  }
}

