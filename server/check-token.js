import { PrismaClient } from './src/prismaClient.js'

const prisma = new PrismaClient()

async function checkToken() {
  const token = await prisma.passwordResetToken.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { email: true, username: true }
      }
    }
  })

  if (token) {
    console.log('\n🔑 Latest Password Reset Token:')
    console.log('User:', token.user.email, `(${token.user.username})`)
    console.log('Token:', token.token)
    console.log('Expires:', token.expiresAt)
    console.log('Used:', token.used)
    console.log('Created:', token.createdAt)
    console.log('\n📧 Reset URL:')
    console.log(`http://localhost:5173/reset-password?token=${token.token}`)
  } else {
    console.log('No password reset tokens found')
  }

  await prisma.$disconnect()
}

checkToken()
