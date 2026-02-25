import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../services/auth';
import { prisma } from '../config/database';

const router = Router();

// All admin routes require JWT + admin flag
router.use(authenticateToken, requireAdmin);

// ─── Users ────────────────────────────────────────────────────────────────────

router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = String(req.query.search || '');
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { syncMappings: true, syncLogs: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
        syncMappings: {
          where: { isActive: true },
          select: { id: true, asanaProjectName: true, ofProjectName: true, lastSyncAt: true },
        },
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, status: true, itemsSynced: true, createdAt: true },
        },
        omniFocusSetup: {
          select: { isActive: true, version: true, updatedAt: true },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/users/:userId/plan', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plan } = z.object({ plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']) }).parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { plan },
      select: { id: true, email: true, plan: true },
    });
    res.json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

router.patch('/users/:userId/admin', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { isAdmin } = z.object({ isAdmin: z.boolean() }).parse(req.body);

    // Prevent self-demotion
    if (req.params.userId === req.user!.userId && !isAdmin) {
      return res.status(400).json({ error: 'Cannot remove your own admin status' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { isAdmin },
      select: { id: true, email: true, isAdmin: true },
    });
    res.json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to update admin status' });
  }
});

router.delete('/users/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.params.userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await prisma.user.delete({ where: { id: req.params.userId } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─── Overview Stats ───────────────────────────────────────────────────────────

router.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      proUsers,
      enterpriseUsers,
      activeMappings,
      syncsToday,
      syncs7d,
      supportOpen,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { plan: 'PRO' } }),
      prisma.user.count({ where: { plan: 'ENTERPRISE' } }),
      prisma.syncMapping.count({ where: { isActive: true } }),
      prisma.syncLog.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.syncLog.count({ where: { createdAt: { gte: start7d } } }),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ]);

    res.json({
      users: { total: totalUsers, pro: proUsers, enterprise: enterpriseUsers, free: totalUsers - proUsers - enterpriseUsers },
      sync: { activeMappings, today: syncsToday, last7Days: syncs7d },
      support: { openTickets: supportOpen },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── Support Tickets (admin view) ─────────────────────────────────────────────

router.get('/support', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string | undefined;
    const skip = (page - 1) * limit;

    const where = status ? { status: status as never } : {};

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true, plan: true } },
          responses: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, name: true, isAdmin: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    res.json({ tickets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.patch('/support/:ticketId/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = z
      .object({ status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']) })
      .parse(req.body);

    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.ticketId },
      data: { status },
    });
    res.json({ ticket });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

router.post('/support/:ticketId/respond', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { body } = z.object({ body: z.string().min(1).max(5000) }).parse(req.body);

    const response = await prisma.supportResponse.create({
      data: {
        ticketId: req.params.ticketId,
        authorId: req.user!.userId,
        body,
        isAdminResponse: true,
      },
      include: { author: { select: { id: true, name: true, isAdmin: true } } },
    });

    // Move ticket to IN_PROGRESS if it was OPEN
    await prisma.supportTicket.updateMany({
      where: { id: req.params.ticketId, status: 'OPEN' },
      data: { status: 'IN_PROGRESS' },
    });

    res.status(201).json({ response });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to post response' });
  }
});

export default router;
