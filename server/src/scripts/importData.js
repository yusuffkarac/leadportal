import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function importData() {
  try {
    console.log('📥 Importing database data...')

    // Export dosyasını oku
    const exportPath = './exported_data.json'
    if (!fs.existsSync(exportPath)) {
      throw new Error(`Export file not found: ${exportPath}`)
    }

    const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'))
    console.log('📊 Import data loaded:')
    console.log(`  - UserTypes: ${data.userTypes?.length || 0}`)
    console.log(`  - Pages: ${data.pages?.length || 0}`)
    console.log(`  - Users: ${data.users?.length || 0}`)
    console.log(`  - Permissions: ${data.userTypePermissions?.length || 0}`)
    console.log(`  - Settings: ${data.settings?.length || 0}`)
    console.log(`  - FAQs: ${data.faqs?.length || 0}`)
    console.log(`  - Abouts: ${data.abouts?.length || 0}`)
    console.log(`  - Design Settings: ${data.designSettings?.length || 0}`)
    console.log(`  - Email Templates: ${data.emailTemplates?.length || 0}`)
    console.log(`  - SMS Templates: ${data.smsTemplates?.length || 0}`)
    console.log(`  - Leads: ${data.leads?.length || 0}`)
    console.log(`  - Bids: ${data.bids?.length || 0}`)
    console.log(`  - Lead Watches: ${data.leadWatches?.length || 0}`)
    console.log(`  - Lead Sales: ${data.leadSales?.length || 0}`)

    // 1. UserTypes'ları import et (önce bunlar oluşturulmalı)
    if (data.userTypes && data.userTypes.length > 0) {
      console.log('Creating UserTypes...')
      for (const userType of data.userTypes) {
        await prisma.userType.upsert({
          where: { id: userType.id },
          update: userType,
          create: userType
        })
        console.log(`  ✅ UserType: ${userType.id}`)
      }
    }

    // 2. Pages'leri import et
    if (data.pages && data.pages.length > 0) {
      console.log('Creating Pages...')
      for (const page of data.pages) {
        await prisma.page.upsert({
          where: { id: page.id },
          update: page,
          create: page
        })
        console.log(`  ✅ Page: ${page.id}`)
      }
    }

    // 3. Settings'leri import et
    if (data.settings && data.settings.length > 0) {
      console.log('Creating Settings...')
      for (const setting of data.settings) {
        await prisma.settings.upsert({
          where: { id: setting.id },
          update: setting,
          create: setting
        })
        console.log(`  ✅ Setting: ${setting.id}`)
      }
    }

    // 4. Users'ları import et
    if (data.users && data.users.length > 0) {
      console.log('Creating Users...')
      for (const user of data.users) {
        // UserType'ın var olduğunu kontrol et
        const userType = await prisma.userType.findUnique({
          where: { id: user.userTypeId }
        })
        
        if (!userType) {
          console.error(`  ❌ UserType ${user.userTypeId} not found for user ${user.email}`)
          continue
        }

        await prisma.user.upsert({
          where: { email: user.email },
          update: user,
          create: user
        })
        console.log(`  ✅ User: ${user.email}`)
      }
    }

    // 5. UserTypePermissions'ları import et
    if (data.userTypePermissions && data.userTypePermissions.length > 0) {
      console.log('Creating UserTypePermissions...')
      // Önce mevcut permissions'ları temizle
      await prisma.userTypePermission.deleteMany({})
      
      for (const permission of data.userTypePermissions) {
        await prisma.userTypePermission.create({
          data: permission
        })
        console.log(`  ✅ Permission: ${permission.userTypeId} -> ${permission.pageId}`)
      }
    }

    // 6. FAQs'ları import et
    if (data.faqs && data.faqs.length > 0) {
      console.log('Creating FAQs...')
      for (const faq of data.faqs) {
        await prisma.fAQ.upsert({
          where: { id: faq.id },
          update: faq,
          create: faq
        })
        console.log(`  ✅ FAQ: ${faq.question.substring(0, 50)}...`)
      }
    }

    // 7. Abouts'ları import et
    if (data.abouts && data.abouts.length > 0) {
      console.log('Creating Abouts...')
      for (const about of data.abouts) {
        await prisma.about.upsert({
          where: { id: about.id },
          update: about,
          create: about
        })
        console.log(`  ✅ About: ${about.section}`)
      }
    }

    // 8. DesignSettings'leri import et
    if (data.designSettings && data.designSettings.length > 0) {
      console.log('Creating DesignSettings...')
      for (const designSetting of data.designSettings) {
        await prisma.designSettings.upsert({
          where: { id: designSetting.id },
          update: designSetting,
          create: designSetting
        })
        console.log(`  ✅ DesignSetting: ${designSetting.id}`)
      }
    }

    // 9. EmailTemplates'leri import et
    if (data.emailTemplates && data.emailTemplates.length > 0) {
      console.log('Creating EmailTemplates...')
      for (const template of data.emailTemplates) {
        await prisma.emailTemplate.upsert({
          where: { id: template.id },
          update: template,
          create: template
        })
        console.log(`  ✅ EmailTemplate: ${template.type}`)
      }
    }

    // 10. SMSTemplates'leri import et
    if (data.smsTemplates && data.smsTemplates.length > 0) {
      console.log('Creating SMSTemplates...')
      for (const template of data.smsTemplates) {
        await prisma.sMSTemplate.upsert({
          where: { id: template.id },
          update: template,
          create: template
        })
        console.log(`  ✅ SMSTemplate: ${template.type}`)
      }
    }

    // 11. Leads'leri import et
    if (data.leads && data.leads.length > 0) {
      console.log('Creating Leads...')
      for (const lead of data.leads) {
        // Owner'ın var olduğunu kontrol et
        const owner = await prisma.user.findUnique({
          where: { id: lead.ownerId }
        })
        
        if (!owner) {
          console.error(`  ❌ Owner ${lead.ownerId} not found for lead ${lead.id}`)
          continue
        }

        await prisma.lead.upsert({
          where: { id: lead.id },
          update: lead,
          create: lead
        })
        console.log(`  ✅ Lead: ${lead.title}`)
      }
    }

    // 12. Bids'leri import et
    if (data.bids && data.bids.length > 0) {
      console.log('Creating Bids...')
      for (const bid of data.bids) {
        await prisma.bid.upsert({
          where: { id: bid.id },
          update: bid,
          create: bid
        })
        console.log(`  ✅ Bid: ${bid.amount}`)
      }
    }

    // 13. LeadWatches'leri import et
    if (data.leadWatches && data.leadWatches.length > 0) {
      console.log('Creating LeadWatches...')
      for (const watch of data.leadWatches) {
        await prisma.leadWatch.upsert({
          where: { id: watch.id },
          update: watch,
          create: watch
        })
        console.log(`  ✅ LeadWatch: ${watch.id}`)
      }
    }

    // 14. LeadSales'leri import et
    if (data.leadSales && data.leadSales.length > 0) {
      console.log('Creating LeadSales...')
      for (const sale of data.leadSales) {
        await prisma.leadSale.upsert({
          where: { id: sale.id },
          update: sale,
          create: sale
        })
        console.log(`  ✅ LeadSale: ${sale.id}`)
      }
    }

    console.log('🎉 Database import completed successfully!')

  } catch (error) {
    console.error('❌ Error importing data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Import fonksiyonunu çalıştır
importData()
  .then(() => {
    console.log('✅ Import completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Import failed:', error)
    process.exit(1)
  })
