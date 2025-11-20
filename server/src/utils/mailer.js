import nodemailer from 'nodemailer'
import { PrismaClient } from '../prismaClient.js'

const prisma = new PrismaClient()

let cachedTransporter = null

export async function getMailTransporter() {
  if (cachedTransporter) return cachedTransporter
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  if (!settings || !settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
    throw new Error('SMTP ayarları eksik')
  }

  const secure = settings.smtpUseSSL || (!settings.smtpUseTLS && settings.smtpPort === 465)

  cachedTransporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass
    },
    tls: settings.smtpUseTLS ? { rejectUnauthorized: false } : undefined
  })

  return cachedTransporter
}

export async function sendAppEmail({ to, subject, html, text }) {
  const transporter = await getMailTransporter()
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  const fromName = settings?.smtpFromName || 'LeadPortal'
  const fromAddress = settings?.smtpUser || 'noreply@example.com'
  const from = `${fromName} <${fromAddress}>`
  return transporter.sendMail({ from, to, subject, text, html })
}


