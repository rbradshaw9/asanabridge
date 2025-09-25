import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import session from 'express-session';
import { loadEnv } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
// import { passport } from './config/passport'; // Temporarily disabled
import oauthRoutes from './routes/oauth';
import authRoutes from './routes/auth';
import agentRoutes from './routes/agent';
import syncRoutes from './routes/sync';
import downloadRoutes from './routes/download';
import deployInfoRoutes from './routes/deploy-info';

// Load environment variables first
dotenv.config();
const env = loadEnv();

const app = express();

// Middleware
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session middleware for passport
app.use(session({
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
    await prisma.$queryRaw`SELECT 1`;
    
    // Get git commit info for deployment verification
    let gitCommit = 'unknown';
    try {
      const { execSync } = require('child_process');
      gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: process.cwd() }).trim().substring(0, 8);
    } catch (error) {
      // Git info not available
    }
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      commit: gitCommit,
      deploymentTest: 'NEW_CODE_MARKER_v2'
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// Serve static files from public directory
app.use(express.static('public'));

// Root route serves the landing page
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API Routes
app.use('/api/oauth', oauthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/deploy', deployInfoRoutes);

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
