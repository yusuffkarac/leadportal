import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { PrismaClient } from '../prismaClient.js'
import bcrypt from 'bcrypt'

// .env dosyasını yükle
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../../.env') })

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    const email = process.argv[2] || '5t6gba@gmail.com'
    const password = process.argv[3] || 'Admin123!'

    if (password.length < 6) {
      console.error('❌ Şifre en az 6 karakter olmalıdır!')
      process.exit(1)
    }

    console.log(`🔍 Kullanıcı kontrol ediliyor: ${email}...`)

    // Kullanıcı zaten var mı kontrol et
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { userType: true }
    })

    if (user) {
      console.log(`✅ Kullanıcı zaten mevcut: ${user.email}`)
      console.log(`   - Kullanıcı Tipi: ${user.userType.name} (${user.userTypeId})`)
      
      // Şifreyi güncelle
      console.log('🔐 Şifre güncelleniyor...')
      const passwordHash = await bcrypt.hash(password, 10)
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      })
      
      console.log('✅ Şifre başarıyla güncellendi!')
      console.log(`📧 Email: ${email}`)
      console.log(`🔑 Yeni şifre: ${password}`)
    } else {
      // Admin user type'ı kontrol et
      let adminType = await prisma.userType.findUnique({
        where: { id: 'ADMIN' }
      })

      if (!adminType) {
        // FULL_ADMIN'ı dene
        adminType = await prisma.userType.findUnique({
          where: { id: 'FULL_ADMIN' }
        })
      }

      if (!adminType) {
        // İlk user type'ı al
        const firstType = await prisma.userType.findFirst()
        if (!firstType) {
          console.error('❌ Veritabanında hiç user type bulunamadı!')
          console.error('💡 Önce seed script\'ini çalıştırın: npm run seed')
          process.exit(1)
        }
        adminType = firstType
        console.warn(`⚠️  ADMIN user type bulunamadı, ${adminType.id} kullanılıyor`)
      }

      // Şifreyi hashle
      console.log('🔐 Şifre hashleniyor...')
      const passwordHash = await bcrypt.hash(password, 10)

      // Kullanıcıyı oluştur
      console.log('👤 Admin kullanıcısı oluşturuluyor...')
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          userTypeId: adminType.id,
          isActive: true,
          approvalStatus: 'APPROVED'
        },
        include: { userType: true }
      })

      console.log('✅ Admin kullanıcısı başarıyla oluşturuldu!')
      console.log(`📧 Email: ${email}`)
      console.log(`🔑 Şifre: ${password}`)
      console.log(`👑 Kullanıcı Tipi: ${user.userType.name} (${user.userTypeId})`)
    }

    console.log('\n⚠️  ÖNEMLİ: Bu şifreyi güvenli bir yerde saklayın!')

  } catch (error) {
    console.error('❌ Hata oluştu:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()

