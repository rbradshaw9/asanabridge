"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../services/auth");
const sync_engine_1 = require("../services/sync-engine");
const logger_1 = require("../config/logger");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
// Create a new sync mapping between Asana project and OmniFocus project
router.post('/mappings', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { asanaProjectId, asanaProjectName, omnifocusProjectName } = req.body;
        if (!asanaProjectId || !asanaProjectName || !omnifocusProjectName) {
            return res.status(400).json({
                error: 'Missing required fields: asanaProjectId, asanaProjectName, omnifocusProjectName'
            });
        }
        // Check if mapping already exists
        const existing = await database_1.prisma.syncMapping.findUnique({
            where: {
                userId_asanaProjectId: { userId, asanaProjectId }
            }
        });
        if (existing) {
            return res.status(409).json({ error: 'Mapping already exists for this Asana project' });
        }
        // Create new mapping
        const mapping = await database_1.prisma.syncMapping.create({
            data: {
                userId,
                asanaProjectId,
                asanaProjectName,
                ofProjectName: omnifocusProjectName,
                isActive: true
            }
        });
        logger_1.logger.info('Sync mapping created', { userId, mappingId: mapping.id });
        res.status(201).json({
            mapping,
            message: 'Sync mapping created successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to create sync mapping', error);
        res.status(500).json({ error: 'Failed to create mapping' });
    }
});
// Get all sync mappings for user
router.get('/mappings', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const mappings = await database_1.prisma.syncMapping.findMany({
            where: { userId },
            include: {
                syncLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 5 // Last 5 sync logs per mapping
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ mappings });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch sync mappings', error);
        res.status(500).json({ error: 'Failed to fetch mappings' });
    }
});
// Update sync mapping
router.put('/mappings/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const mappingId = req.params.id;
        const { omnifocusProjectName, isActive } = req.body;
        const mapping = await database_1.prisma.syncMapping.findFirst({
            where: { id: mappingId, userId }
        });
        if (!mapping) {
            return res.status(404).json({ error: 'Mapping not found' });
        }
        const updated = await database_1.prisma.syncMapping.update({
            where: { id: mappingId },
            data: {
                ...(omnifocusProjectName && { ofProjectName: omnifocusProjectName }),
                ...(isActive !== undefined && { isActive }),
                updatedAt: new Date()
            }
        });
        res.json({ mapping: updated });
    }
    catch (error) {
        logger_1.logger.error('Failed to update sync mapping', error);
        res.status(500).json({ error: 'Failed to update mapping' });
    }
});
// Delete sync mapping
router.delete('/mappings/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const mappingId = req.params.id;
        const mapping = await database_1.prisma.syncMapping.findFirst({
            where: { id: mappingId, userId }
        });
        if (!mapping) {
            return res.status(404).json({ error: 'Mapping not found' });
        }
        await database_1.prisma.syncMapping.delete({
            where: { id: mappingId }
        });
        logger_1.logger.info('Sync mapping deleted', { userId, mappingId });
        res.json({ message: 'Mapping deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete sync mapping', error);
        res.status(500).json({ error: 'Failed to delete mapping' });
    }
});
// Manually trigger sync for a specific mapping
router.post('/mappings/:id/sync', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const mappingId = req.params.id;
        const mapping = await database_1.prisma.syncMapping.findFirst({
            where: { id: mappingId, userId, isActive: true }
        });
        if (!mapping) {
            return res.status(404).json({ error: 'Active mapping not found' });
        }
        // Create sync context
        const context = {
            userId,
            mappingId: mapping.id,
            asanaProjectId: mapping.asanaProjectId,
            omnifocusProjectName: mapping.ofProjectName,
            lastSyncAt: mapping.lastSyncAt || undefined
        };
        // Execute sync
        const syncEngine = new sync_engine_1.SyncEngine(userId);
        const result = await syncEngine.performSync(context);
        res.json({
            message: 'Sync completed',
            result
        });
    }
    catch (error) {
        logger_1.logger.error('Manual sync failed', error);
        res.status(500).json({ error: 'Sync failed: ' + error.message });
    }
});
// Get sync history for a mapping
router.get('/mappings/:id/history', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const mappingId = req.params.id;
        const limit = parseInt(req.query.limit) || 50;
        const mapping = await database_1.prisma.syncMapping.findFirst({
            where: { id: mappingId, userId }
        });
        if (!mapping) {
            return res.status(404).json({ error: 'Mapping not found' });
        }
        const logs = await database_1.prisma.syncLog.findMany({
            where: { syncMappingId: mappingId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
        res.json({ logs });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch sync history', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});
// Get overall sync statistics for user
router.get('/stats', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [mappingCount, totalSyncs, recentErrors] = await Promise.all([
            database_1.prisma.syncMapping.count({ where: { userId, isActive: true } }),
            database_1.prisma.syncLog.count({ where: { userId } }),
            database_1.prisma.syncLog.count({
                where: {
                    userId,
                    status: 'ERROR',
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
                }
            })
        ]);
        const lastSync = await database_1.prisma.syncLog.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            activeMappings: mappingCount,
            totalSyncs,
            recentErrors,
            lastSyncAt: lastSync?.createdAt,
            lastSyncStatus: lastSync?.status
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch sync stats', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
exports.default = router;
