import express from 'express';
import { PrismaClient } from '../prismaClient.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

// Varsayılan renk paleti
const defaultColors = {
  bg: '#f8fafc',
  panel: '#ffffff',
  muted: '#64748b',
  text: '#1e293b',
  primary: '#1e293b',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  border: '#e2e8f0'
};

// Tasarım ayarlarını getir
router.get('/', async (req, res) => {
  try {
    let designSettings = await prisma.designSettings.findUnique({
      where: { id: 'default' }
    });

    if (!designSettings) {
      // Varsayılan ayarları oluştur
      designSettings = await prisma.designSettings.create({
        data: {
          id: 'default',
          colors: defaultColors
        }
      });
    }

    res.json(designSettings);
  } catch (error) {
    console.error('Fehler beim Abrufen der Designeinstellungen:', error);
    res.status(500).json({ 
      message: 'Designeinstellungen konnten nicht abgerufen werden',
      error: error.message 
    });
  }
});

// Tasarım ayarlarını güncelle (Admin yetkisi gerekli)
router.post('/', requireAuth, async (req, res) => {
  try {
    // Admin kontrolü
    const userTypeId = req.user.userTypeId;
    if (userTypeId !== 'SUPERADMIN' && userTypeId !== 'ADMIN') {
      return res.status(403).json({ message: 'Bu işlem için admin yetkisi gerekli' });
    }

    const { colors } = req.body;

    if (!colors || typeof colors !== 'object') {
      return res.status(400).json({ message: 'Geçerli renk paleti gerekli' });
    }

    // Renk formatını doğrula
    const requiredColors = ['bg', 'panel', 'muted', 'text', 'primary', 'success', 'warning', 'danger', 'border'];
    const missingColors = requiredColors.filter(color => !colors[color]);
    
    if (missingColors.length > 0) {
      return res.status(400).json({ 
        message: `Eksik renkler: ${missingColors.join(', ')}` 
      });
    }

    // Renk değerlerinin hex formatında olduğunu kontrol et
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const invalidColors = Object.entries(colors).filter(([key, value]) => 
      !hexColorRegex.test(value)
    );

    if (invalidColors.length > 0) {
      return res.status(400).json({ 
        message: `Geçersiz renk formatı: ${invalidColors.map(([key]) => key).join(', ')}` 
      });
    }

    // Tasarım ayarlarını güncelle veya oluştur
    const designSettings = await prisma.designSettings.upsert({
      where: { id: 'default' },
      update: {
        colors: colors,
        updatedAt: new Date()
      },
      create: {
        id: 'default',
        colors: colors
      }
    });

    res.json({
      message: 'Designeinstellungen erfolgreich gespeichert',
      data: designSettings
    });

  } catch (error) {
    console.error('Fehler beim Speichern der Designeinstellungen:', error);
    res.status(500).json({ 
      message: 'Designeinstellungen konnten nicht gespeichert werden',
      error: error.message 
    });
  }
});

// Varsayılan ayarlara sıfırla (Admin yetkisi gerekli)
router.post('/reset', requireAuth, async (req, res) => {
  try {
    // Admin kontrolü
    const userTypeId = req.user.userTypeId;
    if (userTypeId !== 'SUPERADMIN' && userTypeId !== 'ADMIN') {
      return res.status(403).json({ message: 'Bu işlem için admin yetkisi gerekli' });
    }

    const designSettings = await prisma.designSettings.upsert({
      where: { id: 'default' },
      update: {
        colors: defaultColors,
        updatedAt: new Date()
      },
      create: {
        id: 'default',
        colors: defaultColors
      }
    });

    res.json({
      message: 'Designeinstellungen auf Standardwerte zurückgesetzt',
      data: designSettings
    });

  } catch (error) {
    console.error('Fehler beim Zurücksetzen der Designeinstellungen:', error);
    res.status(500).json({ 
      message: 'Designeinstellungen konnten nicht zurückgesetzt werden',
      error: error.message 
    });
  }
});

