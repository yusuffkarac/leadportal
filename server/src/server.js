import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env') })
import express from 'express'
import http from 'http'
import cors from 'cors'
import { Server as SocketIOServer } from 'socket.io'
import jwt from 'jsonwebtoken'
import { PrismaClient } from './prismaClient.js'
import { checkMaintenanceMode } from './middleware/maintenance.js'
import { trackUserActivity } from './middleware/activityTracker.js'
import { z } from 'zod'

// Zod hata mesajlarını Almanca yap
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.expected === 'string' && issue.received === 'number') {
        return { message: 'Ungültige Eingabe: erwartet string, erhalten number' }
      }
      if (issue.expected === 'number' && issue.received === 'string') {
        return { message: 'Ungültige Eingabe: erwartet number, erhalten string' }
      }
      if (issue.expected === 'integer' && issue.received === 'number') {
        return { message: 'Ungültige Eingabe: erwartet int, erhalten number' }
      }
      return { message: `Ungültige Eingabe: erwartet ${issue.expected}, erhalten ${issue.received}` }
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return { message: `Mindestens ${issue.minimum} Zeichen erforderlich` }
      }
      if (issue.type === 'number') {
        return { message: `Wert muss mindestens ${issue.minimum} sein` }
      }
      return { message: 'Wert zu klein' }
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: `Maximal ${issue.maximum} Zeichen erlaubt` }
      }
      if (issue.type === 'number') {
        return { message: `Wert darf maximal ${issue.maximum} sein` }
      }
      return { message: 'Wert zu groß' }
    case z.ZodIssueCode.invalid_string:
      return { message: 'Ungültiger String' }
    case z.ZodIssueCode.invalid_date:
      return { message: 'Ungültiges Datum' }
    case z.ZodIssueCode.invalid_enum_value:
      return { message: `Ungültiger Wert. Erlaubte Werte: ${issue.options.join(', ')}` }
    case z.ZodIssueCode.unrecognized_keys:
      return { message: `Unbekannte Schlüssel: ${issue.keys.join(', ')}` }
    case z.ZodIssueCode.invalid_union:
      return { message: 'Ungültige Eingabe' }
    case z.ZodIssueCode.invalid_union_discriminator:
      return { message: 'Ungültiger Diskriminator' }
    case z.ZodIssueCode.invalid_literal:
      return { message: `Ungültiger Wert. Erwartet: ${issue.expected}` }
    case z.ZodIssueCode.custom:
      return { message: issue.message || 'Ungültige Eingabe' }
    default:
      return { message: 'Ungültige Eingabe' }
  }
})

const app = express()
const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
})

const prisma = new PrismaClient()

// Trust proxy for IP address detection
app.set('trust proxy', true)

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(express.json({ limit: process.env.JSON_LIMIT || '20mb' }))
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_LIMIT || '20mb' }))

// Static dosya servisi - profil fotoğrafları için
app.use('/uploads', express.static(join(__dirname, '../uploads')))

// Bakım modu kontrolü (tüm API rotalarından önce)
app.use('/api', checkMaintenanceMode)

// Kullanıcı aktivite takibi (tüm API rotalarından önce)
app.use('/api', trackUserActivity)

// Health
app.get('/health', (_req, res) => res.json({ ok: true }))

// Socket auth middleware (JWT opsiyonel: oda bazlı yetkilendirme eklenebilir)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1]
  if (!token) return next()
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    socket.data.user = payload
  } catch {}
  next()
})

io.on('connection', (socket) => {
  socket.on('join-lead', (leadId) => {
    socket.join(`lead:${leadId}`)
  })
})

// Shared helpers
function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })
  const token = auth.split(' ')[1]
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' })
  next()
}

// Auth routes
import authRouter from './routes/auth.js'
import leadsRouter from './routes/leads.js'
import bidsRouter from './routes/bids.js'
import usersRouter from './routes/users.js'
import leadSalesRouter from './routes/leadSales.js'
import settingsRouter from './routes/settings.js'
import userTypesRouter from './routes/userTypes.js'
import pagesRouter from './routes/pages.js'
import faqRouter from './routes/faq.js'
import aboutRouter from './routes/about.js'
import designSettingsRouter from './routes/designSettings.js'
import emailSmsSettingsRouter from './routes/emailSmsSettings.js'
import leadTypePermissionsRouter from './routes/leadTypePermissions.js'
import statisticsRouter from './routes/statistics.js'
import activityLogRouter from './routes/activityLog.js'
import twoFactorRouter from './routes/twoFactor.js'
import balanceRouter from './routes/balance.js'
import notificationsRouter from './routes/notifications.js'
import serverTimeRouter from './routes/serverTime.js'

app.use('/api/server-time', serverTimeRouter)
app.use('/api/auth', authRouter(prisma))
app.use('/api/leads', (req, res, next) => requireAuth(req, res, next), leadsRouter(prisma, io))
app.use('/api/bids', (req, res, next) => requireAuth(req, res, next), bidsRouter(prisma, io))
app.use('/api/users', (req, res, next) => requireAuth(req, res, next), usersRouter(prisma))
app.use('/api/lead-sales', (req, res, next) => requireAuth(req, res, next), leadSalesRouter(prisma))
app.use('/api/settings', settingsRouter)
app.use('/api/user-types', userTypesRouter(prisma))
app.use('/api/pages', pagesRouter(prisma))
app.use('/api/faq', faqRouter(prisma))
app.use('/api/statistics', statisticsRouter)
app.use('/api/about', aboutRouter(prisma))
app.use('/api/settings/design', designSettingsRouter(prisma))
app.use('/api/email-sms-settings', emailSmsSettingsRouter)
app.use('/api/lead-type-permissions', leadTypePermissionsRouter(prisma))
app.use('/api/activity-log', activityLogRouter)
app.use('/api/2fa', (req, res, next) => requireAuth(req, res, next), twoFactorRouter(prisma))
app.use('/api/balance', (req, res, next) => requireAuth(req, res, next), balanceRouter(prisma))
app.use('/api/notifications', (req, res, next) => requireAuth(req, res, next), notificationsRouter)

const port = process.env.PORT || 4000
server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://localhost:${port}`);
});

