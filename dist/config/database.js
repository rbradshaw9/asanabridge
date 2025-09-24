"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
// Prevent multiple instances in development (hot reload)
const prisma = globalThis.__prisma || new client_1.PrismaClient({
    log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
    ],
});
exports.prisma = prisma;
if (process.env.NODE_ENV === 'development') {
    globalThis.__prisma = prisma;
}
// Log slow queries in development
if (process.env.NODE_ENV === 'development') {
    logger_1.logger.info('Database logging enabled in development mode');
    // Note: Query logging disabled due to TypeScript compatibility issues
    // Re-enable when upgrading to Prisma v5 with proper type support
}
