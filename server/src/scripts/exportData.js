import { PrismaClient } from '../prismaClient.js'
import fs from 'fs'

const prisma = new PrismaClient()

async function exportData() {
  try {
    console.log('📤 Exporting database data...')

    // Tüm tabloları export et
    const data = {
      userTypes: await prisma.userType.findMany(),
      pages: await prisma.page.findMany(),
      users: await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          passwordHash: true,
          userTypeId: true,
          createdAt: true,
          updatedAt: true,
          firstName: true,
          lastName: true,
          username: true,
          profileImage: true
        }
      }),
      userTypePermissions: await prisma.userTypePermission.findMany(),
      settings: await prisma.settings.findMany(),
      faqs: await prisma.fAQ.findMany(),
      abouts: await prisma.about.findMany(),
      designSettings: await prisma.designSettings.findMany(),
      emailTemplates: await prisma.emailTemplate.findMany(),
      smsTemplates: await prisma.sMSTemplate.findMany(),
      leads: await prisma.lead.findMany(),
      bids: await prisma.bid.findMany(),
      leadWatches: await prisma.leadWatch.findMany(),
      leadSales: await prisma.leadSale.findMany()
    }

    // JSON dosyasına yaz
    const exportPath = './exported_data.json'
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2))
    
    console.log('✅ Data exported successfully to:', exportPath)
    console.log('📊 Export summary:')
    console.log(`  - UserTypes: ${data.userTypes.length}`)
    console.log(`  - Pages: ${data.pages.length}`)
    console.log(`  - Users: ${data.users.length}`)
    console.log(`  - Permissions: ${data.userTypePermissions.length}`)
    console.log(`  - Settings: ${data.settings.length}`)
    console.log(`  - FAQs: ${data.faqs.length}`)
    console.log(`  - Abouts: ${data.abouts.length}`)
    console.log(`  - Design Settings: ${data.designSettings.length}`)
    console.log(`  - Email Templates: ${data.emailTemplates.length}`)
    console.log(`  - SMS Templates: ${data.smsTemplates.length}`)
    console.log(`  - Leads: ${data.leads.length}`)
    console.log(`  - Bids: ${data.bids.length}`)
    console.log(`  - Lead Watches: ${data.leadWatches.length}`)
    console.log(`  - Lead Sales: ${data.leadSales.length}`)

  } catch (error) {
    console.error('❌ Error exporting data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Export fonksiyonunu çalıştır
exportData()
  .then(() => {
    console.log('✅ Export completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Export failed:', error)
    process.exit(1)
  })
