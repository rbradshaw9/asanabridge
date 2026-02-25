import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { JWTPayload, UserPlan } from '@asanabridge/shared';
import { loadEnv } from '../config/env';
import { authLogger } from '../config/logger';

const BCRYPT_ROUNDS = 12;

// ─── Password Hashing ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a stored hash.
 * Supports both bcrypt (new) and legacy pbkdf2 (old: "salt:hash" format).
 * If the legacy format is detected and the password matches, returns the new
 * bcrypt hash so the caller can transparently upgrade the stored hash.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; newHash?: string }> {
  // Detect legacy pbkdf2 format: "hexSalt:hexHash"
  if (storedHash.includes(':') && !storedHash.startsWith('$2b$')) {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      .toString('hex');
    if (verifyHash === hash) {
      // Password valid — upgrade to bcrypt transparently
      const newHash = await hashPassword(password);
      return { valid: true, newHash };
    }
    return { valid: false };
  }

  // Standard bcrypt verification
  const valid = await bcrypt.compare(password, storedHash);
  return { valid };
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

export function generateToken(payload: JWTPayload): string {
  const env = loadEnv();
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
}

export function verifyToken(token: string): JWTPayload {
  const env = loadEnv();
  return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    authLogger.debug('Token verification failed', { error: (err as Error).message });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

/**
 * Dual-mode agent authentication:
 * - If the Authorization header contains a JWT (has dots), verify it.
 * - Otherwise treat the header value as an agent key and look it up in the DB.
 */
export async function authenticateAgent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // JWT path: modern macOS app sends JWT
  if (token.includes('.')) {
    try {
      req.user = verifyToken(token);
      next();
      return;
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  }

  // Agent key path: look up in DB
  try {
    const { prisma } = await import('../config/database');
    const setup = await prisma.omniFocusSetup.findUnique({
      where: { agentKey: token },
      include: { user: { select: { id: true, email: true, plan: true, isAdmin: true } } },
    });

    if (!setup) {
      res.status(401).json({ error: 'Invalid agent key' });
      return;
    }

    req.user = {
      userId: setup.user.id,
      email: setup.user.email,
      plan: setup.user.plan as UserPlan,
      isAdmin: setup.user.isAdmin,
    };
    next();
  } catch (err) {
    authLogger.error('Agent key lookup failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Authentication error' });
  }
}

// ─── Agent Key ────────────────────────────────────────────────────────────────

export function generateAgentKey(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 hex chars
}
