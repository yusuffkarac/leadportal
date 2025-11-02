import { PrismaClient } from '../prismaClient.js'
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
      { id: '/admin/pending-users', name: 'Onay Bekleyen Kullanıcılar', description: 'Kayıt onayını bekleyen kullanıcılar' },
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
      { userTypeId: 'FULL_ADMIN', pageId: '/admin/pending-users', hasAccess: true },
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
      { userTypeId: 'ADMIN', pageId: '/admin/pending-users', hasAccess: true },
      
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

    // 5. Create notification types (sadece aktif olarak kullanılanlar)
    const notificationTypes = [
      // BID kategorisi
      {
        code: 'BID_RECEIVED',
        name: 'Lead\'inizde Yeni Teklif',
        description: 'Lead\'inizde başka bir kullanıcı teklif verdi',
        category: 'BID',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:gavel'
      },
      {
        code: 'BID_PLACED',
        name: 'Teklifiniz Alındı',
        description: 'Lead için verdiğiniz teklif başarıyla kaydedildi',
        category: 'BID',
        defaultEnabled: true,
        emailEnabled: false,
        inAppEnabled: true,
        icon: 'mdi:hand-wave'
      },
      {
        code: 'BID_OUTBID',
        name: 'Teklifiniz Geçildi',
        description: 'Teklif verdiğiniz lead\'de daha yüksek bir teklif yapıldı',
        category: 'BID',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:arrow-up-bold'
      },
      {
        code: 'BID_AUTO_INCREASED',
        name: 'Otomatik Teklif Arttı',
        description: 'Proxy bidding ile otomatik teklif yükseltildi',
        category: 'BID',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:autorenew'
      },

      // LEAD kategorisi
      {
        code: 'LEAD_SOLD',
        name: 'Lead Satıldı',
        description: 'Lead\'iniz başarıyla satıldı',
        category: 'LEAD',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:check-circle'
      },
      {
        code: 'LEAD_PURCHASED',
        name: 'Lead Satın Alındı',
        description: 'Bir lead satın aldınız',
        category: 'LEAD',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:cart-check'
      },

      // PAYMENT kategorisi
      {
        code: 'PAYMENT_RECEIVED',
        name: 'Ödeme Alındı',
        description: 'Lead satışından ödeme aldınız',
        category: 'PAYMENT',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:cash-check'
      },
      {
        code: 'BALANCE_ADDED',
        name: 'Bakiye Eklendi',
        description: 'Admin tarafından hesabınıza bakiye eklendi',
        category: 'PAYMENT',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:wallet-plus'
      },
      {
        code: 'PAYMENT_PENDING',
        name: 'IBAN Ödemesi Bekliyor',
        description: 'Yeni bir IBAN ödemesi onay bekliyor',
        category: 'PAYMENT',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:clock-alert-outline'
      },
      {
        code: 'PAYMENT_CONFIRMED',
        name: 'Ödemeniz Onaylandı',
        description: 'IBAN ile yaptığınız ödeme admin tarafından onaylandı',
        category: 'PAYMENT',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:check-circle-outline'
      },
      {
        code: 'PAYMENT_CONFIRMED_SELLER',
        name: 'Lead Satış Ödemeniz Alındı',
        description: 'Lead satışınızın IBAN ödemesi onaylandı',
        category: 'PAYMENT',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:cash-check'
      },

      // ADMIN kategorisi
      {
        code: 'USER_REGISTRATION_PENDING',
        name: 'Yeni Kayıt İsteği',
        description: 'Yeni bir kullanıcı kayıt olmak istiyor',
        category: 'ADMIN',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:account-plus'
      }
    ]

    console.log('Creating notification types...')
    for (const notifType of notificationTypes) {
      await prisma.notificationType.upsert({
        where: { code: notifType.code },
        update: notifType,
        create: notifType
      })
    }
    console.log('✅ Notification types created')

    // 6. Create default notification role permissions
    const allNotificationTypes = await prisma.notificationType.findMany()
    const allUserTypes = await prisma.userType.findMany()

    console.log('Creating default notification role permissions...')
    for (const userType of allUserTypes) {
      for (const notifType of allNotificationTypes) {
        // Admin rolleri tüm bildirimleri alabilir
        const isAdmin = userType.id.includes('ADMIN')

        // Kategoriye göre rol izinleri
        let canReceive = true
        if (notifType.category === 'ADMIN' && !isAdmin) {
          canReceive = false // Admin bildirimleri sadece adminler alabilir
        }

        await prisma.notificationRolePermission.upsert({
          where: {
            userTypeId_notificationTypeId: {
              userTypeId: userType.id,
              notificationTypeId: notifType.id
            }
          },
          update: { canReceive },
          create: {
            userTypeId: userType.id,
            notificationTypeId: notifType.id,
            canReceive
          }
        })
      }
    }
    console.log('✅ Default notification role permissions created')

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
