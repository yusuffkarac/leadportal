import express from 'express';
import { PrismaClient } from '../prismaClient.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

// Auth middleware
function authenticateToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

/**
 * GET /api/activity-log
 * Aktivite loglarını getir (Admin only)
 * Query params:
 * - page: Sayfa numarası (default: 1)
 * - limit: Sayfa başına kayıt sayısı (default: 50, max: 100)
 * - userId: Belirli bir kullanıcının logları
 * - action: Belirli bir aktivite tipi
 * - startDate: Başlangıç tarihi
 * - endDate: Bitiş tarihi
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const { userId, action, startDate, endDate, search } = req.query;

    // Filtre oluştur
    const where = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Kullanıcı adı/email arama
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    // Toplam kayıt sayısı
    const total = await prisma.activityLog.count({ where });

    // Aktivite loglarını çek
    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            username: true,
            userType: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    // Details'i parse et
    const parsedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));

    res.json({
      logs: parsedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Activity log hatası:', error);
    res.status(500).json({ error: 'Aktivite logları yüklenirken bir hata oluştu' });
  }
});

/**
 * GET /api/activity-log/actions
 * Tüm aktivite tiplerini getir (Admin only)
 */
router.get('/actions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const actions = await prisma.activityLog.groupBy({
      by: ['action'],
      _count: {
        action: true
      },
      orderBy: {
        _count: {
          action: 'desc'
        }
      }
    });

    res.json(actions);
  } catch (error) {
    console.error('Actions hatası:', error);
    res.status(500).json({ error: 'Aktivite tipleri yüklenirken hata oluştu' });
  }
});

/**
 * GET /api/activity-log/stats
 * Aktivite istatistikleri (Admin only)
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Son 24 saat aktivite sayısı
    const last24h = await prisma.activityLog.count({
      where: {
        createdAt: {
          gte: oneDayAgo
        }
      }
    });

    // Son 7 gün aktivite sayısı
    const last7Days = await prisma.activityLog.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });

    // Son 30 gün aktivite sayısı
    const last30Days = await prisma.activityLog.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Toplam aktivite
    const total = await prisma.activityLog.count();

    // En aktif kullanıcılar (son 7 gün)
    const topUsers = await prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Kullanıcı bilgilerini al
    const userIds = topUsers.map(u => u.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true
      }
    });

    const topUsersWithInfo = topUsers.map(u => {
      const user = users.find(usr => usr.id === u.userId);
      return {
        userId: u.userId,
        count: u._count.id,
        user: user || null
      };
    });

    // En sık yapılan aktiviteler
    const topActions = await prisma.activityLog.groupBy({
      by: ['action'],
      _count: {
        action: true
      },
      orderBy: {
        _count: {
          action: 'desc'
        }
      },
      take: 10
    });

    // Son 30 gün günlük aktivite trendi
    const activityTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await prisma.activityLog.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      });

      activityTrend.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }

    res.json({
      total,
      last24h,
      last7Days,
      last30Days,
      topUsers: topUsersWithInfo,
      topActions,
      activityTrend
    });
  } catch (error) {
    console.error('Stats hatası:', error);
    res.status(500).json({ error: 'İstatistikler yüklenirken hata oluştu' });
  }
});

/**
 * DELETE /api/activity-log/old
 * Eski logları temizle (Admin only)
 * Query params:
 * - days: Kaç günden eski loglar silinsin (default: 90)
 */
router.delete('/old', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    res.json({
      message: `${result.count} adet eski log silindi`,
      deletedCount: result.count
    });
  } catch (error) {
    console.error('Delete old logs hatası:', error);
    res.status(500).json({ error: 'Eski loglar silinirken hata oluştu' });
  }
});

export default router;
