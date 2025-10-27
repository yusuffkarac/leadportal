import { currentYear } from './dateTimeUtils.js'

export function bidReceivedTemplate({ companyName = 'LeadPortal', leadTitle, amount, currency = 'TL', leadUrl }) {
  const subject = `Teklifiniz alındı: ${leadTitle}`
  const amountText = `${amount} ${currency}`

  const html = `
  <div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr>
        <td style="background:#2563eb;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;">
          ${companyName}
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">Teklifiniz alındı</h1>
          <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">
            <strong style="color:#111827;">${leadTitle}</strong> ilanına <strong style="color:#111827;">${amountText}</strong> teklif verdiniz.
          </p>
          ${leadUrl ? `<a href="${leadUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">İlanı Gör</a>` : ''}
          <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Bu e-posta otomatik olarak gönderildi. Lütfen yanıtlamayınız.</p>
        </td>
      </tr>
      <tr>
        <td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">
          © ${currentYear()} ${companyName}
        </td>
      </tr>
    </table>
  </div>`

  const text = `Teklifiniz alındı\n\n${leadTitle} ilanına ${amountText} teklif verdiniz.${leadUrl ? `\n\nİlanı Gör: ${leadUrl}` : ''}\n\n${companyName}`

  return { subject, html, text }
}

export function outbidTemplate({ companyName = 'LeadPortal', leadTitle, newAmount, currency = 'TL', leadUrl }) {
  const subject = `Daha yüksek teklif verildi: ${leadTitle}`
  const amountText = `${newAmount} ${currency}`
  const html = `
  <div style="background:#f6f8fb;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr><td style="background:#dc2626;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:700;">${companyName}</td></tr>
      <tr>
        <td style="padding:24px;">
          <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">Teklifiniz geçildi</h1>
          <p style="margin:0 0 16px 0;line-height:1.6;color:#374151;">
            <strong>${leadTitle}</strong> ilanında sizden daha yüksek bir teklif verildi: <strong>${amountText}</strong>.
          </p>
          ${leadUrl ? `<a href="${leadUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">İlanı Gör ve Teklif Ver</a>` : ''}
          <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Bu e-posta otomatik gönderildi.</p>
        </td>
      </tr>
      <tr><td style="background:#f9fafb;color:#6b7280;padding:16px 24px;font-size:12px;text-align:center;">© ${currentYear()} ${companyName}</td></tr>
    </table>
  </div>`
  const text = `Teklifiniz geçildi\n\n${leadTitle} ilanında yeni teklif: ${amountText}.${leadUrl ? `\n\nİlan: ${leadUrl}` : ''}\n\n${companyName}`
  return { subject, html, text }
}


