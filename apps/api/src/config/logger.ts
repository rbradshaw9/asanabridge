import winston from 'winston';

const isDevelopment = process.env.NODE_ENV !== 'production';

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, module: mod, ...meta }) => {
    const moduleStr = mod ? `[${mod}] ` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${moduleStr}${message}${metaStr}`;
  })
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console-only logging — Railway captures stdout/stderr automatically
export const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: isDevelopment ? devFormat : prodFormat,
  defaultMeta: { service: 'asanabridge-api' },
  transports: [new winston.transports.Console()],
});

// Module-scoped child loggers for context
export const authLogger = logger.child({ module: 'AUTH' });
export const agentLogger = logger.child({ module: 'AGENT' });
export const syncLogger = logger.child({ module: 'SYNC' });
export const oauthLogger = logger.child({ module: 'OAUTH' });
