import { PrismaClient } from '../../generated/prisma/index.js'

const prisma = new PrismaClient()

async function seedData() {
  try {
    console.log('🌱 Seeding database...')

    // 1. Create default user types
    const userTypes = [
      { id: 'S1', name: 'S1', description: 'Temel kullanıcı' },
      { id: 'S2', name: 'S2', description: 'Standart kullanıcı' },
      { id: 'S3', name: 'S3', description: 'Gelişmiş kullanıcı' },
      { id: 'PREMIUM', name: 'Premium', description: 'Premium kullanıcı' },
      { id: 'BASIC', name: 'Basic', description: 'Temel paket' },
      { id: 'STANDARD', name: 'Standard', description: 'Standart paket' },
      { id: 'ENTERPRISE', name: 'Enterprise', description: 'Kurumsal paket' }
    ]

    for (const userType of userTypes) {
      await prisma.userType.upsert({
        where: { id: userType.id },
        update: userType,
        create: userType
      })
    }
    console.log('✅ User types created')

    // 2. Create default pages
    const pages = [
      { id: '/', name: 'Ana Sayfa', description: 'Ana sayfa' },
      { id: '/about', name: 'Hakkında', description: 'Hakkında sayfası' },
      { id: '/faq', name: 'SSS', description: 'Sık sorulan sorular' },
      { id: '/purchased', name: 'Satın Aldıklarım', description: 'Satın alınan leadler' },
      { id: '/admin', name: 'Admin Panel', description: 'Admin paneli' },
      { id: '/admin/leads', name: 'Lead Yönetimi', description: 'Lead yönetim sayfası' },
      { id: '/admin/users', name: 'Kullanıcı Yönetimi', description: 'Kullanıcı yönetim sayfası' },
      { id: '/admin/settings', name: 'Ayarlar', description: 'Uygulama ayarları' },
      { id: '/admin/user-types', name: 'Kullanıcı Tipleri', description: 'Kullanıcı tipi yönetimi' }
    ]

    for (const page of pages) {
      await prisma.page.upsert({
        where: { id: page.id },
        update: page,
        create: page
      })
    }
    console.log('✅ Pages created')

    // 3. Create default permissions (S1 can only access home page)
    const defaultPermissions = [
      { userTypeId: 'S1', pageId: '/', hasAccess: true },
      { userTypeId: 'S2', pageId: '/', hasAccess: true },
      { userTypeId: 'S2', pageId: '/about', hasAccess: true },
      { userTypeId: 'S2', pageId: '/faq', hasAccess: true },
      { userTypeId: 'S2', pageId: '/purchased', hasAccess: true },
      { userTypeId: 'S3', pageId: '/', hasAccess: true },
      { userTypeId: 'S3', pageId: '/about', hasAccess: true },
      { userTypeId: 'S3', pageId: '/faq', hasAccess: true },
      { userTypeId: 'S3', pageId: '/purchased', hasAccess: true },
      { userTypeId: 'PREMIUM', pageId: '/', hasAccess: true },
      { userTypeId: 'PREMIUM', pageId: '/about', hasAccess: true },
      { userTypeId: 'PREMIUM', pageId: '/faq', hasAccess: true },
      { userTypeId: 'PREMIUM', pageId: '/purchased', hasAccess: true },
      { userTypeId: 'BASIC', pageId: '/', hasAccess: true },
      { userTypeId: 'BASIC', pageId: '/about', hasAccess: true },
      { userTypeId: 'STANDARD', pageId: '/', hasAccess: true },
      { userTypeId: 'STANDARD', pageId: '/about', hasAccess: true },
      { userTypeId: 'STANDARD', pageId: '/faq', hasAccess: true },
      { userTypeId: 'STANDARD', pageId: '/purchased', hasAccess: true },
      { userTypeId: 'ENTERPRISE', pageId: '/', hasAccess: true },
      { userTypeId: 'ENTERPRISE', pageId: '/about', hasAccess: true },
      { userTypeId: 'ENTERPRISE', pageId: '/faq', hasAccess: true },
      { userTypeId: 'ENTERPRISE', pageId: '/purchased', hasAccess: true }
    ]

    // Clear existing permissions
    await prisma.userTypePermission.deleteMany({})

    // Create new permissions
    await prisma.userTypePermission.createMany({
      data: defaultPermissions
    })
    console.log('✅ Default permissions created')

    console.log('🎉 Database seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function
seedData()
  .then(() => {
    console.log('✅ Seeding completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
