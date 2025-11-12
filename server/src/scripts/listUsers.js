import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { PrismaClient } from '../prismaClient.js'

// .env dosyasını yükle
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../../.env') })

const prisma = new PrismaClient()

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      include: { userType: true },
      orderBy: { email: 'asc' }
    })

    console.log(`\n📋 Toplam ${users.length} kullanıcı bulundu:\n`)
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   - İsim: ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Belirtilmemiş')
      console.log(`   - Kullanıcı Tipi: ${user.userType.name} (${user.userTypeId})`)
      console.log(`   - Aktif: ${user.isActive ? 'Evet' : 'Hayır'}`)
      console.log(`   - Onay Durumu: ${user.approvalStatus}`)
      console.log('')
    })

    // Admin kullanıcıları özellikle göster
    const admins = users.filter(u => 
      u.userTypeId === 'ADMIN' || 
      u.userTypeId === 'FULL_ADMIN' || 
      u.userTypeId === 'SUPERADMIN'
    )

    if (admins.length > 0) {
      console.log(`\n👑 Admin Kullanıcıları (${admins.length}):\n`)
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.email} (${admin.userType.name})`)
      })
    }

  } catch (error) {
    console.error('❌ Hata oluştu:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

listUsers()

