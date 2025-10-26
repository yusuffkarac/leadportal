import express from 'express';

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
            lastName: true
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

  return router;
}
