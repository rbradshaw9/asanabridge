"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.verifyToken = exports.generateToken = exports.AuthService = void 0;
exports.authenticateToken = authenticateToken;
exports.requirePlan = requirePlan;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const env = (0, env_1.loadEnv)();
class AuthService {
    // Using Node.js built-in crypto for password hashing (temporary until bcrypt works)
    static async hashPassword(password) {
        const salt = crypto_1.default.randomBytes(16).toString('hex');
        const hash = crypto_1.default.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }
    static async verifyPassword(password, storedHash) {
        const [salt, hash] = storedHash.split(':');
        const verifyHash = crypto_1.default.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }
    static generateToken(payload) {
        return jsonwebtoken_1.default.sign(payload, env.JWT_SECRET, {
            expiresIn: env.JWT_EXPIRES_IN,
        });
    }
    static verifyToken(token) {
        return jsonwebtoken_1.default.verify(token, env.JWT_SECRET);
    }
}
exports.AuthService = AuthService;
// Export convenience functions
const generateToken = (userId) => {
    // For now, just include userId - we can expand the payload later
    return jsonwebtoken_1.default.sign({ userId }, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
    });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, env.JWT_SECRET);
};
exports.verifyToken = verifyToken;
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const payload = AuthService.verifyToken(token);
        req.user = payload;
        next();
    }
    catch (error) {
        logger_1.logger.warn('Invalid token attempt', { token: token.substring(0, 20) + '...' });
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}
function requirePlan(plan) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (plan === 'PRO' && req.user.plan !== 'PRO') {
            return res.status(403).json({ error: 'Pro plan required' });
        }
        next();
    };
}
const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        logger_1.logger.warn('Admin access attempt by non-admin user', { userId: req.user?.userId });
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
