import express from 'express';
import { createNotification } from '../services/notificationService.js';
import { logActivity, ActivityTypes, extractRequestInfo } from '../utils/activityLogger.js';

const router = express.Router();

export default function leadSalesRouter(prisma) {

// Kullanıcının satın aldığı lead'leri getir
router.get('/purchased', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const purchasedLeads = await prisma.leadSale.findMany({
      where: {
        buyerId: userId
      },
      include: {
        lead: {
          include: {
            owner: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        soldAt: 'desc'
      }
    });

    res.json(purchasedLeads);
  } catch (error) {
    console.error('Error fetching purchased leads:', error);
    res.status(500).json({ error: 'Failed to fetch purchased leads' });
  }
});

// Admin: Tüm satışları getir
router.get('/admin/all', async (req, res) => {
  try {
    if (req.user?.userTypeId !== 'ADMIN' && req.user?.userTypeId !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const sales = await prisma.leadSale.findMany({
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            ibanAccountHolder: true,
            ibanNumber: true
          }
        },
        lead: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        soldAt: 'desc'
      }
    });

    res.json(sales);
  } catch (error) {
    console.error('Error fetching all sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Lead satış detayını getir
router.get('/:saleId', async (req, res) => {
  try {
    const { saleId } = req.params;
    const userId = req.user.id;

    const sale = await prisma.leadSale.findFirst({
      where: {
        id: saleId,
        buyerId: userId
      },
      include: {
        lead: {
          include: {
            owner: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json(sale);
  } catch (error) {
    console.error('Error fetching sale details:', error);
    res.status(500).json({ error: 'Failed to fetch sale details' });
  }
});

// Admin: Bekleyen IBAN ödemelerini getir
router.get('/admin/pending', async (req, res) => {
  try {
    if (!['ADMIN', 'SUPERADMIN', 'FULL_ADMIN'].includes(req.user?.userTypeId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const pendingSales = await prisma.leadSale.findMany({
      where: {
        paymentMethod: 'iban',
        paymentStatus: 'PENDING'
      },
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            ibanAccountHolder: true,
            ibanNumber: true
          }
        },
        lead: {
          select: {
            id: true,
            title: true,
            ownerId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(pendingSales);
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ error: 'Failed to fetch pending payments' });
  }
});

// Admin: IBAN ödemesini onayla
router.post('/admin/:saleId/confirm-payment', async (req, res) => {
  try {
    if (!['ADMIN', 'SUPERADMIN', 'FULL_ADMIN'].includes(req.user?.userTypeId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { saleId } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user.id;

    // Sale'i bul
    const sale = await prisma.leadSale.findUnique({
      where: { id: saleId },
      include: {
        lead: {
          select: {
            title: true,
            ownerId: true
          }
        },
        buyer: {
          select: {
            email: true
          }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.paymentMethod !== 'iban') {
      return res.status(400).json({ error: 'Only IBAN payments can be confirmed' });
    }

    if (sale.paymentStatus === 'COMPLETED') {
      return res.status(400).json({ error: 'Payment already confirmed' });
    }

    // Payment status'ü COMPLETED olarak güncelle
    const updatedSale = await prisma.leadSale.update({
      where: { id: saleId },
      data: {
        paymentStatus: 'COMPLETED',
        confirmedAt: new Date(),
        confirmedBy: adminId,
        adminNotes: adminNotes || null
      }
    });

    // Bildirim 1: Alıcıya (PAYMENT_CONFIRMED)
    try {
      await createNotification(
        sale.buyerId,
        'PAYMENT_CONFIRMED',
        'Ödemeniz Onaylandı',
        `"${sale.lead.title} (${sale.leadId})" için yaptığınız ${sale.amount} TL IBAN ödemesi admin tarafından onaylandı.`,
        { leadId: sale.leadId, saleId: sale.id, amount: sale.amount }
      );
    } catch (e) {
      console.error('Notification error (PAYMENT_CONFIRMED):', e.message);
    }

    // Bildirim 2: Satıcıya (PAYMENT_CONFIRMED_SELLER)
    try {
      await createNotification(
        sale.lead.ownerId,
        'PAYMENT_CONFIRMED_SELLER',
        'Lead Satış Ödemeniz Alındı',
        `"${sale.lead.title}" satışınızın ${sale.amount} TL IBAN ödemesi onaylandı.`,
        { leadId: sale.leadId, saleId: sale.id, amount: sale.amount }
      );
    } catch (e) {
      console.error('Notification error (PAYMENT_CONFIRMED_SELLER):', e.message);
    }

    // Activity log
    try {
      const { ipAddress, userAgent } = extractRequestInfo(req);
      await logActivity({
        userId: adminId,
        action: 'CONFIRM_IBAN_PAYMENT',
        details: {
          saleId: sale.id,
          leadId: sale.leadId,
          leadTitle: sale.lead.title,
          amount: sale.amount,
          buyerId: sale.buyerId,
          buyerEmail: sale.buyer.email,
          adminNotes
        },
        entityType: 'leadSale',
        entityId: sale.id,
        ipAddress,
        userAgent
      });
    } catch (e) {
      console.error('Activity log error:', e.message);
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      sale: updatedSale
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Admin: IBAN ödemesini reddet (optional)
router.post('/admin/:saleId/reject-payment', async (req, res) => {
  try {
    if (!['ADMIN', 'SUPERADMIN', 'FULL_ADMIN'].includes(req.user?.userTypeId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { saleId } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user.id;

    // Sale'i bul
    const sale = await prisma.leadSale.findUnique({
      where: { id: saleId },
      include: {
        lead: {
          select: {
            title: true,
            ownerId: true
          }
        },
        buyer: {
          select: {
            email: true
          }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.paymentMethod !== 'iban') {
      return res.status(400).json({ error: 'Only IBAN payments can be rejected' });
    }

    // Payment status'ü FAILED olarak güncelle
    const updatedSale = await prisma.leadSale.update({
      where: { id: saleId },
      data: {
        paymentStatus: 'FAILED',
        confirmedAt: new Date(),
        confirmedBy: adminId,
        adminNotes: adminNotes || null
      }
    });

    // Lead'i tekrar aktif hale getir
    await prisma.lead.update({
      where: { id: sale.leadId },
      data: {
        isActive: true,
        isSold: false
      }
    });

    // Activity log
    try {
      const { ipAddress, userAgent } = extractRequestInfo(req);
      await logActivity({
        userId: adminId,
        action: 'REJECT_IBAN_PAYMENT',
        details: {
          saleId: sale.id,
          leadId: sale.leadId,
          leadTitle: sale.lead.title,
          amount: sale.amount,
          buyerId: sale.buyerId,
          buyerEmail: sale.buyer.email,
          adminNotes
        },
        entityType: 'leadSale',
        entityId: sale.id,
        ipAddress,
        userAgent
      });
    } catch (e) {
      console.error('Activity log error:', e.message);
    }

    res.json({
      success: true,
      message: 'Payment rejected successfully',
      sale: updatedSale
    });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

  return router;
}
