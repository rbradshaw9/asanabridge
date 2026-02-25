import { Router, Response } from 'express';
import { z } from 'zod';
import {
  createSyncMappingSchema,
  updateSyncMappingSchema,
  PLAN_PROJECT_LIMITS,
  PLAN_SYNC_INTERVALS,
  PLAN_FEATURES,
} from '@asanabridge/shared';
import { authenticateToken, AuthenticatedRequest } from '../services/auth';
import { SyncEngine } from '../services/sync-engine';
import { prisma } from '../config/database';
import { syncLogger } from '../config/logger';
import { UserPlan } from '@asanabridge/shared';

const router = Router();

// ─── Create Mapping ───────────────────────────────────────────────────────────

router.post('/mappings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { asanaProjectId, asanaProjectName, omnifocusProjectName } =
      createSyncMappingSchema.parse(req.body);

    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const plan = user.plan as UserPlan;
    const limit = PLAN_PROJECT_LIMITS[plan];
    const currentCount = await prisma.syncMapping.count({
      where: { userId, isActive: true },
    });

    if (currentCount >= limit) {
      return res.status(403).json({
        error: 'Project limit reached',
        message: `Your ${plan} plan allows ${limit === Infinity ? 'unlimited' : limit} projects. Upgrade to Pro for more.`,
        currentCount,
        maxAllowed: limit === Infinity ? -1 : limit,
        plan,
      });
    }

    const existing = await prisma.syncMapping.findUnique({
      where: { userId_asanaProjectId: { userId, asanaProjectId } },
    });
    if (existing) {
      return res.status(409).json({ error: 'A mapping for this Asana project already exists' });
    }

    const mapping = await prisma.syncMapping.create({
      data: { userId, asanaProjectId, asanaProjectName, ofProjectName: omnifocusProjectName },
    });

    syncLogger.info('Sync mapping created', { userId, mappingId: mapping.id });
    res.status(201).json({ mapping });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    syncLogger.error('Create mapping error', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to create mapping' });
  }
});

// ─── List Mappings ────────────────────────────────────────────────────────────

router.get('/mappings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const mappings = await prisma.syncMapping.findMany({
      where: { userId: req.user!.userId },
      include: {
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ mappings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
});

// ─── Update Mapping ───────────────────────────────────────────────────────────

router.put('/mappings/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = updateSyncMappingSchema.parse(req.body);
    const { id } = req.params;

    const existing = await prisma.syncMapping.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Mapping not found' });

    const mapping = await prisma.syncMapping.update({
      where: { id },
      data: {
        ...(data.ofProjectName && { ofProjectName: data.ofProjectName }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    res.json({ mapping });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to update mapping' });
  }
});

// ─── Delete Mapping ───────────────────────────────────────────────────────────

router.delete('/mappings/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.syncMapping.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Mapping not found' });

    await prisma.syncMapping.delete({ where: { id } });
    syncLogger.info('Sync mapping deleted', { userId: req.user!.userId, mappingId: id });
    res.json({ message: 'Mapping deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
});

// ─── Trigger Sync ─────────────────────────────────────────────────────────────

router.post('/mappings/:id/sync', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const mapping = await prisma.syncMapping.findFirst({
      where: { id, userId, isActive: true },
    });
    if (!mapping) return res.status(404).json({ error: 'Mapping not found' });

    const ofTasks = Array.isArray(req.body.tasks) ? req.body.tasks : [];

    // Create a running log
    const log = await prisma.syncLog.create({
      data: {
        userId,
        syncMappingId: id,
        direction: 'BIDIRECTIONAL',
        status: 'RUNNING',
        itemsSynced: 0,
      },
    });

    try {
      const result = await SyncEngine.performSync(
        {
          userId,
          mappingId: id,
          asanaProjectId: mapping.asanaProjectId,
          omnifocusProjectName: mapping.ofProjectName,
          lastSyncAt: mapping.lastSyncAt ?? undefined,
        },
        ofTasks
      );

      const itemsSynced = result.created.length + result.updated.length;
      const hasErrors = result.errors.length > 0;

      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: hasErrors ? 'ERROR' : 'SUCCESS',
          itemsSynced,
          errorMessage: hasErrors ? result.errors.join('; ') : null,
        },
      });

      res.json({ success: true, result });
    } catch (syncErr) {
      await prisma.syncLog.update({
        where: { id: log.id },
        data: { status: 'ERROR', errorMessage: (syncErr as Error).message },
      });
      throw syncErr;
    }
  } catch (err) {
    syncLogger.error('Trigger sync error', { error: (err as Error).message });
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ─── Sync History ─────────────────────────────────────────────────────────────

router.get('/mappings/:id/history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const mapping = await prisma.syncMapping.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!mapping) return res.status(404).json({ error: 'Mapping not found' });

    const logs = await prisma.syncLog.findMany({
      where: { syncMappingId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ─── Sync Stats ───────────────────────────────────────────────────────────────

router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [activeMappings, totalSyncs, recentErrors, lastLog] = await Promise.all([
      prisma.syncMapping.count({ where: { userId, isActive: true } }),
      prisma.syncLog.count({ where: { userId } }),
      prisma.syncLog.count({ where: { userId, status: 'ERROR', createdAt: { gte: yesterday } } }),
      prisma.syncLog.findFirst({ where: { userId, status: 'SUCCESS' }, orderBy: { createdAt: 'desc' } }),
    ]);

    res.json({ activeMappings, totalSyncs, recentErrors, lastSyncAt: lastLog?.createdAt ?? null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── Plan Info ────────────────────────────────────────────────────────────────

router.get('/plan', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const plan = user.plan as UserPlan;
    const maxProjects = PLAN_PROJECT_LIMITS[plan];
    const activeProjects = await prisma.syncMapping.count({ where: { userId, isActive: true } });

    res.json({
      plan,
      limits: {
        maxProjects: maxProjects === Infinity ? -1 : maxProjects,
        syncIntervalMinutes: PLAN_SYNC_INTERVALS[plan],
      },
      usage: {
        activeProjects,
        canAddMore: activeProjects < maxProjects,
      },
      features: PLAN_FEATURES[plan],
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plan info' });
  }
});

export default router;
