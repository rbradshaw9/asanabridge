

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../services/auth';
import { agentLogger as logger } from '../config/logger';
import { prisma } from '../config/database';
import crypto from 'crypto';

const router = Router();

// Agent authentication middleware - supports both agent keys and JWT tokens
async function authenticateAgent(req: Request, res: Response, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    // First try JWT token authentication (for macOS app)
    if (token.includes('.')) {
      try {
        const { verifyToken } = await import('../services/auth');
        const payload = verifyToken(token);
        
        if (payload && payload.userId) {
          // Get user and their OmniFocus setup
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { omnifocusSetup: true }
          });

          if (!user) {
            return res.status(403).json({ error: 'User not found' });
          }

          // Create OmniFocus setup if it doesn't exist
          let setup = user.omnifocusSetup;
          if (!setup) {
            setup = await prisma.omniFocusSetup.create({
              data: {
                userId: user.id,
                agentKey: crypto.randomBytes(32).toString('hex'),
                isActive: false
              }
            });
          }

          // Add user context to request
          (req as any).agentUser = user;
          (req as any).agentSetup = setup;
          return next();
        }
      } catch (jwtError) {
        // JWT verification failed, continue to agent key auth
      }
    }

    // Fallback to agent key authentication
    const setup = await prisma.omniFocusSetup.findUnique({
      where: { agentKey: token },
      include: { user: true }
    });

    if (!setup || !setup.isActive) {
      return res.status(403).json({ error: 'Invalid or inactive authentication token' });
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

// Get agent configuration based on user's plan
router.get('/config', authenticateAgent, async (req: Request, res: Response) => {
  try {
    const setup = (req as any).agentSetup;
    
    // Get user with plan information
    const user = await prisma.user.findUnique({
      where: { id: setup.userId },
      select: { plan: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Define plan-based configuration
    const planConfig = {
      FREE: {
        minSyncIntervalMinutes: 60, // Hourly for free users
        maxSyncIntervalMinutes: 1440, // Daily max
        recommendedSyncIntervalMinutes: 60,
        features: {
          realTimeSync: false,
          advancedFiltering: false,
          prioritySupport: false
        }
      },
      PRO: {
        minSyncIntervalMinutes: 5, // Real-time for pro users
        maxSyncIntervalMinutes: 1440,
        recommendedSyncIntervalMinutes: 15,
        features: {
          realTimeSync: true,
          advancedFiltering: true,
          prioritySupport: false
        }
      },
      ENTERPRISE: {
        minSyncIntervalMinutes: 1, // Most frequent for enterprise
        maxSyncIntervalMinutes: 1440,
        recommendedSyncIntervalMinutes: 5,
        features: {
          realTimeSync: true,
          advancedFiltering: true,
          prioritySupport: true
        }
      }
    };

    const config = planConfig[user.plan as keyof typeof planConfig] || planConfig.FREE;

    res.json({
      plan: user.plan,
      ...config,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get agent config', error);
    res.status(500).json({ error: 'Failed to get configuration' });
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
        itemsSynced: details?.tasksFound || 0,
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

// Agent heartbeat endpoint
router.post('/heartbeat', authenticateAgent, async (req: Request, res: Response) => {
  try {
    const { status, omnifocus_connected, last_sync } = req.body;
    const setup = (req as any).agentSetup;

    // Update agent status in database
    await prisma.omniFocusSetup.update({
      where: { id: setup.id },
      data: {
        isActive: status === 'active',
        updatedAt: new Date()
      }
    });

    logger.info('Agent heartbeat received', {
      userId: setup.userId,
      status,
      omnifocus_connected,
      last_sync
    });

    res.json({ 
      message: 'Heartbeat received',
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to process heartbeat', error);
    res.status(500).json({ error: 'Failed to process heartbeat' });
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

// Get detailed account information for status display
router.get('/account-info', authenticateAgent, async (req: Request, res: Response) => {
  try {
    const setup = (req as any).agentSetup;
    
    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: setup.userId },
      select: { 
        name: true, 
        email: true, 
        plan: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get sync mappings count
    const mappingsCount = await prisma.syncMapping.count({
      where: {
        userId: setup.userId,
        isActive: true
      }
    });

    // Get last sync information
    const lastSync = await prisma.syncLog.findFirst({
      where: { userId: setup.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        status: true,
        itemsSynced: true
      }
    });

    res.json({
      user: {
        name: user.name,
        email: user.email,
        plan: user.plan,
        memberSince: user.createdAt.toISOString()
      },
      sync: {
        activeMappings: mappingsCount,
        lastSync: lastSync ? {
          time: lastSync.createdAt.toISOString(),
          status: lastSync.status,
          itemsSynced: lastSync.itemsSynced
        } : null
      },
      agent: {
        registered: setup.isActive,
        lastSeen: setup.updatedAt.toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get account info', error);
    res.status(500).json({ error: 'Failed to get account information' });
  }
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

// Test endpoint: Submit a test task from OmniFocus
router.post('/test-task', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { taskName, taskNotes, projectName } = req.body;

    logger.info('Test task received from agent', {
      userId,
      taskName,
      taskNotes,
      projectName,
      timestamp: new Date().toISOString()
    });

    // Just log it, don't actually sync to Asana
    res.json({ 
      success: true,
      message: 'Test task received successfully',
      taskData: { taskName, taskNotes, projectName },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Test task submission failed:', error);
    res.status(500).json({ error: 'Failed to process test task' });
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
        isOnline: false,
        connected: false,
        message: 'No agent configured',
        hasKey: false
      });
    }

    // Consider agent online if:
    // 1. isActive is true
    // 2. Last heartbeat was within 2 minutes (agents send heartbeat every minute)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const isOnline = setup.isActive && setup.updatedAt > twoMinutesAgo;

    // Calculate time since last heartbeat for diagnostics
    const timeSinceHeartbeat = Date.now() - setup.updatedAt.getTime();
    const minutesSinceHeartbeat = Math.floor(timeSinceHeartbeat / 1000 / 60);

    res.json({
      isOnline,
      connected: isOnline, // For backwards compatibility
      version: setup.version,
      lastSeen: setup.updatedAt,
      lastHeartbeat: setup.updatedAt,
      hasKey: !!setup.agentKey,
      diagnostic: {
        isActive: setup.isActive,
        minutesSinceLastHeartbeat: minutesSinceHeartbeat,
        heartbeatWithinThreshold: setup.updatedAt > twoMinutesAgo,
        thresholdMinutes: 2
      }
    });
  } catch (error) {
    logger.error('Failed to get agent status', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});
// Get recent sync logs for dashboard verification
router.get('/recent-syncs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const logs = await prisma.syncLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        syncMapping: {
          select: {
            asanaProjectName: true,
            ofProjectName: true
          }
        }
      }
    });
    res.json({ logs });
  } catch (error) {
    logger.error('Failed to fetch recent sync logs', error);
    res.status(500).json({ error: 'Failed to fetch recent sync logs' });
  }
});

export default router;