// Auth middleware
function requireAuth(req, res, next) {
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

export default function(prismaInstance) {
  // Eğer prisma instance geçilirse onu kullan
  if (prismaInstance) {
    // Router'ı yeniden oluştur
    const newRouter = express.Router();
    
    // Tasarım ayarlarını getir
    newRouter.get('/', async (req, res) => {
      try {
        let designSettings = await prismaInstance.designSettings.findUnique({
          where: { id: 'default' }
        });

        if (!designSettings) {
          // Varsayılan ayarları oluştur
          designSettings = await prismaInstance.designSettings.create({
            data: {
              id: 'default',
              colors: defaultColors
            }
          });
        }

        res.json(designSettings);
      } catch (error) {
        console.error('Fehler beim Abrufen der Designeinstellungen:', error);
        res.status(500).json({ 
          message: 'Designeinstellungen konnten nicht abgerufen werden',
          error: error.message 
        });
      }
    });

    // Tasarım ayarlarını güncelle (Admin yetkisi gerekli)
    newRouter.post('/', requireAuth, async (req, res) => {
      try {
        // Admin kontrolü
        const userTypeId = req.user.userTypeId;
        if (userTypeId !== 'SUPERADMIN' && userTypeId !== 'ADMIN') {
          return res.status(403).json({ message: 'Bu işlem için admin yetkisi gerekli' });
        }

        const { colors } = req.body;

        if (!colors || typeof colors !== 'object') {
          return res.status(400).json({ message: 'Geçerli renk paleti gerekli' });
        }

        // Renk formatını doğrula
        const requiredColors = ['bg', 'panel', 'muted', 'text', 'primary', 'success', 'warning', 'danger', 'border'];
        const missingColors = requiredColors.filter(color => !colors[color]);
        
        if (missingColors.length > 0) {
          return res.status(400).json({ 
            message: `Eksik renkler: ${missingColors.join(', ')}` 
          });
        }

        // Renk değerlerinin hex formatında olduğunu kontrol et
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        const invalidColors = Object.entries(colors).filter(([key, value]) => 
          !hexColorRegex.test(value)
        );

        if (invalidColors.length > 0) {
          return res.status(400).json({ 
            message: `Geçersiz renk formatı: ${invalidColors.map(([key]) => key).join(', ')}` 
          });
        }

        // Tasarım ayarlarını güncelle veya oluştur
        const designSettings = await prismaInstance.designSettings.upsert({
          where: { id: 'default' },
          update: {
            colors: colors,
            updatedAt: new Date()
          },
          create: {
            id: 'default',
            colors: colors
          }
        });

        res.json({
          message: 'Designeinstellungen erfolgreich gespeichert',
          data: designSettings
        });

      } catch (error) {
        console.error('Tasarım ayarları kaydetme hatası:', error);
        res.status(500).json({ 
          message: 'Tasarım ayarları kaydedilemedi',
          error: error.message 
        });
      }
    });

    // Varsayılan ayarlara sıfırla (Admin yetkisi gerekli)
    newRouter.post('/reset', requireAuth, async (req, res) => {
      try {
        // Admin kontrolü
        const userTypeId = req.user.userTypeId;
        if (userTypeId !== 'SUPERADMIN' && userTypeId !== 'ADMIN') {
          return res.status(403).json({ message: 'Bu işlem için admin yetkisi gerekli' });
        }

        const designSettings = await prismaInstance.designSettings.upsert({
          where: { id: 'default' },
          update: {
            colors: defaultColors,
            updatedAt: new Date()
          },
          create: {
            id: 'default',
            colors: defaultColors
          }
        });

        res.json({
          message: 'Designeinstellungen auf Standardwerte zurückgesetzt',
          data: designSettings
        });

      } catch (error) {
        console.error('Tasarım ayarları sıfırlama hatası:', error);
        res.status(500).json({ 
          message: 'Tasarım ayarları sıfırlanamadı',
          error: error.message 
        });
      }
    });

    return newRouter;
  }
  
  return router;
}
