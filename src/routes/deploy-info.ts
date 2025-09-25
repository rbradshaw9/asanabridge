import { Router } from 'express';
import { execSync } from 'child_process';

const router = Router();

// Get deployment info endpoint
router.get('/info', (_req, res) => {
  try {
    const deploymentTime = new Date().toISOString();
    let gitCommit = 'unknown';
    let gitBranch = 'unknown';
    
    try {
      gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: process.cwd() }).trim();
      gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', cwd: process.cwd() }).trim();
    } catch (error) {
      console.log('Git info not available:', error);
    }

    const deployInfo = {
      status: 'deployed',
      timestamp: deploymentTime,
      commit: gitCommit.substring(0, 8),
      fullCommit: gitCommit,
      branch: gitBranch,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      deploymentToken: `deploy-${Date.now()}`
    };

    res.json(deployInfo);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get deployment info',
      timestamp: new Date().toISOString() 
    });
  }
});

export default router;