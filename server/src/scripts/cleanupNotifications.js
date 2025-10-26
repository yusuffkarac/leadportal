import { PrismaClient } from '../../generated/prisma/index.js'

const prisma = new PrismaClient()

async function cleanup() {
  try {
    console.log('🧹 Kullanılmayan bildirim tiplerini deaktif ediliyor...')

    // Kullanılmayan bildirim tiplerini deaktif et
    const unusedCodes = [
      'LEAD_CREATED',
      'LEAD_EXPIRED',
      'LEAD_EXPIRED_NO_BIDS',
      'LEAD_WON',
      'LEAD_LOST',
      'BALANCE_DEDUCTED',
      'USER_APPROVED',
      'USER_REJECTED',
      'USER_SUSPENDED',
      'LEAD_APPROVED',
      'LEAD_REJECTED'
    ]

    const result = await prisma.notificationType.updateMany({
      where: {
        code: {
          in: unusedCodes
        }
      },
      data: {
        isActive: false
      }
    })

    console.log(`✅ ${result.count} kullanılmayan bildirim tipi deaktif edildi`)

    // Aktif bildirim tiplerini listele
    const activeTypes = await prisma.notificationType.findMany({
      where: { isActive: true },
      select: { code: true, name: true, category: true }
    })

    console.log('\n📋 Aktif bildirim tipleri:')
    activeTypes.forEach(type => {
      console.log(`  - [${type.category}] ${type.code}: ${type.name}`)
    })

  } catch (error) {
    console.error('❌ Hata:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanup()
