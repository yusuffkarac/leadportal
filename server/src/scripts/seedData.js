import { PrismaClient } from '../prismaClient.js'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedData() {
  try {
    console.log('🌱 Seeding database...')

    // 1. Create default user types
    const userTypes = [
      { id: 'FULL_ADMIN', name: 'Full Admin', description: 'Vollzugriffs-Admin' },
      { id: 'ADMIN', name: 'Admin', description: 'Admin-Benutzer' },
      { id: 'FULL_USER', name: 'Full User', description: 'Vollzugriffs-Benutzer' },
      { id: 'USER', name: 'User', description: 'Standard-Benutzer' }
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
      { id: '/', name: 'Startseite', description: 'Startseite' },
      { id: '/about', name: 'Über uns', description: 'Über uns Seite' },
      { id: '/faq', name: 'FAQ', description: 'Häufig gestellte Fragen' },
      { id: '/purchased-leads', name: 'Gekaufte Leads', description: 'Gekaufte Leads' },
      { id: '/admin', name: 'Admin Panel', description: 'Admin Panel' },
      { id: '/admin/leads', name: 'Lead-Verwaltung', description: 'Lead-Verwaltungsseite' },
      { id: '/admin/users', name: 'Benutzerverwaltung', description: 'Benutzerverwaltungsseite' },
      { id: '/admin/pending-users', name: 'Benutzer mit ausstehender Genehmigung', description: 'Benutzer, die auf Registrierungsgenehmigung warten' },
      { id: '/admin/settings', name: 'Einstellungen', description: 'Anwendungseinstellungen' },
      { id: '/admin/user-types', name: 'Benutzertypen', description: 'Benutzertyp-Verwaltung' }
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
        name: 'Neues Gebot für Ihren Lead',
        description: 'Ein anderer Benutzer hat auf Ihren Lead ein Gebot abgegeben',
        category: 'BID',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:gavel'
      },
      {
        code: 'BID_PLACED',
        name: 'Ihr Gebot wurde angenommen',
        description: 'Ihr Gebot für den Lead wurde erfolgreich gespeichert',
        category: 'BID',
        defaultEnabled: true,
        emailEnabled: false,
        inAppEnabled: true,
        icon: 'mdi:hand-wave'
      },
      {
        code: 'BID_OUTBID',
        name: 'Ihr Gebot wurde überboten',
        description: 'Ein höheres Gebot wurde für den Lead abgegeben, auf den Sie geboten haben',
        category: 'BID',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:arrow-up-bold'
      },
      {
        code: 'BID_AUTO_INCREASED',
        name: 'Automatisches Gebot erhöht',
        description: 'Automatisches Gebot durch Proxy-Bidding erhöht',
        category: 'BID',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:autorenew'
      },

      // LEAD kategorisi
      {
        code: 'LEAD_SOLD',
        name: 'Lead verkauft',
        description: 'Ihr Lead wurde erfolgreich verkauft',
        category: 'LEAD',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:check-circle'
      },
      {
        code: 'LEAD_PURCHASED',
        name: 'Lead gekauft',
        description: 'Sie haben einen Lead gekauft',
        category: 'LEAD',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:cart-check'
      },

      // PAYMENT kategorisi
      {
        code: 'PAYMENT_RECEIVED',
        name: 'Zahlung erhalten',
        description: 'Sie haben eine Zahlung für den Lead-Verkauf erhalten',
        category: 'PAYMENT',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:cash-check'
      },
      {
        code: 'BALANCE_ADDED',
        name: 'Guthaben hinzugefügt',
        description: 'Ein Admin hat Ihrem Konto Guthaben hinzugefügt',
        category: 'PAYMENT',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:wallet-plus'
      },
      {
        code: 'PAYMENT_PENDING',
        name: 'IBAN-Zahlung wartet',
        description: 'Eine neue IBAN-Zahlung wartet auf Genehmigung',
        category: 'PAYMENT',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:clock-alert-outline'
      },
      {
        code: 'PAYMENT_CONFIRMED',
        name: 'Ihre Zahlung wurde bestätigt',
        description: 'Ihre IBAN-Zahlung wurde von einem Admin bestätigt',
        category: 'PAYMENT',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:check-circle-outline'
      },
      {
        code: 'PAYMENT_CONFIRMED_SELLER',
        name: 'Lead-Verkaufszahlung erhalten',
        description: 'Die IBAN-Zahlung für Ihren Lead-Verkauf wurde bestätigt',
        category: 'PAYMENT',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:cash-check'
      },

      // ADMIN kategorisi
      {
        code: 'USER_REGISTRATION_PENDING',
        name: 'Neue Registrierungsanfrage',
        description: 'Ein neuer Benutzer möchte sich registrieren',
        category: 'ADMIN',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:account-plus'
      },

      // FEEDBACK kategorisi
      {
        code: 'FEEDBACK_ALL',
        name: 'Alle Feedback-Benachrichtigungen',
        description: 'Benachrichtigungen zu allen Feedbacks im System',
        category: 'FEEDBACK',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:chat-bubble'
      },
      {
        code: 'FEEDBACK_OWN',
        name: 'Eigene Gesprächsbenachrichtigungen',
        description: 'Nur benachrichtigen, wenn auf Ihr eigenes Feedback geantwortet wurde',
        category: 'FEEDBACK',
        defaultEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        icon: 'mdi:message-text'
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
