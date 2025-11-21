import { PrismaClient } from '../prismaClient.js'

const prisma = new PrismaClient()

async function addEmailTemplates() {
  try {
    console.log('📧 Adding email templates...')

    const emailTemplates = [
      {
        type: 'NEW_USER_REGISTRATION',
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
        variables: ['firstName', 'lastName', 'userName', 'email', 'registrationDate', 'appUrl', 'companyName', 'year']
      },
      {
        type: 'REGISTRATION_PENDING_CONFIRMATION',
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
        variables: ['firstName', 'supportEmail', 'companyName', 'year']
      },
      {
        type: 'REGISTRATION_APPROVED',
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
        variables: ['firstName', 'appUrl', 'companyName', 'year']
      },
      {
        type: 'REGISTRATION_REJECTED',
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
        variables: ['firstName', 'supportEmail', 'companyName', 'year']
      }
    ]

    for (const template of emailTemplates) {
      await prisma.emailTemplate.upsert({
        where: { type: template.type },
        update: template,
        create: template
      })
      console.log(`✅ Created/Updated email template: ${template.type}`)
    }

    console.log('🎉 Email templates added successfully!')
  } catch (error) {
    console.error('❌ Error adding email templates:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

addEmailTemplates()
  .then(() => {
    console.log('✅ Completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
