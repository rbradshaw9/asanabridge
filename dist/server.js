"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const database_1 = require("./config/database");
const oauth_1 = __importDefault(require("./routes/oauth"));
// Load environment variables first
dotenv_1.default.config();
const env = (0, env_1.loadEnv)();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: env.FRONTEND_URL,
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Health check
app.get('/health', async (_req, res) => {
    try {
        // Check database connection
        await database_1.prisma.$queryRaw `SELECT 1`;
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    }
    catch (error) {
        logger_1.logger.error('Health check failed', error);
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'disconnected'
        });
    }
});
// Serve static files from public directory
app.use(express_1.default.static('public'));
// Root route serves the landing page
app.get('/', (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
});
// API Routes
app.use('/api/oauth', oauth_1.default);
const auth_1 = __importDefault(require("./routes/auth"));
app.use('/api/auth', auth_1.default);
const agent_1 = __importDefault(require("./routes/agent"));
app.use('/api/agent', agent_1.default);
const sync_1 = __importDefault(require("./routes/sync"));
app.use('/api/sync', sync_1.default);
// Basic API routes (will expand these)
app.get('/api/status', (_req, res) => {
    res.json({
        service: 'AsanaBridge API',
        version: '0.1.0',
        environment: env.NODE_ENV
    });
});
// Auth routes are now properly implemented in ./routes/auth.ts
// Catch-all for API routes
app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});
// Global error handler
app.use((error, _req, res, _next) => {
    logger_1.logger.error('Unhandled error', error);
    res.status(500).json({
        error: env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
});
const port = env.PORT;
app.listen(port, () => {
    logger_1.logger.info(`AsanaBridge server started on port ${port}`, {
        environment: env.NODE_ENV,
        port
    });
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    await database_1.prisma.$disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully');
    await database_1.prisma.$disconnect();
    process.exit(0);
});
