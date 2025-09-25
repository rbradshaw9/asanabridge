import { Router, Request, Response } from 'express';
import { AsanaOAuth } from '../services/asana-oauth';
import { AsanaClient } from '../services/asana';
import { authenticateToken, AuthenticatedRequest } from '../services/auth';
import { logger } from '../config/logger';
import { prisma } from '../config/database';

const router = Router();

// Simple Asana OAuth info endpoint (public)
router.get('/asana', (req: Request, res: Response) => {
  res.json({ 
    message: 'Asana OAuth Integration',
    endpoints: {
      authorize: '/api/oauth/asana/authorize',
      callback: '/api/oauth/asana/callback'
    },
    status: 'ready'
  });
});

// Initiate Asana OAuth flow
router.get('/asana/authorize', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const state = req.user!.userId; // Use user ID as state for security
    const authUrl = AsanaOAuth.getAuthUrl(state);
    
    res.json({ 
      authUrl,
      message: 'Visit this URL to authorize Asana access' 
    });
  } catch (error) {
    logger.error('Error generating Asana auth URL', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// Handle Asana OAuth callback
router.get('/asana/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    logger.warn('Asana OAuth error', { error });
    return res.status(400).json({ error: 'Authorization denied' });
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing authorization code or state' });
  }

  try {
    // Exchange code for tokens
    const tokens = await AsanaOAuth.exchangeCodeForTokens(code as string);
    
    // Store tokens for user (state contains userId)
    await AsanaOAuth.storeTokensForUser(state as string, tokens);

    // Test the connection by getting user info
    const asanaClient = new AsanaClient(tokens.access_token);
    const asanaUser = await asanaClient.getCurrentUser();

    logger.info('Asana OAuth successful', { 
      userId: state,
      asanaUserGid: asanaUser.gid,
      asanaUserEmail: asanaUser.email
    });

    // Send HTML that closes the popup window
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asana Connected</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .success {
              text-align: center;
              background: rgba(255,255,255,0.1);
              padding: 2rem;
              border-radius: 12px;
              backdrop-filter: blur(10px);
            }
          </style>
        </head>
        <body>
          <div class="success">
            <h2>✅ Successfully Connected to Asana!</h2>
            <p>You can close this window.</p>
          </div>
          <script>
            // Close the popup after a short delay
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    logger.error('Asana OAuth callback error', error);
    res.status(500).json({ error: 'Failed to complete authorization' });
  }
});

// Get Asana connection status
router.get('/asana/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const accessToken = await AsanaOAuth.getValidTokenForUser(userId);
    
    if (!accessToken) {
      return res.json({ connected: false });
    }

    // Test connection by getting user info
    const asanaClient = new AsanaClient(accessToken);
    const asanaUser = await asanaClient.getCurrentUser();

    res.json({
      connected: true,
      user: {
        gid: asanaUser.gid,
        name: asanaUser.name,
        email: asanaUser.email
      }
    });
  } catch (error) {
    logger.error('Error checking Asana status', error);
    res.json({ connected: false });
  }
});

// Disconnect Asana
router.delete('/asana/disconnect', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    await prisma.asanaToken.deleteMany({
      where: { userId }
    });

    logger.info('Asana disconnected for user', { userId });
    res.json({ message: 'Asana account disconnected' });
  } catch (error) {
    logger.error('Error disconnecting Asana', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Get Asana projects
// Get workspaces
router.get('/asana/workspaces', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const accessToken = await AsanaOAuth.getValidTokenForUser(userId);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Asana not connected' });
    }

    const asanaClient = new AsanaClient(accessToken);
    const workspaces = await asanaClient.getWorkspaces();

    res.json({ workspaces });
  } catch (error) {
    logger.error('Error fetching Asana workspaces', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

router.get('/asana/projects', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspace } = req.query;
    const accessToken = await AsanaOAuth.getValidTokenForUser(userId);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Asana not connected' });
    }

    logger.info('Fetching Asana projects', { userId, workspace });
    const asanaClient = new AsanaClient(accessToken);
    const projects = await asanaClient.getProjects(workspace as string);

    logger.info('Asana projects fetched successfully', { 
      userId, 
      projectCount: projects.length,
      workspace 
    });

    res.json({ projects });
  } catch (error: any) {
    logger.error('Error fetching Asana projects', { 
      error: error.message,
      stack: error.stack,
      userId: req.user!.userId,
      workspace: req.query.workspace
    });
    res.status(500).json({ 
      error: 'Failed to fetch projects',
      details: error.message 
    });
  }
});

// Get project tasks
router.get('/asana/projects/:projectId/tasks', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.projectId;
    const accessToken = await AsanaOAuth.getValidTokenForUser(userId);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Asana not connected' });
    }

    const asanaClient = new AsanaClient(accessToken);
    const tasks = await asanaClient.getProjectTasks(projectId);

    res.json({ tasks });
  } catch (error) {
    logger.error('Error fetching Asana project tasks', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

export default router;