import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  APP_VERSION,
  MIN_SUPPORTED_VERSION,
  VERSION_CHANGELOG,
  APP_SESSION_TTL_MS,
  DMG_FILENAME_LATEST,
} from '@asanabridge/shared';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  authenticateToken,
  AuthenticatedRequest,
} from '../services/auth';
import { prisma } from '../config/database';
import { authLogger } from '../config/logger';
import { loadEnv } from '../config/env';

const router = Router();

// ─── Register ─────────────────────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name: name ?? null },
      select: { id: true, email: true, name: true, plan: true, isAdmin: true, createdAt: true },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
      isAdmin: user.isAdmin,
    });

    authLogger.info('User registered', { userId: user.id });
    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    authLogger.error('Registration error', { error: (err as Error).message });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { valid, newHash } = await verifyPassword(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Transparently upgrade legacy pbkdf2 hashes to bcrypt
    const updateData: Record<string, unknown> = { lastLoginAt: new Date() };
    if (newHash) {
      updateData.password = newHash;
      authLogger.info('Upgraded password hash from pbkdf2 to bcrypt', { userId: user.id });
    }
    await prisma.user.update({ where: { id: user.id }, data: updateData });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
      isAdmin: user.isAdmin,
    });

    authLogger.info('User logged in', { userId: user.id });
    res.json({
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan, isAdmin: user.isAdmin },
      token,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    authLogger.error('Login error', { error: (err as Error).message });
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Current User ─────────────────────────────────────────────────────────────

router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, plan: true, isAdmin: true, lastLoginAt: true, createdAt: true, updatedAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    authLogger.error('Get user error', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── Update Profile ───────────────────────────────────────────────────────────

router.patch('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { name },
      select: { id: true, email: true, name: true, plan: true, isAdmin: true },
    });

    res.json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─── Change Password ──────────────────────────────────────────────────────────

router.patch('/password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, password: true },
    });

    if (!user?.password) {
      return res.status(400).json({ error: 'No password set on this account' });
    }

    const { valid } = await verifyPassword(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { password: newHash } });

    authLogger.info('Password changed', { userId: user.id });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ─── macOS App Session (DB-backed, replaces in-memory Map) ────────────────────

/**
 * Step 1: macOS app creates a pending session and gets a session ID.
 *         It then opens the browser to /api/auth/app-login?session=<id>
 */
router.post('/app-session', async (req: Request, res: Response) => {
  try {
    const expiresAt = new Date(Date.now() + APP_SESSION_TTL_MS);
    const session = await prisma.appSession.create({
      data: { status: 'PENDING', expiresAt },
    });

    const env = loadEnv();
    const loginUrl = `${env.FRONTEND_URL}/app-auth?session=${session.id}`;
    res.json({ sessionId: session.id, loginUrl });
  } catch (err) {
    authLogger.error('App session create error', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * Step 2: macOS app polls this until status becomes 'authorized'.
 */
router.get('/app-session', async (req: Request, res: Response) => {
  try {
    const { session: sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'session parameter required' });
    }

    // Clean up expired sessions lazily
    await prisma.appSession.deleteMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
    });

    const session = await prisma.appSession.findUnique({ where: { id: sessionId } });

    if (!session || session.status === 'EXPIRED') {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    if (session.status === 'AUTHORIZED' && session.token) {
      // Clean up after token is picked up
      await prisma.appSession.delete({ where: { id: sessionId } });
      return res.json({ authorized: true, token: session.token });
    }

    res.json({ authorized: false });
  } catch (err) {
    authLogger.error('App session poll error', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to check session' });
  }
});

/**
 * Step 3: Browser calls this after the user logs in to authorize the session.
 *         Used by the /app-auth frontend page.
 */
router.post('/app-authorize', async (req: Request, res: Response) => {
  try {
    const sessionSchema = z.object({
      sessionId: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(1),
    });
    const { sessionId, email, password } = sessionSchema.parse(req.body);

    const session = await prisma.appSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'PENDING' || session.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Session invalid or expired' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { valid, newHash } = await verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (newHash) {
      await prisma.user.update({ where: { id: user.id }, data: { password: newHash } });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
      isAdmin: user.isAdmin,
    });

    await prisma.appSession.update({
      where: { id: sessionId },
      data: { status: 'AUTHORIZED', token, userId: user.id },
    });

    authLogger.info('App session authorized', { userId: user.id, sessionId });
    res.json({ message: 'Authorized successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Authorization failed' });
  }
});

/**
 * Direct login for macOS app (no browser flow needed).
 */
router.post('/app-login-direct', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { valid, newHash } = await verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const updateData: Record<string, unknown> = { lastLoginAt: new Date() };
    if (newHash) updateData.password = newHash;
    await prisma.user.update({ where: { id: user.id }, data: updateData });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
      isAdmin: user.isAdmin,
    });

    authLogger.info('App direct login', { userId: user.id });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Version Check ────────────────────────────────────────────────────────────

router.get('/app/version-check', (req: Request, res: Response) => {
  const { version } = req.query;
  const env = loadEnv();

  const downloadUrl = env.DOWNLOAD_BASE_URL
    ? `${env.DOWNLOAD_BASE_URL}/${DMG_FILENAME_LATEST}`
    : `${env.BACKEND_URL}/api/auth/app/download/latest`;

  const needsUpdate = version
    ? isVersionLower(version as string, APP_VERSION)
    : false;

  const requiresUpdate = version
    ? isVersionLower(version as string, MIN_SUPPORTED_VERSION)
    : false;

  res.json({
    currentVersion: APP_VERSION,
    minimumVersion: MIN_SUPPORTED_VERSION,
    downloadUrl,
    needsUpdate,
    requiresUpdate,
    changelog: VERSION_CHANGELOG[APP_VERSION] ?? [],
  });
});

// ─── Public DMG Download (redirect to R2) ────────────────────────────────────

router.get('/app/download/latest', (req: Request, res: Response) => {
  const env = loadEnv();

  if (!env.DOWNLOAD_BASE_URL) {
    return res.status(503).json({ error: 'Downloads not configured' });
  }

  const url = `${env.DOWNLOAD_BASE_URL}/${DMG_FILENAME_LATEST}`;
  res.redirect(302, url);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isVersionLower(a: string, b: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [aMaj, aMin, aPatch] = parse(a);
  const [bMaj, bMin, bPatch] = parse(b);
  if (aMaj !== bMaj) return aMaj < bMaj;
  if (aMin !== bMin) return aMin < bMin;
  return (aPatch ?? 0) < (bPatch ?? 0);
}

export default router;
