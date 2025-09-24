import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { loadEnv } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
import oauthRoutes from './routes/oauth';

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

// Health check
app.get('/health', async (_req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
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
import authRoutes from './routes/auth';
app.use('/api/auth', authRoutes);
import agentRoutes from './routes/agent';
app.use('/api/agent', agentRoutes);
import syncRoutes from './routes/sync';
app.use('/api/sync', syncRoutes);

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
