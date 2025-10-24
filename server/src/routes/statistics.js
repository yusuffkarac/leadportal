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
          : buyer?.email || 'Bilinmeyen Kullanıcı';

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
      const type = sale.lead?.insuranceType || 'Belirtilmemiş';
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
        title: `${sale.buyer?.firstName || sale.buyer?.email || 'Kullanıcı'} bir lead satın aldı`,
        description: `${sale.lead?.title || 'Lead'} - ${sale.amount || 0} TRY`,
        time: formatTimeAgo(sale.createdAt),
        badge: 'Satış',
        badgeType: 'success'
      })),
      ...recentUsers.map(user => ({
        id: `user-${user.id}`,
        type: 'user',
        title: 'Yeni kullanıcı kaydı',
        description: user.firstName || user.email,
        time: formatTimeAgo(user.createdAt),
        badge: 'Kayıt',
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
      const code = sale.lead?.postalCode || 'Belirtilmemiş';
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

    instantBuySales.forEach(sale => {
      if (sale.lead?.instantBuyPrice && sale.amount >= sale.lead.instantBuyPrice) {
        instantBuyRevenue += sale.amount;
        instantBuyCount++;
      } else {
        auctionRevenue += sale.amount;
        auctionCount++;
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
            : sellerInfo?.email || 'Bilinmeyen',
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
      watchCount: lead._count.watchers,
      isActive: lead.isActive,
      isSold: lead.isSold
    }));

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
      sellerStatistics: {
        topSellers: topSellersSorted
      },
      userEngagement: {
        peakHours,
        hourlyActivity,
        totalWatches,
        watchesLast24h,
        mostWatchedLeads: watchedLeadsData
      }
    });
  } catch (error) {
    console.error('İstatistik hatası:', error);
    res.status(500).json({ error: 'İstatistikler yüklenirken bir hata oluştu' });
  }
});

// Zaman farkını hesaplayan yardımcı fonksiyon
function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Şimdi';
  if (minutes < 60) return `${minutes} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  return `${days} gün önce`;
}

export default router;
