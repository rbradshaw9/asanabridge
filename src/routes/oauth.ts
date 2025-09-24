import { Router, Request, Response } from 'express';
import { AsanaOAuth } from '../services/asana-oauth';
import { AsanaClient } from '../services/asana';
import { authenticateToken, AuthenticatedRequest } from '../services/auth';
import { logger } from '../config/logger';
import { prisma } from '../config/database';

const router = Router();

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

    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?asana=connected`);
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
router.get('/asana/projects', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const accessToken = await AsanaOAuth.getValidTokenForUser(userId);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Asana not connected' });
    }

    const asanaClient = new AsanaClient(accessToken);
    const projects = await asanaClient.getProjects();

    res.json({ projects });
  } catch (error) {
    logger.error('Error fetching Asana projects', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
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