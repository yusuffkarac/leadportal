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
      subject: `Ihr Gebot wurde erhalten: ${leadTitleWithId}`,
      html: `<div style="background:#f8fafc;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
    <!-- Header with primary color -->
    <tr>
      <td style="background:#1e293b;color:#ffffff;padding:28px 32px;text-align:center;">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${companyName}</h1>
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
                <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#1e293b;line-height:1.4;">${leadTitleWithId}</p>
                ${leadId ? `<p style="margin:0;font-size:13px;color:#64748b;">Anzeigen-ID: <span style="color:#1e293b;font-weight:500;">${leadId}</span></p>` : ''}
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
                <p style="margin:0;font-size:28px;font-weight:700;color:#059669;line-height:1.2;">${amount} ${currency}</p>
              </td>
            </tr>
          </table>
        </div>
        ${leadUrl ? `<!-- Action Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;width:100%;">
          <tr>
            <td style="text-align:center;">
              <a href="${leadUrl}" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">Anzeige ansehen</a>
            </td>
          </tr>
        </table>` : ''}
        <p style="margin:28px 0 0;font-size:13px;color:#64748b;line-height:1.5;text-align:center;">Diese E-Mail wurde automatisch gesendet. Bitte antworten Sie nicht.</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#64748b;text-align:center;">© ${currentYear()} ${companyName}. Alle Rechte vorbehalten.</p>
      </td>
    </tr>
  </table>
</div>`,
      text: `Ihr Gebot wurde erhalten\n\nSie haben für die Anzeige ${leadTitleWithId} ein Gebot von ${amount} ${currency} abgegeben.\n\n${leadUrl ? `Anzeige ansehen: ${leadUrl}\n\n` : ''}© ${currentYear()} ${companyName}`
    },
    outbid: {
      subject: `Höheres Gebot abgegeben: ${leadTitleWithId}`,
      html: `<div style="background:#f8fafc;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
    <!-- Header with primary color -->
    <tr>
      <td style="background:#1e293b;color:#ffffff;padding:28px 32px;text-align:center;">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${companyName}</h1>
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
                <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#1e293b;line-height:1.4;">${leadTitleWithId}</p>
                ${leadId ? `<p style="margin:0;font-size:13px;color:#64748b;">Anzeigen-ID: <span style="color:#1e293b;font-weight:500;">${leadId}</span></p>` : ''}
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
                <p style="margin:0;font-size:28px;font-weight:700;color:#d97706;line-height:1.2;">${newAmount} ${currency}</p>
              </td>
            </tr>
          </table>
        </div>
        ${leadUrl ? `<!-- Action Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;width:100%;">
          <tr>
            <td style="text-align:center;">
              <a href="${leadUrl}" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">Anzeige ansehen und bieten</a>
            </td>
          </tr>
        </table>` : ''}
        <p style="margin:28px 0 0;font-size:13px;color:#64748b;line-height:1.5;text-align:center;">Diese E-Mail wurde automatisch gesendet.</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#64748b;text-align:center;">© ${currentYear()} ${companyName}. Alle Rechte vorbehalten.</p>
      </td>
    </tr>
  </table>
</div>`,
      text: `Ihr Gebot wurde überboten\n\nNeues Gebot für ${leadTitleWithId}: ${newAmount} ${currency}.\n\n${leadUrl ? `Anzeige: ${leadUrl}\n\n` : ''}© ${currentYear()} ${companyName}`
    }
  }

  return fallbacks[templateType] || {
    subject: `${companyName} - Benachrichtigung`,
    html: `<div style="background:#f9fafb;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;">
    <tr>
      <td style="padding:32px;">
        <p style="margin:0;font-size:16px;line-height:1.6;color:#374151;">Benachrichtigung</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">© ${currentYear()} ${companyName}. Alle Rechte vorbehalten.</p>
      </td>
    </tr>
  </table>
</div>`,
    text: 'Benachrichtigung'
  }
}

