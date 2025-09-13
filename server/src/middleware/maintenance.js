import { PrismaClient } from '../../generated/prisma/index.js'

const prisma = new PrismaClient()

// Bakım modu middleware'i
export async function checkMaintenanceMode(req, res, next) {
  try {
    // Admin rotaları ve login sayfası bakım modundan etkilenmez
    const adminRoutes = ['/api/auth/login', '/api/settings', '/api/users']
    const isAdminRoute = adminRoutes.some(route => req.path.startsWith(route))
    
    // Admin kullanıcıları bakım modundan etkilenmez
    const token = req.headers.authorization?.replace('Bearer ', '')
    let isAdmin = false
    
    if (token) {
      try {
        const jwt = await import('jsonwebtoken')
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET)
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { role: true }
        })
        isAdmin = user?.role === 'ADMIN'
      } catch (error) {
        // Token geçersizse normal kullanıcı olarak devam et
      }
    }
    
    // Admin rotaları veya admin kullanıcıları için bakım modunu atla
    if (isAdminRoute || isAdmin) {
      return next()
    }
    
    // Bakım modu ayarlarını kontrol et
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
      select: { maintenanceMode: true, maintenanceMessage: true }
    })
    
    if (settings?.maintenanceMode) {
      return res.status(503).json({
        error: 'Maintenance Mode',
        message: settings.maintenanceMessage || 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
        maintenance: true
      })
    }
    
    next()
  } catch (error) {
    console.error('Maintenance mode check error:', error)
    // Hata durumunda normal devam et
    next()
  }
}
