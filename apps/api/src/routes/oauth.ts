import { Router, Request, Response } from 'express';
import { AsanaOAuth } from '../services/asana-oauth';
import { AsanaClient } from '../services/asana';
import { authenticateToken, AuthenticatedRequest } from '../services/auth';
import { prisma } from '../config/database';
import { oauthLogger } from '../config/logger';
import { loadEnv } from '../config/env';

const router = Router();

// ─── Start OAuth Flow ─────────────────────────────────────────────────────────

router.get('/asana/authorize', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUrl = AsanaOAuth.getAuthorizationUrl(req.user!.userId);
    res.json({ authUrl });
  } catch (err) {
    res.status(503).json({ error: 'Asana OAuth not configured on this server' });
  }
});

// ─── OAuth Callback ───────────────────────────────────────────────────────────

router.get('/asana/callback', async (req: Request, res: Response) => {
  const { code, state: userId, error } = req.query;
  const env = loadEnv();

  if (error) {
    oauthLogger.warn('Asana OAuth denied by user', { error });
    return res.redirect(`${env.FRONTEND_URL}/dashboard?asana=denied`);
  }

  if (!code || !userId || typeof code !== 'string' || typeof userId !== 'string') {
    return res.status(400).send('Missing code or state parameter');
  }

  try {
    const tokenData = await AsanaOAuth.exchangeCode(code);

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    await prisma.asanaToken.upsert({
      where: { userId },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        expiresAt,
      },
      create: {
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        expiresAt,
      },
    });

    oauthLogger.info('Asana account connected', { userId });

    // Return success HTML that auto-closes the popup or redirects
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Connected</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'asana-oauth-success' }, '*');
              window.close();
            } else {
              window.location.href = '${env.FRONTEND_URL}/dashboard?asana=connected';
            }
          </script>
          <p>Asana connected! You can close this window.</p>
        </body>
      </html>
    `);
  } catch (err) {
    oauthLogger.error('Asana OAuth callback failed', { error: (err as Error).message });
    res.redirect(`${env.FRONTEND_URL}/dashboard?asana=error`);
  }
});

// ─── Connection Status ────────────────────────────────────────────────────────

router.get('/asana/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = await prisma.asanaToken.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!token) {
      return res.json({ connected: false });
    }

    try {
      const accessToken = await AsanaOAuth.getValidToken(req.user!.userId);
      const client = new AsanaClient(accessToken);
      const asanaUser = await client.getCurrentUser();
      res.json({ connected: true, asanaUser });
    } catch {
      // Token invalid/expired and couldn't refresh
      res.json({ connected: false, tokenInvalid: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to check Asana status' });
  }
});

// ─── Disconnect ───────────────────────────────────────────────────────────────

router.delete('/asana/disconnect', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.asanaToken.deleteMany({ where: { userId: req.user!.userId } });
    oauthLogger.info('Asana account disconnected', { userId: req.user!.userId });
    res.json({ message: 'Asana disconnected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect Asana' });
  }
});

// ─── Workspaces ───────────────────────────────────────────────────────────────

router.get('/asana/workspaces', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const accessToken = await AsanaOAuth.getValidToken(req.user!.userId);
    const client = new AsanaClient(accessToken);
    const workspaces = await client.getWorkspaces();
    res.json({ workspaces });
  } catch (err: any) {
    if (err.message?.includes('No Asana token')) {
      return res.status(400).json({ error: 'Asana account not connected' });
    }
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// ─── Projects ─────────────────────────────────────────────────────────────────

router.get('/asana/projects', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspace } = req.query;
    const accessToken = await AsanaOAuth.getValidToken(req.user!.userId);
    const client = new AsanaClient(accessToken);

    let workspaceGid = typeof workspace === 'string' ? workspace : undefined;
    if (!workspaceGid) {
      const workspaces = await client.getWorkspaces();
      workspaceGid = workspaces[0]?.gid;
    }

    if (!workspaceGid) {
      return res.json({ projects: [] });
    }

    const projects = await client.getProjects(workspaceGid);
    res.json({ projects });
  } catch (err: any) {
    if (err.message?.includes('No Asana token')) {
      return res.status(400).json({ error: 'Asana account not connected' });
    }
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// ─── Tasks ────────────────────────────────────────────────────────────────────

router.get('/asana/projects/:projectId/tasks', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const accessToken = await AsanaOAuth.getValidToken(req.user!.userId);
    const client = new AsanaClient(accessToken);
    const tasks = await client.getProjectTasks(projectId);
    res.json({ tasks });
  } catch (err: any) {
    if (err.message?.includes('No Asana token')) {
      return res.status(400).json({ error: 'Asana account not connected' });
    }
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

export default router;
