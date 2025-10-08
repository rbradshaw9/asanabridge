import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { loadEnv } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
import oauthRoutes from './routes/oauth';
import authRoutes from './routes/auth';
import agentRoutes from './routes/agent';
import syncRoutes from './routes/sync';
import downloadRoutes from './routes/download';
import deployInfoRoutes from './routes/deploy-info';
import adminRoutes from './routes/admin';
import supportRoutes from './routes/support';

// Load environment variables first
dotenv.config();
const env = loadEnv();

const app = express();

// Trust proxy - must come first when behind nginx/load balancer
app.set('trust proxy', 1);

// Security middleware - must come before other middleware
app.use(helmet({
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
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true }, // Trust the X-Forwarded-For header from nginx
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  validate: { trustProxy: true }, // Trust the X-Forwarded-For header from nginx
  legacyHeaders: false,
});

// Apply general rate limiting to all requests
app.use(generalLimiter);

// Apply strict rate limiting to auth endpoints
app.use('/api/auth', authLimiter);

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      env.FRONTEND_URL,
      'http://localhost:5173',
      'https://localhost:5173',
    ];
    
    // Allow all subdomains of asanabridge.com
    const asanabridgePattern = /^https?:\/\/([a-zA-Z0-9-]+\.)?asanabridge\.com$/;
    
    if (allowedOrigins.includes(origin) || asanabridgePattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
const healthCheck = async (_req: express.Request, res: express.Response) => {
  try {
    const checks = {
      database: 'unknown',
      environment: 'unknown',
      secrets: 'unknown',
      commit: 'unknown',
      timestamp: new Date().toISOString(),
      version: '2.2.1'
    };
    
    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch (dbError) {
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
      } else {
        checks.secrets = 'missing_critical_secrets';
        throw new Error('Critical production secrets not configured');
      }
    } else {
      checks.environment = env.NODE_ENV;
      checks.secrets = 'development_mode';
    }
    
    // Get git commit info for deployment verification
    try {
      const { execSync } = require('child_process');
      checks.commit = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: process.cwd() }).trim().substring(0, 8);
    } catch (error) {
      checks.commit = 'git_unavailable';
    }
    
    res.json({ 
      status: 'ok',
      checks,
      deploymentTest: 'VERSION_CHECK_SYSTEM_v2.2.1'
    });
    
  } catch (error) {
    logger.error('Health check failed', error);
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
app.get('/ready', async (_req: express.Request, res: express.Response) => {
  try {
    // Check if app is ready to serve requests
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not_ready' });
  }
});

// Liveness check for Kubernetes/Docker deployments
app.get('/live', (_req: express.Request, res: express.Response) => {
  // Simple liveness check - if this endpoint responds, the app is alive
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Serve static files from public directory (for downloads, etc.)
app.use('/public', express.static('public'));

// Serve React app static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API Routes
app.use('/api/oauth', oauthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/deploy', deployInfoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);

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
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Global error handler
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', error);
  res.status(500).json({ 
    error: env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
  });
});

const port = env.PORT;

app.listen(port, () => {
  logger.info(`AsanaBridge server started on port ${port}`, {
    environment: env.NODE_ENV,
    port
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');  
  await prisma.$disconnect();
  process.exit(0);
});
