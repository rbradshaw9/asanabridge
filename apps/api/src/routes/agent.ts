import { Router, Response } from 'express';
import { z } from 'zod';
import {
  agentRegisterSchema,
  agentSyncSchema,
  agentSyncStatusSchema,
  PLAN_SYNC_INTERVALS,
  PLAN_FEATURES,
  AGENT_ONLINE_THRESHOLD_MS,
} from '@asanabridge/shared';
import {
  authenticateToken,
  authenticateAgent,
  AuthenticatedRequest,
  generateAgentKey,
} from '../services/auth';
import { SyncEngine } from '../services/sync-engine';
import { prisma } from '../config/database';
import { agentLogger } from '../config/logger';
import { UserPlan } from '@asanabridge/shared';

const router = Router();

// ─── Register Agent ───────────────────────────────────────────────────────────

router.post('/register', authenticateAgent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { version, platform, capabilities } = agentRegisterSchema.parse(req.body);

    await prisma.omniFocusSetup.upsert({
      where: { userId: req.user!.userId },
      update: { isActive: true, version },
      create: {
        userId: req.user!.userId,
        agentKey: generateAgentKey(),
        isActive: true,
        version,
      },
    });

    agentLogger.info('Agent registered', { userId: req.user!.userId, version, platform });
    res.json({ message: 'Agent registered', version });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Get Config ───────────────────────────────────────────────────────────────

router.get('/config', authenticateAgent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { plan: true },
    });

    const plan = (user?.plan ?? 'FREE') as UserPlan;

    res.json({
      syncIntervalMinutes: PLAN_SYNC_INTERVALS[plan],
      features: PLAN_FEATURES[plan],
      plan,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// ─── Get Mappings ─────────────────────────────────────────────────────────────

router.get('/mappings', authenticateAgent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const mappings = await prisma.syncMapping.findMany({
      where: { userId: req.user!.userId, isActive: true },
      select: {
        id: true,
        asanaProjectId: true,
        asanaProjectName: true,
        ofProjectName: true,
        lastSyncAt: true,
      },
    });
    res.json({ mappings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
});

// ─── Submit Sync + Run ────────────────────────────────────────────────────────

router.post('/sync', authenticateAgent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mappingId, tasks } = agentSyncSchema.parse(req.body);
    const userId = req.user!.userId;

    const mapping = await prisma.syncMapping.findFirst({
      where: { id: mappingId, userId, isActive: true },
    });
    if (!mapping) return res.status(404).json({ error: 'Mapping not found' });

    const log = await prisma.syncLog.create({
      data: { userId, syncMappingId: mappingId, direction: 'BIDIRECTIONAL', status: 'RUNNING', itemsSynced: 0 },
    });

    try {
      const result = await SyncEngine.performSync(
        {
          userId,
          mappingId,
          asanaProjectId: mapping.asanaProjectId,
          omnifocusProjectName: mapping.ofProjectName,
          lastSyncAt: mapping.lastSyncAt ?? undefined,
        },
        tasks
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

      agentLogger.info('Agent sync complete', { userId, mappingId, itemsSynced });
      res.json({ success: !hasErrors, itemsSynced, errors: result.errors });
    } catch (syncErr) {
      await prisma.syncLog.update({
        where: { id: log.id },
        data: { status: 'ERROR', errorMessage: (syncErr as Error).message },
      });
      throw syncErr;
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    agentLogger.error('Agent sync error', { error: (err as Error).message });
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ─── Report Sync Status ────────────────────────────────────────────────────────

router.post('/sync-status', authenticateAgent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mappingId, status, itemsSynced, direction, errorMessage } =
      agentSyncStatusSchema.parse(req.body);

    const mapping = await prisma.syncMapping.findFirst({
      where: { id: mappingId, userId: req.user!.userId },
    });
    if (!mapping) return res.status(404).json({ error: 'Mapping not found' });

    await prisma.syncLog.create({
      data: {
        userId: req.user!.userId,
        syncMappingId: mappingId,
        direction,
        status,
        itemsSynced: itemsSynced,
        errorMessage: errorMessage ?? null,
      },
    });

    if (status === 'SUCCESS') {
      await prisma.syncMapping.update({
        where: { id: mappingId },
        data: { lastSyncAt: new Date() },
      });
    }

    res.json({ message: 'Status recorded' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to record status' });
  }
});

// ─── Heartbeat ────────────────────────────────────────────────────────────────

router.post('/heartbeat', authenticateAgent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.omniFocusSetup.update({
      where: { userId: req.user!.userId },
      data: { isActive: true, updatedAt: new Date() },
    });
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

// ─── Pending Commands ─────────────────────────────────────────────────────────

router.get('/commands', authenticateAgent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const setup = await prisma.omniFocusSetup.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!setup) return res.json({ commands: [] });

    const commands = await prisma.agentCommand.findMany({
      where: { setupId: setup.id, acknowledged: false },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    res.json({ commands });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch commands' });
  }
});

// ─── Acknowledge Commands ─────────────────────────────────────────────────────

router.post('/commands/ack', authenticateAgent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { commandIds } = z.object({ commandIds: z.array(z.string()).min(1) }).parse(req.body);

    const setup = await prisma.omniFocusSetup.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!setup) return res.status(404).json({ error: 'Agent not registered' });

    await prisma.agentCommand.updateMany({
      where: { id: { in: commandIds }, setupId: setup.id },
      data: { acknowledged: true, acknowledgedAt: new Date() },
    });

    res.json({ acknowledged: commandIds.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to acknowledge commands' });
  }
});

// ─── Account Info (for agent status display) ──────────────────────────────────

router.get('/account-info', authenticateAgent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, plan: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [mappingCount, lastSync] = await Promise.all([
      prisma.syncMapping.count({ where: { userId: user.id, isActive: true } }),
      prisma.syncLog.findFirst({
        where: { userId: user.id, status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({ user, activeMappings: mappingCount, lastSyncAt: lastSync?.createdAt ?? null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch account info' });
  }
});

// ─── Generate Agent Key (JWT-auth only — web dashboard) ───────────────────────

router.post('/generate-key', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentKey = generateAgentKey();

    const setup = await prisma.omniFocusSetup.upsert({
      where: { userId: req.user!.userId },
      update: { agentKey },
      create: {
        userId: req.user!.userId,
        agentKey,
        isActive: false,
      },
    });

    agentLogger.info('Agent key generated', { userId: req.user!.userId });
    res.json({ agentKey, setupId: setup.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate key' });
  }
});

// ─── Agent Online Status (web dashboard) ─────────────────────────────────────

router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const setup = await prisma.omniFocusSetup.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!setup) {
      return res.json({ registered: false, isOnline: false, lastHeartbeat: null });
    }

    const isOnline =
      setup.isActive &&
      setup.updatedAt.getTime() > Date.now() - AGENT_ONLINE_THRESHOLD_MS;

    res.json({
      registered: true,
      isOnline,
      lastHeartbeat: setup.updatedAt.toISOString(),
      version: setup.version,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get agent status' });
  }
});

// ─── Disconnect Agent ─────────────────────────────────────────────────────────

router.post('/disconnect', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.omniFocusSetup.updateMany({
      where: { userId: req.user!.userId },
      data: { isActive: false },
    });
    res.json({ message: 'Agent disconnected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect agent' });
  }
});

// ─── Recent Syncs (web dashboard) ────────────────────────────────────────────

router.get('/recent-syncs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.syncLog.findMany({
      where: { userId: req.user!.userId },
      include: {
        syncMapping: { select: { asanaProjectName: true, ofProjectName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent syncs' });
  }
});

export default router;
