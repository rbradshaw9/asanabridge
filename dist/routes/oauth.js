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
        // Redirect to frontend success page
        res.redirect(`${process.env.FRONTEND_URL}/dashboard?asana=connected`);
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
router.get('/asana/projects', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const accessToken = await asana_oauth_1.AsanaOAuth.getValidTokenForUser(userId);
        if (!accessToken) {
            return res.status(401).json({ error: 'Asana not connected' });
        }
        const asanaClient = new asana_1.AsanaClient(accessToken);
        const projects = await asanaClient.getProjects();
        res.json({ projects });
    }
    catch (error) {
        logger_1.logger.error('Error fetching Asana projects', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
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
