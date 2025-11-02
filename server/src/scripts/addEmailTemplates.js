import { PrismaClient } from '../prismaClient.js'

const prisma = new PrismaClient()

async function addEmailTemplates() {
  try {
    console.log('📧 Adding email templates...')

    const emailTemplates = [
      {
        type: 'NEW_USER_REGISTRATION',
        name: 'Yeni Kullanıcı Kaydı Bildirimi',
        description: 'Admin\'e yeni kayıt isteği hakkında bildirim',
        subject: 'Yeni Kayıt İsteği - {{userName}}',
        htmlContent: `<h2>Yeni Kayıt İsteği</h2>
<p>Yeni bir kullanıcı kayıt olmak istiyor:</p>
<ul>
  <li><strong>Adı:</strong> {{firstName}} {{lastName}}</li>
  <li><strong>Email:</strong> {{email}}</li>
  <li><strong>Kayıt Tarihi:</strong> {{registrationDate}}</li>
</ul>
<p><a href="{{appUrl}}/admin/pending-users">Onay Bekleyen Kullanıcıları Gör</a></p>`,
        textContent: `Yeni Kayıt İsteği\n\nAdı: {{firstName}} {{lastName}}\nEmail: {{email}}\nKayıt Tarihi: {{registrationDate}}\n\nOnay Bekleyen Kullanıcıları Görmek İçin: {{appUrl}}/admin/pending-users`,
        variables: ['firstName', 'lastName', 'email', 'registrationDate', 'appUrl']
      },
      {
        type: 'REGISTRATION_PENDING_CONFIRMATION',
        name: 'Kaydınız Alındı',
        description: 'Kullanıcıya gönderilen kayıt doğrulama emaili',
        subject: 'Kaydınız Alındı - Admin Onayı Bekleniyor',
        htmlContent: `<h2>Hoş Geldiniz!</h2>
<p>Merhaba {{firstName}},</p>
<p>LeadPortal\'a kayıt olduğunuz için teşekkür ederiz.</p>
<p>Kaydınız alındı ve admin onayı bekleniyor. Onaylandıktan sonra tüm özelliklere erişebileceksiniz.</p>
<p>Bu işlem genellikle 24 saat içinde tamamlanır.</p>
<p>Sorularınız varsa <a href="mailto:{{supportEmail}}">bizimle iletişime geçebilirsiniz</a>.</p>
<p>Hoş geldiniz!<br/>LeadPortal Ekibi</p>`,
        textContent: `Hoş Geldiniz!\n\nMerhaba {{firstName}},\n\nLeadPortal\'a kayıt olduğunuz için teşekkür ederiz.\n\nKaydınız alındı ve admin onayı bekleniyor. Onaylandıktan sonra tüm özelliklere erişebileceksiniz.\n\nBu işlem genellikle 24 saat içinde tamamlanır.\n\nSorularınız varsa {{supportEmail}} adresinden bize ulaşabilirsiniz.\n\nLeadPortal Ekibi`,
        variables: ['firstName', 'supportEmail']
      },
      {
        type: 'REGISTRATION_APPROVED',
        name: 'Kaydınız Onaylandı',
        description: 'Kullanıcının kaydı onaylandığında gönderilen email',
        subject: 'Kaydınız Onaylandı - Giriş Yapabilirsiniz',
        htmlContent: `<h2>Kaydınız Onaylandı!</h2>
<p>Merhaba {{firstName}},</p>
<p>Harika haberler! Kaydınız admin tarafından onaylandı.</p>
<p>Artık <a href="{{appUrl}}/login">giriş yapıp</a> tüm özellikleri kullanabilirsiniz.</p>
<ul>
  <li>Tüm leadleri görüntüleyin</li>
  <li>Açık artırmalara teklif verin</li>
  <li>Lead alıp satın</li>
  <li>Hesabınızı yönetin</li>
</ul>
<p>Başlamak için hazırseniz, <a href="{{appUrl}}/login">buradan giriş yapabilirsiniz</a>.</p>
<p>Başarılar!<br/>LeadPortal Ekibi</p>`,
        textContent: `Kaydınız Onaylandı!\n\nMerhaba {{firstName}},\n\nHarika haberler! Kaydınız admin tarafından onaylandı.\n\nArtık giriş yapıp tüm özellikleri kullanabilirsiniz:\n- Tüm leadleri görüntüleyin\n- Açık artırmalara teklif verin\n- Lead alıp satın\n- Hesabınızı yönetin\n\nGiriş: {{appUrl}}/login\n\nLeadPortal Ekibi`,
        variables: ['firstName', 'appUrl']
      },
      {
        type: 'REGISTRATION_REJECTED',
        name: 'Kayıt Talebi Reddedildi',
        description: 'Kullanıcının kaydı reddedildiğinde gönderilen email',
        subject: 'Kayıt Talebi Sonucu',
        htmlContent: `<h2>Kayıt Talebi Hakkında</h2>
<p>Merhaba {{firstName}},</p>
<p>LeadPortal\'a yaptığınız kayıt talebinin değerlendirilmesi sonucunda, bu aşamada kaydınız kabul edilememiştir.</p>
<p>Daha sonra tekrar kayıt olmayı denemek veya sorularınız için <a href="mailto:{{supportEmail}}">bizimle iletişime geçmek</a> istiyorsanız, bunu yapabilirsiniz.</p>
<p>Anladığınız için teşekkür ederiz.<br/>LeadPortal Ekibi</p>`,
        textContent: `Kayıt Talebi Sonucu\n\nMerhaba {{firstName}},\n\nLeadPortal\'a yaptığınız kayıt talebinin değerlendirilmesi sonucunda, bu aşamada kaydınız kabul edilememiştir.\n\nDaha sonra tekrar kayıt olmayı denemek veya sorularınız için {{supportEmail}} adresinden bize ulaşabilirsiniz.\n\nAnladığınız için teşekkür ederiz.\n\nLeadPortal Ekibi`,
        variables: ['firstName', 'supportEmail']
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
