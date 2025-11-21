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
 * GET /api/statistics
 * Platform istatistiklerini getir - Kapsamlı versiyon
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Toplam kullanıcı sayısı
    const totalUsers = await prisma.user.count();

    // Aktif kullanıcılar (son 7 gün içinde aktivite gösteren - bid veya satın alma yapanlar)
    const activeBidders = await prisma.bid.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });

    const activeBuyers = await prisma.leadSale.groupBy({
      by: ['buyerId'],
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });

    const activeUserIds = new Set([
      ...activeBidders.map(b => b.userId),
      ...activeBuyers.map(b => b.buyerId)
    ]);

    const activeUsers = activeUserIds.size;

    // Son 24 saatte kayıt olan kullanıcılar
    const newUsersLast24h = await prisma.user.count({
      where: {
        createdAt: {
          gte: oneDayAgo
        }
      }
    });

    const todayLeadSales = await prisma.leadSale.findMany({
      where: {
        createdAt: {
          gte: today
        }
      },
      include: {
        lead: true
      }
    });

    const todayLeadsSold = todayLeadSales.length;
    const todayRevenue = todayLeadSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);

    // Tüm zamanlar satış istatistikleri
    const allLeadSales = await prisma.leadSale.findMany({
      include: {
        lead: true,
        buyer: true
      }
    });

    const allTimeLeadsSold = allLeadSales.length;
    const allTimeRevenue = allLeadSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
    const avgLeadPrice = allTimeLeadsSold > 0 ? allTimeRevenue / allTimeLeadsSold : 0;

    // En çok satın alanlar (bu ay)
    const thisMonthSales = await prisma.leadSale.groupBy({
      by: ['buyerId'],
      where: {
        createdAt: {
          gte: thisMonthStart
        }
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    });

    const lastMonthSales = await prisma.leadSale.groupBy({
      by: ['buyerId'],
      where: {
        createdAt: {
          gte: lastMonthStart,
          lt: thisMonthStart
        }
      },
      _sum: {
        amount: true
      }
    });

    // Kullanıcı bilgilerini çek
    const buyerIds = thisMonthSales.map(s => s.buyerId);
    const buyers = await prisma.user.findMany({
      where: {
        id: { in: buyerIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    const topBuyers = thisMonthSales
      .map(sale => {
        const buyer = buyers.find(b => b.id === sale.buyerId);
        const buyerName = buyer?.firstName
          ? `${buyer.firstName} ${buyer.lastName || ''}`.trim()
          : buyer?.email || 'Unbekannter Benutzer';

        const lastMonth = lastMonthSales.find(s => s.buyerId === sale.buyerId);
        const thisMonthSpent = sale._sum.amount || 0;
        const lastMonthSpent = lastMonth?._sum.amount || 0;

        let growth = 0;
        if (lastMonthSpent > 0) {
          growth = Math.round(((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100);
        } else if (thisMonthSpent > 0) {
          growth = 100;
        }

        return {
          id: sale.buyerId,
          name: buyerName,
          leadCount: sale._count.id,
          totalSpent: thisMonthSpent,
          growth: growth
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Sigorta tipi dağılımı
    const salesByType = await prisma.leadSale.findMany({
      include: {
        lead: true
      }
    });

    const revenueByTypeMap = {};
    salesByType.forEach(sale => {
      const type = sale.lead?.insuranceType || 'Nicht angegeben';
      if (!revenueByTypeMap[type]) {
        revenueByTypeMap[type] = {
          insuranceType: type,
          revenue: 0,
          leadCount: 0
        };
      }
      revenueByTypeMap[type].revenue += sale.amount || 0;
      revenueByTypeMap[type].leadCount += 1;
    });

    const revenueByType = Object.values(revenueByTypeMap)
      .map(item => ({
        ...item,
        percentage: allTimeRevenue > 0 ? Math.round((item.revenue / allTimeRevenue) * 100) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Son aktiviteler (son 24 saat)
    const recentSales = await prisma.leadSale.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo
        }
      },
      include: {
        lead: true,
        buyer: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    const recentUsers = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    const recentActivity = [
      ...recentSales.map(sale => ({
        id: `sale-${sale.id}`,
        type: 'sale',
        title: `${sale.buyer?.firstName || sale.buyer?.email || 'Benutzer'} hat einen Lead gekauft`,
        description: `${sale.lead?.title || 'Lead'} - ${sale.amount || 0} TRY`,
        time: formatTimeAgo(sale.createdAt),
        badge: 'Verkauf',
        badgeType: 'success'
      })),
      ...recentUsers.map(user => ({
        id: `user-${user.id}`,
        type: 'user',
        title: 'Neue Benutzerregistrierung',
        description: user.firstName || user.email,
        time: formatTimeAgo(user.createdAt),
        badge: 'Registrierung',
        badgeType: 'primary'
      }))
    ]
      .sort((a, b) => {
        // Sort by actual date
        const aDate = recentSales.find(s => `sale-${s.id}` === a.id)?.createdAt ||
                      recentUsers.find(u => `user-${u.id}` === a.id)?.createdAt;
        const bDate = recentSales.find(s => `sale-${s.id}` === b.id)?.createdAt ||
                      recentUsers.find(u => `user-${u.id}` === b.id)?.createdAt;
        return new Date(bDate) - new Date(aDate);
      })
      .slice(0, 10);

    // ==================== YENİ İSTATİSTİKLER ====================

    // 1. SON 30 GÜN SATIŞ TRENDİ
    const salesTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySales = await prisma.leadSale.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      });

      salesTrend.push({
        date: date.toISOString().split('T')[0],
        count: daySales.length,
        revenue: daySales.reduce((sum, s) => sum + (s.amount || 0), 0)
      });
    }

    // 2. LEAD PERFORMANS METRİKLERİ
    const activeLeads = await prisma.lead.count({
      where: { isActive: true, isSold: false }
    });

    const totalLeads = await prisma.lead.count();
    const soldLeads = await prisma.lead.count({ where: { isSold: true } });

    // Ortalama satış süresi
    const soldLeadsWithTime = await prisma.lead.findMany({
      where: { isSold: true },
      include: { sale: true }
    });

    let avgSaleTime = 0;
    if (soldLeadsWithTime.length > 0) {
      const totalTime = soldLeadsWithTime.reduce((sum, lead) => {
        if (lead.sale) {
          const created = new Date(lead.createdAt).getTime();
          const sold = new Date(lead.sale.soldAt).getTime();
          return sum + (sold - created);
        }
        return sum;
      }, 0);
      avgSaleTime = Math.floor(totalTime / soldLeadsWithTime.length / (1000 * 60 * 60)); // Saat cinsinden
    }

    // En hızlı ve en yüksek fiyatlı satışlar
    const fastestSales = soldLeadsWithTime
      .map(lead => {
        if (!lead.sale) return null;
        const created = new Date(lead.createdAt).getTime();
        const sold = new Date(lead.sale.soldAt).getTime();
        const hours = (sold - created) / (1000 * 60 * 60);
        return {
          title: lead.title,
          id: lead.id,
          hours: Math.round(hours * 10) / 10,
          amount: lead.sale.amount
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.hours - b.hours)
      .slice(0, 5);

    const highestSales = allLeadSales
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(sale => ({
        title: sale.lead?.title || 'Unknown',
        id: sale.lead?.id,
        amount: sale.amount,
        buyer: sale.buyer?.firstName || sale.buyer?.email || 'Unknown'
      }));

    // 3. TEKLİF İSTATİSTİKLERİ
    const totalBids = await prisma.bid.count();
    const bidsLast24h = await prisma.bid.count({
      where: { createdAt: { gte: oneDayAgo } }
    });

    const leadsWithBids = await prisma.lead.findMany({
      where: { bids: { some: {} } },
      include: { _count: { select: { bids: true } } }
    });

    const avgBidsPerLead = leadsWithBids.length > 0
      ? leadsWithBids.reduce((sum, l) => sum + l._count.bids, 0) / leadsWithBids.length
      : 0;

    const mostBiddedLeads = leadsWithBids
      .sort((a, b) => b._count.bids - a._count.bids)
      .slice(0, 5)
      .map(lead => ({
        title: lead.title,
        id: lead.id,
        bidCount: lead._count.bids,
        isActive: lead.isActive
      }));

    // Teklif conversion rate
    const uniqueBidders = await prisma.bid.groupBy({
      by: ['userId']
    });
    const uniqueBuyers = await prisma.leadSale.groupBy({
      by: ['buyerId']
    });
    const bidConversionRate = uniqueBidders.length > 0
      ? Math.round((uniqueBuyers.length / uniqueBidders.length) * 100)
      : 0;

    // 4. COĞRAFİ/POSTA KODU ANALİZİ
    const salesByPostalCode = await prisma.leadSale.findMany({
      include: { lead: true }
    });

    const postalCodeMap = {};
    salesByPostalCode.forEach(sale => {
      const code = sale.lead?.postalCode || 'Nicht angegeben';
      if (!postalCodeMap[code]) {
        postalCodeMap[code] = { postalCode: code, count: 0, revenue: 0 };
      }
      postalCodeMap[code].count++;
      postalCodeMap[code].revenue += sale.amount || 0;
    });

    const topPostalCodes = Object.values(postalCodeMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 5. FİNANSAL DETAYLAR
    const thisMonthSalesData = await prisma.leadSale.findMany({
      where: { createdAt: { gte: thisMonthStart } }
    });
    const lastMonthSalesData = await prisma.leadSale.findMany({
      where: {
        createdAt: { gte: lastMonthStart, lt: thisMonthStart }
      }
    });

    const thisMonthRevenue = thisMonthSalesData.reduce((sum, s) => sum + (s.amount || 0), 0);
    const lastMonthRevenue = lastMonthSalesData.reduce((sum, s) => sum + (s.amount || 0), 0);
    const monthlyGrowth = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 100;

    const thisWeekSalesData = await prisma.leadSale.findMany({
      where: { createdAt: { gte: thisWeekStart } }
    });
    const lastWeekSalesData = await prisma.leadSale.findMany({
      where: {
        createdAt: { gte: lastWeekStart, lt: thisWeekStart }
      }
    });

    const thisWeekRevenue = thisWeekSalesData.reduce((sum, s) => sum + (s.amount || 0), 0);
    const lastWeekRevenue = lastWeekSalesData.reduce((sum, s) => sum + (s.amount || 0), 0);
    const weeklyGrowth = lastWeekRevenue > 0
      ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
      : 100;

    // Hemen Al vs Açık Artırma
    const instantBuySales = await prisma.leadSale.findMany({
      include: { lead: true }
    });

    let instantBuyRevenue = 0;
    let auctionRevenue = 0;
    let instantBuyCount = 0;
    let auctionCount = 0;

    // Payment method breakdown
    let balanceRevenue = 0;
    let ibanRevenue = 0;
    let balanceCount = 0;
    let ibanCount = 0;

    // Payment status breakdown (IBAN specific)
    let ibanPendingRevenue = 0;
    let ibanCompletedRevenue = 0;
    let ibanPendingCount = 0;
    let ibanCompletedCount = 0;

    instantBuySales.forEach(sale => {
      // Instant buy vs auction
      if (sale.lead?.instantBuyPrice && sale.amount >= sale.lead.instantBuyPrice) {
        instantBuyRevenue += sale.amount;
        instantBuyCount++;
      } else {
        auctionRevenue += sale.amount;
        auctionCount++;
      }

      // Payment method breakdown
      if (sale.paymentMethod === 'balance') {
        balanceRevenue += sale.amount;
        balanceCount++;
      } else if (sale.paymentMethod === 'iban') {
        ibanRevenue += sale.amount;
        ibanCount++;

        // IBAN payment status breakdown
        if (sale.paymentStatus === 'PENDING') {
          ibanPendingRevenue += sale.amount;
          ibanPendingCount++;
        } else if (sale.paymentStatus === 'COMPLETED') {
          ibanCompletedRevenue += sale.amount;
          ibanCompletedCount++;
        }
      }
    });

    // 6. SATICI İSTATİSTİKLERİ
    const topSellers = await prisma.lead.groupBy({
      by: ['ownerId'],
      where: { isSold: true },
      _count: { id: true }
    });

    const sellerIds = topSellers.map(s => s.ownerId);
    const sellers = await prisma.user.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, firstName: true, lastName: true, email: true }
    });

    const sellerStats = await Promise.all(
      topSellers.map(async (seller) => {
        const sellerInfo = sellers.find(s => s.id === seller.ownerId);
        const sellerSales = await prisma.leadSale.findMany({
          where: {
            lead: { ownerId: seller.ownerId }
          }
        });
        const revenue = sellerSales.reduce((sum, s) => sum + (s.amount || 0), 0);

        return {
          id: seller.ownerId,
          name: sellerInfo?.firstName
            ? `${sellerInfo.firstName} ${sellerInfo.lastName || ''}`.trim()
            : sellerInfo?.email || 'Unbekannt',
          leadsSold: seller._count.id,
          totalRevenue: revenue,
          avgPrice: seller._count.id > 0 ? Math.round(revenue / seller._count.id) : 0
        };
      })
    );

    const topSellersSorted = sellerStats
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // 7. EN AKTİF SAATLER
    const bidsWithTime = await prisma.bid.findMany({
      select: { createdAt: true }
    });

    const hourlyActivity = Array(24).fill(0);
    bidsWithTime.forEach(bid => {
      const hour = new Date(bid.createdAt).getHours();
      hourlyActivity[hour]++;
    });

    const peakHours = hourlyActivity
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 8. WATCHLIST İSTATİSTİKLERİ
    const totalWatches = await prisma.leadWatch.count();
    const watchesLast24h = await prisma.leadWatch.count({
      where: { createdAt: { gte: oneDayAgo } }
    });

    const mostWatchedLeads = await prisma.lead.findMany({
      include: { _count: { select: { watchers: true } } },
      orderBy: { watchers: { _count: 'desc' } },
      take: 5
    });

    const watchedLeadsData = mostWatchedLeads.map(lead => ({
      title: lead.title,
      id: lead.id,
      watchCount: lead._count.watchers,
      isActive: lead.isActive,
      isSold: lead.isSold
    }));

    // 9. KULLANICI AKTİVİTE İSTATİSTİKLERİ
    const fiveMinutesAgo = new Date(now);
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    // Son 10 kullanıcının aktivite bilgileri
    const recentActiveUsers = await prisma.user.findMany({
      where: {
        lastActivity: {
          not: null
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        lastActivity: true,
        lastIP: true,
        lastUserAgent: true,
        createdAt: true
      },
      orderBy: {
        lastActivity: 'desc'
      },
      take: 10
    });

    // Online kullanıcı sayısı (son 5 dakika içinde aktivite gösteren)
    const onlineUsers = await prisma.user.count({
      where: {
        lastActivity: {
          gte: fiveMinutesAgo
        }
      }
    });

    // User agent'ları parse et (basit versiyon)
    const userActivityStats = recentActiveUsers.map(user => {
      const userName = user.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : user.username || user.email;

      // User agent'tan basit cihaz/tarayıcı bilgisi çıkar
      let deviceInfo = 'Unbekanntes Gerät';
      if (user.lastUserAgent) {
        if (user.lastUserAgent.includes('Mobile') || user.lastUserAgent.includes('Android')) {
          deviceInfo = 'Mobil';
        } else if (user.lastUserAgent.includes('iPhone') || user.lastUserAgent.includes('iPad')) {
          deviceInfo = 'iOS';
        } else {
          deviceInfo = 'Desktop';
        }

        // Tarayıcı bilgisi
        if (user.lastUserAgent.includes('Chrome')) deviceInfo += ' - Chrome';
        else if (user.lastUserAgent.includes('Firefox')) deviceInfo += ' - Firefox';
        else if (user.lastUserAgent.includes('Safari') && !user.lastUserAgent.includes('Chrome')) deviceInfo += ' - Safari';
        else if (user.lastUserAgent.includes('Edge')) deviceInfo += ' - Edge';
      }

      // Online durumu (son 5 dakika)
      const isOnline = user.lastActivity && new Date(user.lastActivity) >= fiveMinutesAgo;

      return {
        id: user.id,
        name: userName,
        email: user.email,
        lastActivity: user.lastActivity,
        lastActivityFormatted: user.lastActivity ? formatTimeAgo(user.lastActivity) : 'Nie',
        lastIP: user.lastIP || 'Unbekannt',
        deviceInfo,
        isOnline,
        registeredAt: user.createdAt
      };
    });

    res.json({
      // Mevcut istatistikler
      totalUsers,
      activeUsers,
      newUsersLast24h,
      todayLeadsSold,
      todayRevenue,
      allTimeLeadsSold,
      allTimeRevenue,
      avgLeadPrice,
      topBuyers,
      revenueByType,
      recentActivity,

      // Yeni istatistikler
      salesTrend,
      leadPerformance: {
        activeLeads,
        totalLeads,
        soldLeads,
        avgSaleTime,
        fastestSales,
        highestSales,
        conversionRate: totalLeads > 0 ? Math.round((soldLeads / totalLeads) * 100) : 0
      },
      bidStatistics: {
        totalBids,
        bidsLast24h,
        avgBidsPerLead: Math.round(avgBidsPerLead * 10) / 10,
        mostBiddedLeads,
        bidConversionRate
      },
      geographicData: {
        topPostalCodes
      },
      financialComparison: {
        thisMonth: { revenue: thisMonthRevenue, count: thisMonthSalesData.length },
        lastMonth: { revenue: lastMonthRevenue, count: lastMonthSalesData.length },
        monthlyGrowth,
        thisWeek: { revenue: thisWeekRevenue, count: thisWeekSalesData.length },
        lastWeek: { revenue: lastWeekRevenue, count: lastWeekSalesData.length },
        weeklyGrowth,
        instantBuy: { revenue: instantBuyRevenue, count: instantBuyCount },
        auction: { revenue: auctionRevenue, count: auctionCount }
      },
      paymentBreakdown: {
        balance: { revenue: balanceRevenue, count: balanceCount },
        iban: {
          total: { revenue: ibanRevenue, count: ibanCount },
          pending: { revenue: ibanPendingRevenue, count: ibanPendingCount },
          completed: { revenue: ibanCompletedRevenue, count: ibanCompletedCount }
        }
      },
      sellerStatistics: {
        topSellers: topSellersSorted
      },
      userEngagement: {
        peakHours,
        hourlyActivity,
        totalWatches,
        watchesLast24h,
        mostWatchedLeads: watchedLeadsData
      },
      userActivity: {
        recentActiveUsers: userActivityStats,
        onlineUsers
      },
      feedbackStatistics: {
        totalFeedbacks: await prisma.feedback.count(),
        openFeedbacks: await prisma.feedback.count({ where: { status: 'OPEN' } }),
        inProgressFeedbacks: await prisma.feedback.count({ where: { status: 'IN_PROGRESS' } }),
        resolvedFeedbacks: await prisma.feedback.count({ where: { status: 'RESOLVED' } }),
        closedFeedbacks: await prisma.feedback.count({ where: { status: 'CLOSED' } }),
        feedbacksLast24h: await prisma.feedback.count({
          where: {
            createdAt: {
              gte: oneDayAgo
            }
          }
        }),
        feedbacksLast7Days: await prisma.feedback.count({
          where: {
            createdAt: {
              gte: sevenDaysAgo
            }
          }
        }),
        avgRating: await (async () => {
          const ratings = await prisma.feedback.findMany({
            where: {
              rating: { not: null }
            },
            select: {
              rating: true
            }
          });
          if (ratings.length === 0) return 0;
          const sum = ratings.reduce((acc, f) => acc + f.rating, 0);
          return Math.round((sum / ratings.length) * 10) / 10;
        })(),
        totalReplies: await prisma.feedbackReply.count(),
        avgResponseTime: await (async () => {
          // Feedback'lerin ilk reply'lerine kadar geçen süreyi hesapla
          const feedbacksWithReplies = await prisma.feedback.findMany({
            where: {
              replies: {
                some: {}
              }
            },
            include: {
              replies: {
                orderBy: {
                  createdAt: 'asc'
                },
                take: 1
              }
            }
          });
          
          if (feedbacksWithReplies.length === 0) return 0;
          
          const responseTimes = feedbacksWithReplies.map(f => {
            const firstReply = f.replies[0];
            if (!firstReply) return 0;
            const timeDiff = firstReply.createdAt.getTime() - f.createdAt.getTime();
            return timeDiff / (1000 * 60 * 60); // Saat cinsinden
          }).filter(t => t > 0);
          
          if (responseTimes.length === 0) return 0;
          const avg = responseTimes.reduce((acc, t) => acc + t, 0) / responseTimes.length;
          return Math.round(avg * 10) / 10;
        })()
      }
    });
  } catch (error) {
    console.error('İstatistik hatası:', error);
    res.status(500).json({ error: 'Beim Laden der Statistiken ist ein Fehler aufgetreten' });
  }
});

/**
 * GET /api/statistics/user
 * Kullanıcı kişisel istatistiklerini getir
 */
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    
    // Zaman aralıkları
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    
    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

    // 1. SATIN ALMA İSTATİSTİKLERİ
    const purchasedLeads = await prisma.leadSale.findMany({
      where: { buyerId: userId },
      include: {
        lead: {
          include: {
            owner: {
              select: { email: true, firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: { soldAt: 'desc' }
    });

    const totalSpent = purchasedLeads.reduce((sum, sale) => sum + sale.amount, 0);
    const avgPurchasePrice = purchasedLeads.length > 0 ? Math.round(totalSpent / purchasedLeads.length) : 0;
    
    // Son 30 gün satın almalar
    const last30DaysPurchases = purchasedLeads.filter(sale => 
      new Date(sale.soldAt) >= thirtyDaysAgo
    );
    
    const last30DaysSpent = last30DaysPurchases.reduce((sum, sale) => sum + sale.amount, 0);
    
    // Bu ay vs geçen ay karşılaştırması
    const thisMonthPurchases = purchasedLeads.filter(sale => 
      new Date(sale.soldAt) >= thisMonthStart
    );
    
    const lastMonthPurchases = purchasedLeads.filter(sale => {
      const saleDate = new Date(sale.soldAt);
      return saleDate >= lastMonthStart && saleDate < thisMonthStart;
    });
    
    const thisMonthSpent = thisMonthPurchases.reduce((sum, sale) => sum + sale.amount, 0);
    const lastMonthSpent = lastMonthPurchases.reduce((sum, sale) => sum + sale.amount, 0);
    const monthlyGrowth = lastMonthSpent > 0 ? 
      Math.round(((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100) : 0;

    // 2. TEKLİF İSTATİSTİKLERİ
    const userBids = await prisma.bid.findMany({
      where: { userId },
      include: {
        lead: {
          select: { 
            id: true, 
            title: true, 
            isSold: true,
            endsAt: true,
            sale: { select: { buyerId: true, amount: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalBids = userBids.length;
    const wonBids = userBids.filter(bid => 
      bid.lead.isSold && bid.lead.sale?.buyerId === userId
    ).length;
    
    const bidWinRate = totalBids > 0 ? Math.round((wonBids / totalBids) * 100) : 0;
    
    // Son 30 gün teklifler
    const last30DaysBids = userBids.filter(bid => 
      new Date(bid.createdAt) >= thirtyDaysAgo
    );

    // 3. WATCHLIST İSTATİSTİKLERİ
    const watchlist = await prisma.leadWatch.findMany({
      where: { userId },
      include: {
        lead: {
          select: { 
            id: true, 
            title: true, 
            isSold: true, 
            sale: { select: { buyerId: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalWatched = watchlist.length;
    const purchasedFromWatchlist = watchlist.filter(watch => 
      watch.lead.isSold && watch.lead.sale?.buyerId === userId
    ).length;
    
    const watchlistConversionRate = totalWatched > 0 ? 
      Math.round((purchasedFromWatchlist / totalWatched) * 100) : 0;

    // 4. COĞRAFİ ANALİZ
    const postalCodeStats = {};
    purchasedLeads.forEach(sale => {
      const postalCode = sale.lead.postalCode || 'Nicht angegeben';
      if (!postalCodeStats[postalCode]) {
        postalCodeStats[postalCode] = { count: 0, totalSpent: 0 };
      }
      postalCodeStats[postalCode].count++;
      postalCodeStats[postalCode].totalSpent += sale.amount;
    });

    const topPostalCodes = Object.entries(postalCodeStats)
      .map(([postalCode, stats]) => ({
        postalCode,
        count: stats.count,
        totalSpent: stats.totalSpent,
        avgSpent: Math.round(stats.totalSpent / stats.count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 5. ZAMAN ANALİZİ
    const hourlyActivity = Array(24).fill(0);
    const dailyActivity = Array(7).fill(0);
    
    purchasedLeads.forEach(sale => {
      const date = new Date(sale.soldAt);
      hourlyActivity[date.getHours()]++;
      dailyActivity[date.getDay()]++;
    });

    // En aktif saatler
    const peakHours = hourlyActivity
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // 6. PERFORMANS METRİKLERİ
    const recentPurchases = purchasedLeads.slice(0, 5);
    const recentBids = userBids.slice(0, 5);
    const recentWatchlist = watchlist.slice(0, 5);

    // 7. BAŞARIM ROZETLERİ
    const achievements = [];
    
    if (purchasedLeads.length >= 10) achievements.push({ name: 'Erfahrener Käufer', description: '10+ Leads gekauft' });
    if (bidWinRate >= 50) achievements.push({ name: 'Expertenbietender', description: '50%+ Gewinnrate' });
    if (totalSpent >= 10000) achievements.push({ name: 'Großer Investor', description: '10.000+ TL ausgegeben' });
    if (thisMonthSpent > lastMonthSpent) achievements.push({ name: 'Wachsender Käufer', description: 'Monatliches Wachstum gezeigt' });
    if (purchasedFromWatchlist >= 5) achievements.push({ name: 'Planmäßiger Käufer', description: '5+ Watchlist-Käufe' });

    // 8. HEDEFLER VE İLERLEME
    const monthlyGoal = 5000; // Varsayılan aylık hedef
    const goalProgress = Math.min(Math.round((thisMonthSpent / monthlyGoal) * 100), 100);

    res.json({
      // Genel istatistikler
      totalPurchases: purchasedLeads.length,
      totalSpent,
      avgPurchasePrice,
      totalBids,
      wonBids,
      bidWinRate,
      totalWatched,
      purchasedFromWatchlist,
      watchlistConversionRate,
      
      // Zaman bazlı analizler
      last30Days: {
        purchases: last30DaysPurchases.length,
        spent: last30DaysSpent,
        bids: last30DaysBids.length
      },
      
      monthlyComparison: {
        thisMonth: { purchases: thisMonthPurchases.length, spent: thisMonthSpent },
        lastMonth: { purchases: lastMonthPurchases.length, spent: lastMonthSpent },
        growth: monthlyGrowth
      },
      
      // Coğrafi analiz
      topPostalCodes,
      
      // Aktivite paternleri
      peakHours,
      hourlyActivity,
      dailyActivity,
      
      // Son aktiviteler
      recentPurchases: recentPurchases.map(sale => ({
        id: sale.id,
        leadId: sale.lead.id,
        leadTitle: sale.lead.title,
        amount: sale.amount,
        soldAt: sale.soldAt,
        seller: sale.lead.owner.email
      })),
      
      recentBids: recentBids.map(bid => {
        const now = new Date();
        const leadEndsAt = new Date(bid.lead.endsAt);
        const isLeadExpired = leadEndsAt <= now;
        
        let status = 'waiting'; // Varsayılan durum - teklif bekliyor
        
        // Lead satılmışsa (isSold = true)
        if (bid.lead.isSold) {
          if (bid.lead.sale?.buyerId === userId) {
            status = 'won'; // Ben kazandım
          } else {
            status = 'lost'; // Başkası kazandı
          }
        } 
        // Lead henüz satılmamış ama süresi dolmuşsa
        else if (isLeadExpired) {
          status = 'lost'; // Süre doldu, kimse kazanmadı
        }
        // Lead hala aktif ve süresi dolmamışsa
        else {
          status = 'waiting'; // Hala bekliyor
        }
        
        return {
          id: bid.id,
          leadId: bid.lead.id,
          leadTitle: bid.lead.title,
          amount: bid.amount,
          createdAt: bid.createdAt,
          won: status === 'won',
          status: status
        };
      }),
      
      recentWatchlist: recentWatchlist.map(watch => ({
        id: watch.id,
        leadId: watch.lead.id,
        leadTitle: watch.lead.title,
        watchedAt: watch.createdAt,
        purchased: watch.lead.isSold && watch.lead.sale?.buyerId === userId
      })),
      
      // Başarımlar ve hedefler
      achievements,
      monthlyGoal,
      goalProgress
    });

  } catch (error) {
    console.error('Kullanıcı istatistik hatası:', error);
    res.status(500).json({ error: 'Beim Laden der Statistiken ist ein Fehler aufgetreten' });
  }
});

/**
 * GET /api/statistics/user/purchases
 * Kullanıcının tüm satın almalarını getir
 */
router.get('/user/purchases', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const purchasedLeads = await prisma.leadSale.findMany({
      where: { buyerId: userId },
      include: {
        lead: {
          include: {
            owner: {
              select: { email: true, firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: { soldAt: 'desc' }
    });

    res.json(purchasedLeads.map(sale => ({
      id: sale.id,
      leadId: sale.lead.id,
      leadTitle: sale.lead.title,
      amount: sale.amount,
      soldAt: sale.soldAt,
      paymentMethod: sale.paymentMethod,
      balanceBefore: sale.balanceBefore,
      balanceAfter: sale.balanceAfter,
      seller: sale.lead.owner.firstName
        ? `${sale.lead.owner.firstName} ${sale.lead.owner.lastName || ''}`.trim()
        : sale.lead.owner.email
    })));
  } catch (error) {
    console.error('Satın alma listesi hatası:', error);
    res.status(500).json({ error: 'Beim Laden der Kaufliste ist ein Fehler aufgetreten' });
  }
});

/**
 * GET /api/statistics/user/bids
 * Kullanıcının tüm tekliflerini getir
 */
router.get('/user/bids', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const userBids = await prisma.bid.findMany({
      where: { userId },
      include: {
        lead: {
          select: {
            id: true,
            title: true,
            isSold: true,
            endsAt: true,
            sale: { select: { buyerId: true, amount: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(userBids.map(bid => {
      const now = new Date();
      const leadEndsAt = new Date(bid.lead.endsAt);
      const isLeadExpired = leadEndsAt <= now;

      let status = 'waiting';

      if (bid.lead.isSold) {
        if (bid.lead.sale?.buyerId === userId) {
          status = 'won';
        } else {
          status = 'lost';
        }
      } else if (isLeadExpired) {
        status = 'lost';
      } else {
        status = 'waiting';
      }

      return {
        id: bid.id,
        leadId: bid.lead.id,
        leadTitle: bid.lead.title,
        amount: bid.amount,
        createdAt: bid.createdAt,
        won: status === 'won',
        status: status
      };
    }));
  } catch (error) {
    console.error('Teklif listesi hatası:', error);
    res.status(500).json({ error: 'Beim Laden der Gebotsliste ist ein Fehler aufgetreten' });
  }
});

/**
 * GET /api/statistics/user/watchlist
 * Kullanıcının tüm watchlist öğelerini getir
 */
router.get('/user/watchlist', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const watchlist = await prisma.leadWatch.findMany({
      where: { userId },
      include: {
        lead: {
          select: {
            id: true,
            title: true,
            isSold: true,
            sale: { select: { buyerId: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(watchlist.map(watch => ({
      id: watch.id,
      leadId: watch.lead.id,
      leadTitle: watch.lead.title,
      watchedAt: watch.createdAt,
      purchased: watch.lead.isSold && watch.lead.sale?.buyerId === userId
    })));
  } catch (error) {
    console.error('Watchlist hatası:', error);
    res.status(500).json({ error: 'Beim Laden der Watchlist ist ein Fehler aufgetreten' });
  }
});

// Zaman farkını hesaplayan yardımcı fonksiyon
function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Jetzt';
  if (minutes < 60) return `vor ${minutes} Minuten`;
  if (hours < 24) return `vor ${hours} Stunden`;
  return `vor ${days} Tagen`;
}

export default router;
