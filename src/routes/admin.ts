import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../services/auth';
import { logger } from '../config/logger';
import { prisma } from '../config/database';

const router = Router();

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// Get system overview/stats
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalSyncMappings,
      freeUsers,
      proUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.syncMapping.count(),
      prisma.user.count({ where: { plan: 'FREE' } }),
      prisma.user.count({ where: { plan: 'PRO' } })
    ]);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        totalSyncMappings,
        planDistribution: {
          free: freeUsers,
          pro: proUsers
        }
      }
    });

    logger.info('Admin accessed system stats', { adminId: req.user?.userId });
  } catch (error) {
    logger.error('Failed to fetch admin stats', error);
    res.status(500).json({ error: 'Failed to fetch system stats' });
  }
});

// Get all users with pagination
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { name: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          isAdmin: true,
          monthlyTasksUsed: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              syncMappings: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

    logger.info('Admin accessed user list', { 
      adminId: req.user?.userId, 
      page, 
      search: search || 'none' 
    });
  } catch (error) {
    logger.error('Failed to fetch users for admin', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get specific user details
router.get('/users/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        syncMappings: {
          select: {
            id: true,
            asanaProjectId: true,
            asanaProjectName: true,
            omnifocusProjectName: true,
            createdAt: true,
            lastSyncAt: true
          }
        },
        _count: {
          select: {
            syncLogs: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

    logger.info('Admin accessed user details', { 
      adminId: req.user?.userId, 
      targetUserId: userId 
    });
  } catch (error) {
    logger.error('Failed to fetch user details for admin', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Update user plan
router.patch('/users/:userId/plan', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { plan } = req.body;

    if (!['FREE', 'PRO'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be FREE or PRO' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { plan },
      select: {
        id: true,
        email: true,
        plan: true
      }
    });

    res.json({ 
      message: 'User plan updated successfully',
      user 
    });

    logger.info('Admin updated user plan', { 
      adminId: req.user?.userId, 
      targetUserId: userId,
      newPlan: plan
    });
  } catch (error) {
    logger.error('Failed to update user plan', error);
    res.status(500).json({ error: 'Failed to update user plan' });
  }
});

// Toggle user admin status
router.patch('/users/:userId/admin', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    // Prevent users from removing their own admin status
    if (userId === req.user?.userId && !isAdmin) {
      return res.status(400).json({ error: 'Cannot remove your own admin privileges' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isAdmin: Boolean(isAdmin) },
      select: {
        id: true,
        email: true,
        isAdmin: true
      }
    });

    res.json({ 
      message: 'User admin status updated successfully',
      user 
    });

    logger.info('Admin updated user admin status', { 
      adminId: req.user?.userId, 
      targetUserId: userId,
      newAdminStatus: isAdmin
    });
  } catch (error) {
    logger.error('Failed to update user admin status', error);
    res.status(500).json({ error: 'Failed to update user admin status' });
  }
});

export default router;