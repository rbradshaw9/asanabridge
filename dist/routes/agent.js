"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../services/auth");
const logger_1 = require("../config/logger");
const database_1 = require("../config/database");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// Agent authentication middleware
async function authenticateAgent(req, res, next) {
    const authHeader = req.headers['authorization'];
    const agentKey = authHeader && authHeader.split(' ')[1]; // Bearer AGENT_KEY
    if (!agentKey) {
        return res.status(401).json({ error: 'Agent key required' });
    }
    try {
        // Find OmniFocus setup with this agent key
        const setup = await database_1.prisma.omniFocusSetup.findUnique({
            where: { agentKey },
            include: { user: true }
        });
        if (!setup || !setup.isActive) {
            return res.status(403).json({ error: 'Invalid or inactive agent key' });
        }
        // Add user context to request
        req.agentUser = setup.user;
        req.agentSetup = setup;
        next();
    }
    catch (error) {
        logger_1.logger.error('Agent authentication error', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}
// Register agent with web service
router.post('/register', authenticateAgent, async (req, res) => {
    try {
        const { version, capabilities, platform, nodeVersion } = req.body;
        const setup = req.agentSetup;
        // Update agent info
        await database_1.prisma.omniFocusSetup.update({
            where: { id: setup.id },
            data: {
                version,
                isActive: true,
                updatedAt: new Date()
            }
        });
        logger_1.logger.info('Agent registered', {
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
    }
    catch (error) {
        logger_1.logger.error('Agent registration failed', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
// Get agent configuration based on user's plan
router.get('/config', authenticateAgent, async (req, res) => {
    try {
        const setup = req.agentSetup;
        // Get user with plan information
        const user = await database_1.prisma.user.findUnique({
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
        const config = planConfig[user.plan] || planConfig.FREE;
        res.json({
            plan: user.plan,
            ...config,
            serverTime: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get agent config', error);
        res.status(500).json({ error: 'Failed to get configuration' });
    }
});
// Get sync mappings for this user
router.get('/mappings', authenticateAgent, async (req, res) => {
    try {
        const userId = req.agentUser.id;
        const mappings = await database_1.prisma.syncMapping.findMany({
            where: {
                userId,
                isActive: true
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json({ mappings });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch sync mappings', error);
        res.status(500).json({ error: 'Failed to fetch mappings' });
    }
});
// Report sync status
router.post('/sync-status', authenticateAgent, async (req, res) => {
    try {
        const { mappingId, status, details } = req.body;
        const userId = req.agentUser.id;
        // Verify mapping belongs to this user
        const mapping = await database_1.prisma.syncMapping.findFirst({
            where: { id: mappingId, userId }
        });
        if (!mapping) {
            return res.status(404).json({ error: 'Mapping not found' });
        }
        // Create sync log entry
        await database_1.prisma.syncLog.create({
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
            await database_1.prisma.syncMapping.update({
                where: { id: mappingId },
                data: { lastSyncAt: new Date() }
            });
        }
        res.json({ message: 'Status reported' });
    }
    catch (error) {
        logger_1.logger.error('Failed to report sync status', error);
        res.status(500).json({ error: 'Failed to report status' });
    }
});
// Get pending sync commands
router.get('/commands', authenticateAgent, async (req, res) => {
    try {
        // For now, return empty array - will implement command queue later
        res.json({ commands: [] });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch commands', error);
        res.status(500).json({ error: 'Failed to fetch commands' });
    }
});
// Acknowledge command completion
router.post('/commands/ack', authenticateAgent, async (req, res) => {
    try {
        const { commandId, success, error: errorMsg } = req.body;
        // Log command acknowledgment
        logger_1.logger.info('Command acknowledged', {
            commandId,
            success,
            error: errorMsg,
            userId: req.agentUser.id
        });
        res.json({ message: 'Command acknowledged' });
    }
    catch (error) {
        logger_1.logger.error('Failed to acknowledge command', error);
        res.status(500).json({ error: 'Failed to acknowledge command' });
    }
});
// Receive OmniFocus task data
router.post('/task-data', authenticateAgent, async (req, res) => {
    try {
        const { mappingId, tasks } = req.body;
        const userId = req.agentUser.id;
        // Verify mapping belongs to this user
        const mapping = await database_1.prisma.syncMapping.findFirst({
            where: { id: mappingId, userId }
        });
        if (!mapping) {
            return res.status(404).json({ error: 'Mapping not found' });
        }
        // Store task data for sync processing (implement sync logic here)
        logger_1.logger.info('Received OmniFocus task data', {
            mappingId,
            taskCount: tasks.length,
            userId
        });
        // TODO: Implement sync logic to compare with Asana and resolve conflicts
        res.json({
            message: 'Task data received',
            processed: tasks.length
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to process task data', error);
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
router.post('/generate-key', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const agentKey = crypto_1.default.randomBytes(32).toString('hex');
        // Create or update OmniFocus setup
        const setup = await database_1.prisma.omniFocusSetup.upsert({
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
        logger_1.logger.info('Agent key generated', { userId });
        res.json({
            agentKey,
            message: 'Download and configure the OmniFocus agent with this key'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate agent key', error);
        res.status(500).json({ error: 'Failed to generate key' });
    }
});
// Get agent status for user
router.get('/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const setup = await database_1.prisma.omniFocusSetup.findUnique({
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
    }
    catch (error) {
        logger_1.logger.error('Failed to get agent status', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
});
exports.default = router;
