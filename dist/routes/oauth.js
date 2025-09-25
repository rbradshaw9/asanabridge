"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asana_oauth_1 = require("../services/asana-oauth");
const asana_1 = require("../services/asana");
const auth_1 = require("../services/auth");
const logger_1 = require("../config/logger");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
// Simple Asana OAuth info endpoint (public)
router.get('/asana', (req, res) => {
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
router.get('/asana/authorize', auth_1.authenticateToken, (req, res) => {
    try {
        const state = req.user.userId; // Use user ID as state for security
        const authUrl = asana_oauth_1.AsanaOAuth.getAuthUrl(state);
        res.json({
            authUrl,
            message: 'Visit this URL to authorize Asana access'
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating Asana auth URL', error);
        res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
});
// Handle Asana OAuth callback
router.get('/asana/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error) {
        logger_1.logger.warn('Asana OAuth error', { error });
        return res.status(400).json({ error: 'Authorization denied' });
    }
    if (!code || !state) {
        return res.status(400).json({ error: 'Missing authorization code or state' });
    }
    try {
        // Exchange code for tokens
        const tokens = await asana_oauth_1.AsanaOAuth.exchangeCodeForTokens(code);
        // Store tokens for user (state contains userId)
        await asana_oauth_1.AsanaOAuth.storeTokensForUser(state, tokens);
        // Test the connection by getting user info
        const asanaClient = new asana_1.AsanaClient(tokens.access_token);
        const asanaUser = await asanaClient.getCurrentUser();
        logger_1.logger.info('Asana OAuth successful', {
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
    }
    catch (error) {
        logger_1.logger.error('Asana OAuth callback error', error);
        res.status(500).json({ error: 'Failed to complete authorization' });
    }
});
// Get Asana connection status
router.get('/asana/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const accessToken = await asana_oauth_1.AsanaOAuth.getValidTokenForUser(userId);
        if (!accessToken) {
            return res.json({ connected: false });
        }
        // Test connection by getting user info
        const asanaClient = new asana_1.AsanaClient(accessToken);
        const asanaUser = await asanaClient.getCurrentUser();
        res.json({
            connected: true,
            user: {
                gid: asanaUser.gid,
                name: asanaUser.name,
                email: asanaUser.email
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error checking Asana status', error);
        res.json({ connected: false });
    }
});
// Disconnect Asana
router.delete('/asana/disconnect', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        await database_1.prisma.asanaToken.deleteMany({
            where: { userId }
        });
        logger_1.logger.info('Asana disconnected for user', { userId });
        res.json({ message: 'Asana account disconnected' });
    }
    catch (error) {
        logger_1.logger.error('Error disconnecting Asana', error);
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});
// Get Asana projects
// Debug endpoint to test basic Asana API access
router.get('/asana/debug', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const accessToken = await asana_oauth_1.AsanaOAuth.getValidTokenForUser(userId);
        if (!accessToken) {
            return res.status(401).json({ error: 'Asana not connected' });
        }
        logger_1.logger.info('Debug: Testing Asana API access', { userId });
        // Test multiple endpoints to see what works
        const asanaClient = new asana_1.AsanaClient(accessToken);
        const results = {};
        try {
            results.user = await asanaClient.getCurrentUser();
            logger_1.logger.info('Debug: User fetch successful', { user: results.user });
        }
        catch (err) {
            results.userError = err.message;
            logger_1.logger.error('Debug: User fetch failed', err);
        }
        try {
            results.workspaces = await asanaClient.getWorkspaces();
            logger_1.logger.info('Debug: Workspaces fetch successful', { count: results.workspaces?.length });
        }
        catch (err) {
            results.workspacesError = err.message;
            logger_1.logger.error('Debug: Workspaces fetch failed', err);
        }
        try {
            // Get projects from first available workspace
            if (results.workspaces && results.workspaces.length > 0) {
                const firstWorkspace = results.workspaces[0];
                const projects = await asanaClient.getProjects(firstWorkspace.gid);
                results.projects = projects;
                results.projectCount = projects?.length || 0;
                logger_1.logger.info('Debug: Projects fetch successful', { count: projects?.length, workspace: firstWorkspace.name });
            }
            else {
                results.projectsError = 'No workspaces available';
                logger_1.logger.warn('Debug: No workspaces available for projects fetch');
            }
        }
        catch (err) {
            results.projectsError = err.message;
            logger_1.logger.error('Debug: Projects fetch failed', err);
        }
        res.json({ debug: results, accessToken: accessToken ? 'present' : 'missing' });
    }
    catch (error) {
        logger_1.logger.error('Debug endpoint error', error);
        res.status(500).json({ error: 'Debug failed', details: error.message });
    }
});
// Get workspaces
router.get('/asana/workspaces', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const accessToken = await asana_oauth_1.AsanaOAuth.getValidTokenForUser(userId);
        if (!accessToken) {
            return res.status(401).json({ error: 'Asana not connected' });
        }
        const asanaClient = new asana_1.AsanaClient(accessToken);
        const workspaces = await asanaClient.getWorkspaces();
        res.json({ workspaces });
    }
    catch (error) {
        logger_1.logger.error('Error fetching Asana workspaces', error);
        res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
});
router.get('/asana/projects', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { workspace } = req.query;
        const accessToken = await asana_oauth_1.AsanaOAuth.getValidTokenForUser(userId);
        if (!accessToken) {
            return res.status(401).json({ error: 'Asana not connected' });
        }
        const asanaClient = new asana_1.AsanaClient(accessToken);
        // If no workspace specified, get the first workspace
        let workspaceGid = workspace;
        if (!workspaceGid) {
            logger_1.logger.info('No workspace specified, fetching workspaces first', { userId });
            const workspaces = await asanaClient.getWorkspaces();
            if (workspaces.length === 0) {
                return res.status(404).json({ error: 'No workspaces found' });
            }
            workspaceGid = workspaces[0].gid;
            logger_1.logger.info('Using first workspace', { userId, workspaceGid, workspaceName: workspaces[0].name });
        }
        logger_1.logger.info('Fetching Asana projects', { userId, workspace: workspaceGid });
        const projects = await asanaClient.getProjects(workspaceGid);
        logger_1.logger.info('Asana projects fetched successfully', {
            userId,
            projectCount: projects.length,
            workspace: workspaceGid
        });
        res.json({ projects });
    }
    catch (error) {
        logger_1.logger.error('Error fetching Asana projects', {
            error: error.message,
            stack: error.stack,
            userId: req.user.userId,
            workspace: req.query.workspace
        });
        res.status(500).json({
            error: 'Failed to fetch projects',
            details: error.message
        });
    }
});
// Get project tasks
router.get('/asana/projects/:projectId/tasks', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const projectId = req.params.projectId;
        const accessToken = await asana_oauth_1.AsanaOAuth.getValidTokenForUser(userId);
        if (!accessToken) {
            return res.status(401).json({ error: 'Asana not connected' });
        }
        const asanaClient = new asana_1.AsanaClient(accessToken);
        const tasks = await asanaClient.getProjectTasks(projectId);
        res.json({ tasks });
    }
    catch (error) {
        logger_1.logger.error('Error fetching Asana project tasks', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});
exports.default = router;
