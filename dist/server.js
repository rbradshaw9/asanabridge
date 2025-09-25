"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const express_session_1 = __importDefault(require("express-session"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const database_1 = require("./config/database");
// import { passport } from './config/passport'; // Temporarily disabled
const oauth_1 = __importDefault(require("./routes/oauth"));
const auth_1 = __importDefault(require("./routes/auth"));
const agent_1 = __importDefault(require("./routes/agent"));
const sync_1 = __importDefault(require("./routes/sync"));
const download_1 = __importDefault(require("./routes/download"));
const deploy_info_1 = __importDefault(require("./routes/deploy-info"));
// Load environment variables first
dotenv_1.default.config();
const env = (0, env_1.loadEnv)();
const app = (0, express_1.default)();
// Middleware
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
// Session middleware for passport
app.use((0, express_session_1.default)({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
// Initialize passport - Temporarily disabled
// app.use(passport.initialize());
// app.use(passport.session());
// Health check
app.get('/health', async (_req, res) => {
    try {
        // Check database connection
        await database_1.prisma.$queryRaw `SELECT 1`;
        // Get git commit info for deployment verification
        let gitCommit = 'unknown';
        try {
            const { execSync } = require('child_process');
            gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: process.cwd() }).trim().substring(0, 8);
        }
        catch (error) {
            // Git info not available
        }
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected',
            commit: gitCommit,
            deploymentTest: 'NEW_CODE_MARKER_v2'
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
app.use('/api/auth', auth_1.default);
app.use('/api/agent', agent_1.default);
app.use('/api/sync', sync_1.default);
app.use('/api/download', download_1.default);
app.use('/api/deploy', deploy_info_1.default);
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
