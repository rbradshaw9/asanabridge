import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { loadEnv } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';

import authRouter from './routes/auth';
import oauthRouter from './routes/oauth';
import syncRouter from './routes/sync';
import agentRouter from './routes/agent';
import adminRouter from './routes/admin';
import supportRouter from './routes/support';

const config = loadEnv();
const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(helmet());
app.set('trust proxy', 1);

// ─── CORS ─────────────────────────────────────────────────────────────────────

const allowedOrigins = [
  config.FRONTEND_URL,
  'https://asanabridge.com',
  'https://www.asanabridge.com',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (native app, curl, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
});

const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Agent rate limit exceeded.' },
});

app.use('/api/', defaultLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/agent', agentLimiter);

// ─── Body Parser ──────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Request Logging ──────────────────────────────────────────────────────────

app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/oauth', oauthRouter);
app.use('/api/sync', syncRouter);
app.use('/api/agent', agentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/support', supportRouter);

// ─── Health / Readiness ───────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'not ready', db: 'disconnected' });
  }
});

app.get('/live', (_req, res) => {
  res.json({ status: 'alive' });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3001;

const server = app.listen(PORT, () => {
  logger.info(`API server listening on port ${PORT}`, { env: config.NODE_ENV });
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed and DB disconnected.');
    process.exit(0);
  });

  // Force exit after 10 s
  setTimeout(() => {
    logger.warn('Forcing shutdown after timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
