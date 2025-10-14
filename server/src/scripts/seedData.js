import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedData() {
  try {
    console.log('🌱 Seeding database...')

    // 1. Create default user types
    const userTypes = [
      { id: 'FULL_ADMIN', name: 'Full Admin', description: 'Tam yetkili admin' },
      { id: 'ADMIN', name: 'Admin', description: 'Admin kullanıcı' },
      { id: 'FULL_USER', name: 'Full User', description: 'Tam yetkili kullanıcı' },
      { id: 'USER', name: 'User', description: 'Standart kullanıcı' }
    ]

    console.log('Creating user types...')
    for (const userType of userTypes) {
      const result = await prisma.userType.upsert({
        where: { id: userType.id },
        update: userType,
        create: userType
      })
      console.log(`Created/Updated user type: ${result.id}`)
    }
    
    // Verify user types were created
    const createdUserTypes = await prisma.userType.findMany()
    console.log(`✅ User types created: ${createdUserTypes.length} types found`)
    console.log('User types:', createdUserTypes.map(ut => ut.id))

    // 2. Create default pages
    const pages = [
      { id: '/', name: 'Ana Sayfa', description: 'Ana sayfa' },
      { id: '/about', name: 'Hakkında', description: 'Hakkında sayfası' },
      { id: '/faq', name: 'SSS', description: 'Sık sorulan sorular' },
      { id: '/purchased-leads', name: 'Satın Aldıklarım', description: 'Satın alınan leadler' },
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

    // 3. Create default permissions
    const defaultPermissions = [
      // Full Admin - Tüm sayfalara erişim
      { userTypeId: 'FULL_ADMIN', pageId: '/', hasAccess: true },
      { userTypeId: 'FULL_ADMIN', pageId: '/about', hasAccess: true },
      { userTypeId: 'FULL_ADMIN', pageId: '/faq', hasAccess: true },
      { userTypeId: 'FULL_ADMIN', pageId: '/purchased-leads', hasAccess: true },
      { userTypeId: 'FULL_ADMIN', pageId: '/admin', hasAccess: true },
      { userTypeId: 'FULL_ADMIN', pageId: '/admin/leads', hasAccess: true },
      { userTypeId: 'FULL_ADMIN', pageId: '/admin/users', hasAccess: true },
      { userTypeId: 'FULL_ADMIN', pageId: '/admin/settings', hasAccess: true },
      { userTypeId: 'FULL_ADMIN', pageId: '/admin/user-types', hasAccess: true },
      
      // Admin - Admin paneline erişim
      { userTypeId: 'ADMIN', pageId: '/', hasAccess: true },
      { userTypeId: 'ADMIN', pageId: '/about', hasAccess: true },
      { userTypeId: 'ADMIN', pageId: '/faq', hasAccess: true },
      { userTypeId: 'ADMIN', pageId: '/purchased-leads', hasAccess: true },
      { userTypeId: 'ADMIN', pageId: '/admin', hasAccess: true },
      { userTypeId: 'ADMIN', pageId: '/admin/leads', hasAccess: true },
      { userTypeId: 'ADMIN', pageId: '/admin/users', hasAccess: true },
      
      // Full User - Tüm kullanıcı sayfalarına erişim
      { userTypeId: 'FULL_USER', pageId: '/', hasAccess: true },
      { userTypeId: 'FULL_USER', pageId: '/about', hasAccess: true },
      { userTypeId: 'FULL_USER', pageId: '/faq', hasAccess: true },
      { userTypeId: 'FULL_USER', pageId: '/purchased-leads', hasAccess: true },
      
      // User - Temel sayfalara erişim
      { userTypeId: 'USER', pageId: '/', hasAccess: true },
      { userTypeId: 'USER', pageId: '/about', hasAccess: true },
      { userTypeId: 'USER', pageId: '/faq', hasAccess: true },
      { userTypeId: 'USER', pageId: '/purchased-leads', hasAccess: true }
    ]

    // Clear existing permissions
    await prisma.userTypePermission.deleteMany({})

    // Create new permissions
    await prisma.userTypePermission.createMany({
      data: defaultPermissions
    })
    console.log('✅ Default permissions created')

    // 4. Create default users for each user type
    const defaultUsers = [
      { email: 'fulladmin@gmail.com', password: 'fulladmin123', userTypeId: 'FULL_ADMIN', role: 'ADMIN' },
      { email: 'admin@gmail.com', password: 'admin123', userTypeId: 'ADMIN', role: 'ADMIN' },
      { email: 'fulluser@gmail.com', password: 'fulluser123', userTypeId: 'FULL_USER', role: 'USER' },
      { email: 'user@gmail.com', password: 'user123', userTypeId: 'USER', role: 'USER' }
    ]

    console.log('Creating default users...')
    for (const userData of defaultUsers) {
      // Verify user type exists before creating user
      const userType = await prisma.userType.findUnique({
        where: { id: userData.userTypeId }
      })
      
      if (!userType) {
        console.error(`❌ UserType ${userData.userTypeId} not found for user ${userData.email}`)
        continue
      }
      
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      
      const result = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          passwordHash: hashedPassword,
          userTypeId: userData.userTypeId
        },
        create: {
          email: userData.email,
          passwordHash: hashedPassword,
          userTypeId: userData.userTypeId
        }
      })
      console.log(`Created/Updated user: ${result.email} with type: ${result.userTypeId}`)
    }
    console.log('✅ Default users created')

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
