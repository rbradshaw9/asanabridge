import winston from 'winston';
import path from 'path';
import fs from 'fs';

const nodeEnv = process.env.NODE_ENV || 'development';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for better readability
const customFormat = winston.format.printf(({ level, message, timestamp, service, module, userId, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  const moduleStr = module ? `[${module}]` : '';
  const userStr = userId ? `[user:${userId}]` : '';
  return `${timestamp} ${level.toUpperCase()} ${moduleStr}${userStr} ${message} ${metaStr}`;
});

const logger = winston.createLogger({
  level: nodeEnv === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'asanabridge' },
  transports: [
    new winston.transports.Console({
      format: nodeEnv === 'production' 
        ? winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize(),
            customFormat
          )
        : winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize(),
            customFormat
          )
    })
  ]
});

// Add comprehensive file logging
logger.add(new winston.transports.File({
  filename: path.join(logsDir, 'error.log'),
  level: 'error',
  maxsize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  tailable: true
}));

logger.add(new winston.transports.File({
  filename: path.join(logsDir, 'combined.log'),
  maxsize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  tailable: true
}));

// Module-specific logging for better troubleshooting
logger.add(new winston.transports.File({
  filename: path.join(logsDir, 'auth.log'),
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  maxsize: 5 * 1024 * 1024,
  maxFiles: 3
}));

logger.add(new winston.transports.File({
  filename: path.join(logsDir, 'agent.log'),
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  maxsize: 5 * 1024 * 1024,
  maxFiles: 3
}));

logger.add(new winston.transports.File({
  filename: path.join(logsDir, 'sync.log'),
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  maxsize: 5 * 1024 * 1024,
  maxFiles: 3
}));

// Helper functions for module-specific logging
export const authLogger = logger.child({ module: 'AUTH' });
export const agentLogger = logger.child({ module: 'AGENT' });
export const syncLogger = logger.child({ module: 'SYNC' });
export const apiLogger = logger.child({ module: 'API' });
export const dbLogger = logger.child({ module: 'DATABASE' });

export { logger };