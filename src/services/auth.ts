import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';

export interface JWTPayload {
  userId: string;
  email: string;
  plan: string;
  isAdmin?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload | any; // Allow both JWTPayload and User objects
}

export class AuthService {
  // Using Node.js built-in crypto for password hashing (temporary until bcrypt works)
  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as SignOptions);
  }

  static verifyToken(token: string): JWTPayload {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  }
}

// Export convenience functions
export const generateToken = (userId: string): string => {
  // For now, just include userId - we can expand the payload later
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, env.JWT_SECRET);
};

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const payload = AuthService.verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    logger.warn('Invalid token attempt', { token: token.substring(0, 20) + '...' });
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requirePlan(plan: 'FREE' | 'PRO') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (plan === 'PRO' && req.user.plan !== 'PRO') {
      return res.status(403).json({ error: 'Pro plan required' });
    }

    next();
  };
}

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !req.user.isAdmin) {
    logger.warn('Admin access attempt by non-admin user', { userId: req.user?.userId });
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};