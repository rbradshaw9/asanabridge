import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../services/auth';
import { SyncEngine, SyncContext } from '../services/sync-engine';
import { logger } from '../config/logger';
import { prisma } from '../config/database';

const router = Router();

// Create a new sync mapping between Asana project and OmniFocus project
router.post('/mappings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { asanaProjectId, asanaProjectName, omnifocusProjectName } = req.body;

    if (!asanaProjectId || !asanaProjectName || !omnifocusProjectName) {
      return res.status(400).json({ 
        error: 'Missing required fields: asanaProjectId, asanaProjectName, omnifocusProjectName' 
      });
    }

    // Check if mapping already exists
    const existing = await prisma.syncMapping.findUnique({
      where: { 
        userId_asanaProjectId: { userId, asanaProjectId }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Mapping already exists for this Asana project' });
    }

    // Create new mapping
    const mapping = await prisma.syncMapping.create({
      data: {
        userId,
        asanaProjectId,
        asanaProjectName,
        ofProjectName: omnifocusProjectName,
        isActive: true
      }
    });

    logger.info('Sync mapping created', { userId, mappingId: mapping.id });

    res.status(201).json({ 
      mapping,
      message: 'Sync mapping created successfully' 
    });
  } catch (error: any) {
    logger.error('Failed to create sync mapping', error);
    res.status(500).json({ error: 'Failed to create mapping' });
  }
});

// Get all sync mappings for user
router.get('/mappings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const mappings = await prisma.syncMapping.findMany({
      where: { userId },
      include: {
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Last 5 sync logs per mapping
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ mappings });
  } catch (error: any) {
    logger.error('Failed to fetch sync mappings', error);
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
});

// Update sync mapping
router.put('/mappings/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const mappingId = req.params.id;
    const { omnifocusProjectName, isActive } = req.body;

    const mapping = await prisma.syncMapping.findFirst({
      where: { id: mappingId, userId }
    });

    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    const updated = await prisma.syncMapping.update({
      where: { id: mappingId },
      data: {
        ...(omnifocusProjectName && { ofProjectName: omnifocusProjectName }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      }
    });

    res.json({ mapping: updated });
  } catch (error: any) {
    logger.error('Failed to update sync mapping', error);
    res.status(500).json({ error: 'Failed to update mapping' });
  }
});

// Delete sync mapping
router.delete('/mappings/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const mappingId = req.params.id;

    const mapping = await prisma.syncMapping.findFirst({
      where: { id: mappingId, userId }
    });

    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    await prisma.syncMapping.delete({
      where: { id: mappingId }
    });

    logger.info('Sync mapping deleted', { userId, mappingId });

    res.json({ message: 'Mapping deleted successfully' });
  } catch (error: any) {
    logger.error('Failed to delete sync mapping', error);
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
});

// Manually trigger sync for a specific mapping
router.post('/mappings/:id/sync', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const mappingId = req.params.id;

    const mapping = await prisma.syncMapping.findFirst({
      where: { id: mappingId, userId, isActive: true }
    });

    if (!mapping) {
      return res.status(404).json({ error: 'Active mapping not found' });
    }

    // Create sync context
    const context: SyncContext = {
      userId,
      mappingId: mapping.id,
      asanaProjectId: mapping.asanaProjectId,
      omnifocusProjectName: mapping.ofProjectName,
      lastSyncAt: mapping.lastSyncAt || undefined
    };

    // Execute sync
    const syncEngine = new SyncEngine(userId);
    const result = await syncEngine.performSync(context);

    res.json({ 
      message: 'Sync completed',
      result 
    });
  } catch (error: any) {
    logger.error('Manual sync failed', error);
    res.status(500).json({ error: 'Sync failed: ' + error.message });
  }
});

// Get sync history for a mapping
router.get('/mappings/:id/history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const mappingId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const mapping = await prisma.syncMapping.findFirst({
      where: { id: mappingId, userId }
    });

    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    const logs = await prisma.syncLog.findMany({
      where: { syncMappingId: mappingId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    res.json({ logs });
  } catch (error: any) {
    logger.error('Failed to fetch sync history', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get overall sync statistics for user
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const [mappingCount, totalSyncs, recentErrors] = await Promise.all([
      prisma.syncMapping.count({ where: { userId, isActive: true } }),
      prisma.syncLog.count({ where: { userId } }),
      prisma.syncLog.count({ 
        where: { 
          userId, 
          status: 'ERROR',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        } 
      })
    ]);

    const lastSync = await prisma.syncLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      activeMappings: mappingCount,
      totalSyncs,
      recentErrors,
      lastSyncAt: lastSync?.createdAt,
      lastSyncStatus: lastSync?.status
    });
  } catch (error: any) {
    logger.error('Failed to fetch sync stats', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;