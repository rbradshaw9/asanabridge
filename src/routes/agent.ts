import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../services/auth';
import { logger } from '../config/logger';
import { prisma } from '../config/database';
import crypto from 'crypto';

const router = Router();

// Agent authentication middleware
async function authenticateAgent(req: Request, res: Response, next: any) {
  const authHeader = req.headers['authorization'];
  const agentKey = authHeader && authHeader.split(' ')[1]; // Bearer AGENT_KEY

  if (!agentKey) {
    return res.status(401).json({ error: 'Agent key required' });
  }

  try {
    // Find OmniFocus setup with this agent key
    const setup = await prisma.omniFocusSetup.findUnique({
      where: { agentKey },
      include: { user: true }
    });

    if (!setup || !setup.isActive) {
      return res.status(403).json({ error: 'Invalid or inactive agent key' });
    }

    // Add user context to request
    (req as any).agentUser = setup.user;
    (req as any).agentSetup = setup;
    next();
  } catch (error) {
    logger.error('Agent authentication error', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Register agent with web service
router.post('/register', authenticateAgent, async (req: Request, res: Response) => {
  try {
    const { version, capabilities, platform, nodeVersion } = req.body;
    const setup = (req as any).agentSetup;

    // Update agent info
    await prisma.omniFocusSetup.update({
      where: { id: setup.id },
      data: {
        version,
        isActive: true,
        updatedAt: new Date()
      }
    });

    logger.info('Agent registered', {
      userId: setup.userId,
      version,
      capabilities,
      platform,
      nodeVersion
    });

    res.json({ 
      message: 'Agent registered successfully',
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Agent registration failed', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get sync mappings for this user
router.get('/mappings', authenticateAgent, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).agentUser.id;

    const mappings = await prisma.syncMapping.findMany({
      where: {
        userId,
        isActive: true
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ mappings });
  } catch (error) {
    logger.error('Failed to fetch sync mappings', error);
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
});

// Report sync status
router.post('/sync-status', authenticateAgent, async (req: Request, res: Response) => {
  try {
    const { mappingId, status, details } = req.body;
    const userId = (req as any).agentUser.id;

    // Verify mapping belongs to this user
    const mapping = await prisma.syncMapping.findFirst({
      where: { id: mappingId, userId }
    });

    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    // Create sync log entry
    await prisma.syncLog.create({
      data: {
        userId,
        syncMappingId: mappingId,
        direction: 'BIDIRECTIONAL',
        status: status === 'success' ? 'SUCCESS' : 'ERROR',
        itemssynced: details?.tasksFound || 0,
        errorMessage: details?.error || null
      }
    });

    // Update last sync time if successful
    if (status === 'success') {
      await prisma.syncMapping.update({
        where: { id: mappingId },
        data: { lastSyncAt: new Date() }
      });
    }

    res.json({ message: 'Status reported' });
  } catch (error) {
    logger.error('Failed to report sync status', error);
    res.status(500).json({ error: 'Failed to report status' });
  }
});

// Get pending sync commands
router.get('/commands', authenticateAgent, async (req: Request, res: Response) => {
  try {
    // For now, return empty array - will implement command queue later
    res.json({ commands: [] });
  } catch (error) {
    logger.error('Failed to fetch commands', error);
    res.status(500).json({ error: 'Failed to fetch commands' });
  }
});

// Acknowledge command completion
router.post('/commands/ack', authenticateAgent, async (req: Request, res: Response) => {
  try {
    const { commandId, success, error: errorMsg } = req.body;
    
    // Log command acknowledgment
    logger.info('Command acknowledged', {
      commandId,
      success,
      error: errorMsg,
      userId: (req as any).agentUser.id
    });

    res.json({ message: 'Command acknowledged' });
  } catch (error) {
    logger.error('Failed to acknowledge command', error);
    res.status(500).json({ error: 'Failed to acknowledge command' });
  }
});

// Receive OmniFocus task data
router.post('/task-data', authenticateAgent, async (req: Request, res: Response) => {
  try {
    const { mappingId, tasks } = req.body;
    const userId = (req as any).agentUser.id;

    // Verify mapping belongs to this user
    const mapping = await prisma.syncMapping.findFirst({
      where: { id: mappingId, userId }
    });

    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    // Store task data for sync processing (implement sync logic here)
    logger.info('Received OmniFocus task data', {
      mappingId,
      taskCount: tasks.length,
      userId
    });

    // TODO: Implement sync logic to compare with Asana and resolve conflicts

    res.json({ 
      message: 'Task data received',
      processed: tasks.length
    });
  } catch (error) {
    logger.error('Failed to process task data', error);
    res.status(500).json({ error: 'Failed to process task data' });
  }
});

// Agent health check
router.get('/health', authenticateAgent, (_req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Generate new agent key for user (authenticated web request)
router.post('/generate-key', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const agentKey = crypto.randomBytes(32).toString('hex');

    // Create or update OmniFocus setup
    const setup = await prisma.omniFocusSetup.upsert({
      where: { userId },
      update: {
        agentKey,
        isActive: false, // Will be activated when agent registers
        updatedAt: new Date()
      },
      create: {
        userId,
        agentKey,
        isActive: false
      }
    });

    logger.info('Agent key generated', { userId });

    res.json({ 
      agentKey,
      message: 'Download and configure the OmniFocus agent with this key'
    });
  } catch (error) {
    logger.error('Failed to generate agent key', error);
    res.status(500).json({ error: 'Failed to generate key' });
  }
});

// Get agent status for user
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const setup = await prisma.omniFocusSetup.findUnique({
      where: { userId }
    });

    if (!setup) {
      return res.json({ 
        connected: false,
        message: 'No agent configured' 
      });
    }

    res.json({
      connected: setup.isActive,
      version: setup.version,
      lastSeen: setup.updatedAt,
      hasKey: !!setup.agentKey
    });
  } catch (error) {
    logger.error('Failed to get agent status', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;