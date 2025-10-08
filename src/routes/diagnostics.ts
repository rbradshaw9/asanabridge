import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../services/auth';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { loadEnv } from '../config/env';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const env = loadEnv();

// Diagnostic endpoint - comprehensive system health check
router.get('/health', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      version: '2.2.1',
      user: {
        id: userId,
        email: req.user!.email
      },
      system: {},
      database: {},
      files: {},
      agent: {},
      sync: {},
      errors: []
    };

    // System Information
    diagnostics.system = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        processUsage: process.memoryUsage()
      },
      cpu: os.cpus().length,
      hostname: os.hostname(),
      environment: env.NODE_ENV
    };

    // Database Health
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      diagnostics.database.status = 'connected';
      diagnostics.database.responseTime = Date.now() - dbStart;
      
      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          createdAt: true
        }
      });
      
      const asanaToken = await prisma.asanaToken.findUnique({
        where: { userId }
      });
      
      const omnifocusSetup = await prisma.omniFocusSetup.findUnique({
        where: { userId }
      });
      
      diagnostics.database.user = {
        exists: !!user,
        plan: user?.plan,
        hasAsanaToken: !!asanaToken,
        hasAgentSetup: !!omnifocusSetup,
        memberSince: user?.createdAt
      };
    } catch (dbError: any) {
      diagnostics.database.status = 'error';
      diagnostics.database.error = dbError.message;
      diagnostics.errors.push({ component: 'database', error: dbError.message });
    }

    // File System Checks
    const dmgPath = path.join(__dirname, '../../public/downloads/AsanaBridge-2.2.1.dmg');
    try {
      const dmgExists = fs.existsSync(dmgPath);
      diagnostics.files.dmg = {
        path: dmgPath,
        exists: dmgExists,
        size: dmgExists ? fs.statSync(dmgPath).size : 0,
        sizeHuman: dmgExists ? `${Math.round(fs.statSync(dmgPath).size / 1024)}KB` : 'N/A'
      };
    } catch (fileError: any) {
      diagnostics.files.dmg = { error: fileError.message };
      diagnostics.errors.push({ component: 'files', error: fileError.message });
    }

    // Agent Setup Status
    try {
      const agentSetup = await prisma.omniFocusSetup.findUnique({
        where: { userId }
      });
      
      diagnostics.agent = {
        registered: !!agentSetup,
        active: agentSetup?.isActive,
        agentKey: agentSetup?.agentKey ? 'SET' : 'NOT_SET',
        version: agentSetup?.version || 'NOT_SET',
        lastSeen: agentSetup?.updatedAt
      };
    } catch (agentError: any) {
      diagnostics.agent.error = agentError.message;
      diagnostics.errors.push({ component: 'agent', error: agentError.message });
    }

    // Sync Status
    try {
      const mappings = await prisma.syncMapping.findMany({
        where: { userId },
        select: {
          id: true,
          asanaProjectId: true,
          ofProjectName: true,
          isActive: true,
          lastSyncAt: true
        }
      });

      const recentLogs = await prisma.syncLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          createdAt: true,
          status: true,
          direction: true,
          itemssynced: true,
          errorMessage: true
        }
      });

      diagnostics.sync = {
        mappingsCount: mappings.length,
        activeMappings: mappings.filter(m => m.isActive).length,
        mappings: mappings.map(m => ({
          id: m.id,
          asanaProject: m.asanaProjectId,
          omnifocusProject: m.ofProjectName,
          active: m.isActive,
          lastSync: m.lastSyncAt
        })),
        recentSyncs: recentLogs.map(log => ({
          time: log.createdAt,
          status: log.status,
          direction: log.direction,
          itemsSynced: log.itemssynced,
          error: log.errorMessage
        }))
      };
    } catch (syncError: any) {
      diagnostics.sync.error = syncError.message;
      diagnostics.errors.push({ component: 'sync', error: syncError.message });
    }

    // API Connectivity Tests
    diagnostics.connectivity = {
      asana: 'NOT_TESTED',
      omnifocus: 'NOT_TESTED'
    };

    // Test Asana connectivity if token exists
    const asanaToken = await prisma.asanaToken.findUnique({
      where: { userId }
    });

    if (asanaToken?.accessToken) {
      try {
        const asanaResponse = await fetch('https://app.asana.com/api/1.0/users/me', {
          headers: {
            'Authorization': `Bearer ${asanaToken.accessToken}`
          }
        });
        diagnostics.connectivity.asana = asanaResponse.ok ? 'CONNECTED' : `ERROR_${asanaResponse.status}`;
      } catch (asanaError: any) {
        diagnostics.connectivity.asana = `ERROR: ${asanaError.message}`;
      }
    }

    res.json({
      success: true,
      diagnostics,
      summary: {
        healthy: diagnostics.errors.length === 0,
        errorCount: diagnostics.errors.length,
        criticalIssues: diagnostics.errors.filter((e: any) => 
          e.component === 'database' || e.component === 'files'
        ).length
      }
    });

  } catch (error: any) {
    logger.error('Diagnostics endpoint error', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// App crash reporter endpoint
router.post('/crash-report', async (req: Request, res: Response) => {
  try {
    const { appVersion, error, stackTrace, deviceInfo, timestamp } = req.body;

    logger.error('App crash reported', {
      appVersion,
      error,
      stackTrace,
      deviceInfo,
      timestamp
    });

    // Store crash report in database
    await prisma.$executeRaw`
      INSERT INTO crash_reports (app_version, error_message, stack_trace, device_info, created_at)
      VALUES (${appVersion}, ${error}, ${stackTrace}, ${JSON.stringify(deviceInfo)}, ${new Date(timestamp)})
      ON CONFLICT DO NOTHING
    `;

    res.json({ success: true, message: 'Crash report received' });
  } catch (error: any) {
    logger.error('Failed to save crash report', error);
    res.status(500).json({ error: 'Failed to save crash report' });
  }
});

// App diagnostics from Swift app
router.post('/app-diagnostics', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { logs, state, version } = req.body;
    const userId = req.user!.id;

    logger.info('App diagnostics received', {
      userId,
      version,
      logsCount: logs?.length || 0,
      state
    });

    // Analyze logs for issues
    const issues: string[] = [];
    
    if (logs && Array.isArray(logs)) {
      const errorLogs = logs.filter((log: string) => log.includes('❌') || log.includes('ERROR'));
      const warningLogs = logs.filter((log: string) => log.includes('⚠️') || log.includes('WARNING'));
      
      if (errorLogs.length > 0) {
        issues.push(`${errorLogs.length} error(s) detected in logs`);
      }
      if (warningLogs.length > 0) {
        issues.push(`${warningLogs.length} warning(s) detected in logs`);
      }
    }

    // Check state for problems
    if (state) {
      if (!state.statusItemCreated) issues.push('Menu bar icon not created');
      if (!state.authenticated) issues.push('User not authenticated');
      if (!state.asanaConnected) issues.push('Asana not connected');
      if (!state.omnifocusConnected) issues.push('OmniFocus not connected');
    }

    res.json({
      success: true,
      analysis: {
        issues,
        recommendations: generateRecommendations(issues),
        healthy: issues.length === 0
      }
    });

  } catch (error: any) {
    logger.error('App diagnostics error', error);
    res.status(500).json({ error: error.message });
  }
});

function generateRecommendations(issues: string[]): string[] {
  const recommendations: string[] = [];
  
  issues.forEach(issue => {
    if (issue.includes('Menu bar icon')) {
      recommendations.push('Try restarting the app or check System Settings > Login Items');
    }
    if (issue.includes('not authenticated')) {
      recommendations.push('Log in again through the app menu');
    }
    if (issue.includes('Asana not connected')) {
      recommendations.push('Reconnect to Asana in the dashboard at asanabridge.com');
    }
    if (issue.includes('OmniFocus')) {
      recommendations.push('Make sure OmniFocus is installed and running');
    }
    if (issue.includes('error')) {
      recommendations.push('Check the app logs for detailed error messages');
    }
  });

  if (recommendations.length === 0) {
    recommendations.push('System appears healthy - no action needed');
  }

  return recommendations;
}

export default router;
