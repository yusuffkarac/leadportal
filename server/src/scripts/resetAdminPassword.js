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

async function resetAdminPassword() {
  try {
    const email = process.argv[2]
    const newPassword = process.argv[3]

    if (!email) {
      console.error('❌ Email adresi gerekli!')
      console.log('Kullanım: node resetAdminPassword.js <email> <yeni-şifre>')
      process.exit(1)
    }

    if (!newPassword) {
      console.error('❌ Yeni şifre gerekli!')
      console.log('Kullanım: node resetAdminPassword.js <email> <yeni-şifre>')
      process.exit(1)
    }

    if (newPassword.length < 6) {
      console.error('❌ Şifre en az 6 karakter olmalıdır!')
      process.exit(1)
    }

    console.log(`🔍 Kullanıcı aranıyor: ${email}...`)

    // Kullanıcıyı bul (case-insensitive)
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { userType: true }
    })

    // Eğer bulunamazsa, tüm kullanıcıları listele ve benzer olanları göster
    if (!user) {
      const allUsers = await prisma.user.findMany({
        include: { userType: true },
        take: 20
      })
      
      if (allUsers.length === 0) {
        console.error(`❌ Veritabanında hiç kullanıcı bulunamadı!`)
        console.error(`\n💡 Çözüm: Önce seed script'ini çalıştırın:`)
        console.error(`   npm run seed`)
        console.error(`\n   Veya yeni bir admin kullanıcısı oluşturun.`)
        process.exit(1)
      }
      
      console.error(`❌ Kullanıcı bulunamadı: ${email}`)
      console.log(`\n📋 Mevcut kullanıcılar:`)
      allUsers.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email} (${u.userType.name})`)
      })
      process.exit(1)
    }

    console.log(`✅ Kullanıcı bulundu: ${user.email}`)
    console.log(`   - İsim: ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Belirtilmemiş')
    console.log(`   - Kullanıcı Tipi: ${user.userType.name} (${user.userTypeId})`)
    console.log(`   - Aktif: ${user.isActive ? 'Evet' : 'Hayır'}`)

    // Admin kontrolü (uyarı ver ama devam et)
    if (user.userTypeId !== 'ADMIN' && user.userTypeId !== 'FULL_ADMIN' && user.userTypeId !== 'SUPERADMIN') {
      console.warn(`⚠️  Uyarı: Bu kullanıcı admin değil (${user.userTypeId})`)
      console.warn('   Şifre yine de sıfırlanacak...')
    }

    // Şifreyi hashle
    console.log('🔐 Şifre hashleniyor...')
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Şifreyi güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    })

    console.log('✅ Şifre başarıyla sıfırlandı!')
    console.log(`📧 Email: ${email}`)
    console.log(`🔑 Yeni şifre: ${newPassword}`)
    console.log('\n⚠️  ÖNEMLİ: Bu şifreyi güvenli bir yerde saklayın ve kullanıcıya iletin!')

  } catch (error) {
    console.error('❌ Hata oluştu:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword()

