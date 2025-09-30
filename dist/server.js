"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const database_1 = require("./config/database");
const oauth_1 = __importDefault(require("./routes/oauth"));
const auth_1 = __importDefault(require("./routes/auth"));
const agent_1 = __importDefault(require("./routes/agent"));
const sync_1 = __importDefault(require("./routes/sync"));
const download_1 = __importDefault(require("./routes/download"));
const deploy_info_1 = __importDefault(require("./routes/deploy-info"));
const admin_1 = __importDefault(require("./routes/admin"));
const support_1 = __importDefault(require("./routes/support"));
// Load environment variables first
dotenv_1.default.config();
const env = (0, env_1.loadEnv)();
const app = (0, express_1.default)();
// Security middleware - must come before other middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false // Allow embedding for iframe auth flows
}));
// General API rate limiting
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Strict rate limiting for authentication endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 auth requests per windowMs
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Apply general rate limiting to all requests
app.use(generalLimiter);
// Apply strict rate limiting to auth endpoints
app.use('/api/auth', authLimiter);
// CORS configuration
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            env.FRONTEND_URL,
            'http://localhost:5173',
            'https://localhost:5173',
        ];
        // Allow all subdomains of asanabridge.com
        const asanabridgePattern = /^https?:\/\/([a-zA-Z0-9-]+\.)?asanabridge\.com$/;
        if (allowedOrigins.includes(origin) || asanabridgePattern.test(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoints
const healthCheck = async (_req, res) => {
    try {
        const checks = {
            database: 'unknown',
            environment: 'unknown',
            secrets: 'unknown',
            commit: 'unknown',
            timestamp: new Date().toISOString(),
            version: '2.1.0'
        };
        // Check database connection
        try {
            await database_1.prisma.$queryRaw `SELECT 1`;
            checks.database = 'connected';
        }
        catch (dbError) {
            checks.database = 'disconnected';
            throw new Error('Database connection failed');
        }
        // Check environment configuration
        if (env.NODE_ENV === 'production') {
            checks.environment = 'production';
            // Verify critical production secrets are set
            if (env.JWT_SECRET && env.JWT_SECRET.length >= 32 &&
                env.DATABASE_URL && env.DATABASE_URL.includes('postgresql://')) {
                checks.secrets = 'configured';
            }
            else {
                checks.secrets = 'missing_critical_secrets';
                throw new Error('Critical production secrets not configured');
            }
        }
        else {
            checks.environment = env.NODE_ENV;
            checks.secrets = 'development_mode';
        }
        // Get git commit info for deployment verification
        try {
            const { execSync } = require('child_process');
            checks.commit = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: process.cwd() }).trim().substring(0, 8);
        }
        catch (error) {
            checks.commit = 'git_unavailable';
        }
        res.json({
            status: 'ok',
            checks,
            deploymentTest: 'VERSION_CHECK_SYSTEM_v2.1.0'
        });
    }
    catch (error) {
        logger_1.logger.error('Health check failed', error);
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);
// Readiness check for Kubernetes/Docker deployments
app.get('/ready', async (_req, res) => {
    try {
        // Check if app is ready to serve requests
        await database_1.prisma.$queryRaw `SELECT 1`;
        res.status(200).json({ status: 'ready' });
    }
    catch (error) {
        res.status(503).json({ status: 'not_ready' });
    }
});
// Liveness check for Kubernetes/Docker deployments
app.get('/live', (_req, res) => {
    // Simple liveness check - if this endpoint responds, the app is alive
    res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});
// Serve static files from public directory (for downloads, etc.)
app.use('/public', express_1.default.static('public'));
// Serve React app static files
app.use(express_1.default.static(path_1.default.join(__dirname, '../frontend/dist')));
// API Routes
app.use('/api/oauth', oauth_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/agent', agent_1.default);
app.use('/api/sync', sync_1.default);
app.use('/api/download', download_1.default);
app.use('/api/deploy', deploy_info_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/support', support_1.default);
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
// Catch-all handler: send back React's index.html file for client-side routing
app.get('*', (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../frontend/dist/index.html'));
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
