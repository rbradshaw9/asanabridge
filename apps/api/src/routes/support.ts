import { Router, Response } from 'express';
import { z } from 'zod';
import { createSupportTicketSchema } from '@asanabridge/shared';
import { authenticateToken, AuthenticatedRequest } from '../services/auth';
import { prisma } from '../config/database';

const router = Router();

router.use(authenticateToken);

// ─── Create Ticket ────────────────────────────────────────────────────────────

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createSupportTicketSchema.parse(req.body);

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user!.userId,
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        category: data.category,
        priority: data.priority ?? 'NORMAL',
        status: 'OPEN',
      },
    });
    res.status(201).json({ ticket });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// ─── List Own Tickets ─────────────────────────────────────────────────────────

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user!.userId },
      include: {
        responses: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ─── Get One Ticket ───────────────────────────────────────────────────────────

router.get('/:ticketId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.ticketId, userId: req.user!.userId },
      include: {
        responses: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// ─── Reply to Ticket ──────────────────────────────────────────────────────────

router.post('/:ticketId/reply', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { body } = z.object({ body: z.string().min(1).max(5000) }).parse(req.body);

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.ticketId, userId: req.user!.userId },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.status === 'CLOSED') {
      return res.status(400).json({ error: 'Cannot reply to a closed ticket' });
    }

    const response = await prisma.supportTicketResponse.create({
      data: {
        ticketId: req.params.ticketId,
        message: body,
        isFromUser: true,
      },
    });

    // Reopen if waiting
    if (ticket.status === 'WAITING') {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: 'OPEN' },
      });
    }

    res.status(201).json({ response });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to post reply' });
  }
});

// ─── Close Ticket ─────────────────────────────────────────────────────────────

router.patch('/:ticketId/close', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.ticketId, userId: req.user!.userId },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED' },
    });
    res.json({ ticket: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

export default router;
