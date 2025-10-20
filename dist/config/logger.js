"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.dbLogger = exports.apiLogger = exports.syncLogger = exports.agentLogger = exports.authLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const nodeEnv = process.env.NODE_ENV || 'development';
// Ensure logs directory exists
const logsDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
// Custom format for better readability
const customFormat = winston_1.default.format.printf(({ level, message, timestamp, service, module, userId, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    const moduleStr = module ? `[${module}]` : '';
    const userStr = userId ? `[user:${userId}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${moduleStr}${userStr} ${message} ${metaStr}`;
});
const logger = winston_1.default.createLogger({
    level: nodeEnv === 'production' ? 'info' : 'debug',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json()),
    defaultMeta: { service: 'asanabridge' },
    transports: [
        new winston_1.default.transports.Console({
            format: nodeEnv === 'production'
                ? winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.colorize(), customFormat)
                : winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.colorize(), customFormat)
        })
    ]
});
exports.logger = logger;
// Add comprehensive file logging
logger.add(new winston_1.default.transports.File({
    filename: path_1.default.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true
}));
logger.add(new winston_1.default.transports.File({
    filename: path_1.default.join(logsDir, 'combined.log'),
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    tailable: true
}));
// Module-specific logging for better troubleshooting
logger.add(new winston_1.default.transports.File({
    filename: path_1.default.join(logsDir, 'auth.log'),
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    maxsize: 5 * 1024 * 1024,
    maxFiles: 3
}));
logger.add(new winston_1.default.transports.File({
    filename: path_1.default.join(logsDir, 'agent.log'),
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    maxsize: 5 * 1024 * 1024,
    maxFiles: 3
}));
logger.add(new winston_1.default.transports.File({
    filename: path_1.default.join(logsDir, 'sync.log'),
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    maxsize: 5 * 1024 * 1024,
    maxFiles: 3
}));
// Helper functions for module-specific logging
exports.authLogger = logger.child({ module: 'AUTH' });
exports.agentLogger = logger.child({ module: 'AGENT' });
exports.syncLogger = logger.child({ module: 'SYNC' });
exports.apiLogger = logger.child({ module: 'API' });
exports.dbLogger = logger.child({ module: 'DATABASE' });
