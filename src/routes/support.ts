import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../services/auth';
import { logger } from '../config/logger';
import { prisma } from '../config/database';
import { z } from 'zod';

const router = Router();

// Support ticket schema
const supportTicketSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  subject: z.string().min(1, 'Subject is required'),
  category: z.enum(['general', 'technical', 'billing', 'feature', 'bug']),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
});

// Create support ticket
router.post('/ticket', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketData = supportTicketSchema.parse(req.body);
    
    // Create support ticket in database
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user!.userId,
        name: ticketData.name,
        email: ticketData.email,
        subject: ticketData.subject,
        category: ticketData.category,
        message: ticketData.message,
        priority: ticketData.priority,
        status: 'open'
      }
    });

    // Send notification email (in a real implementation)
    // await sendSupportNotificationEmail(ticket);
    
    logger.info('Support ticket created', { 
      ticketId: ticket.id, 
      userId: req.user!.userId,
      category: ticketData.category,
      priority: ticketData.priority
    });

    res.status(201).json({
      message: 'Support ticket created successfully',
      ticketId: ticket.id
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }

    logger.error('Failed to create support ticket', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

// Get user's support tickets
router.get('/tickets', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        category: true,
        priority: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ tickets });

  } catch (error) {
    logger.error('Failed to fetch support tickets', error);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

// Get specific support ticket
router.get('/tickets/:ticketId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = req.params.ticketId;
    
    const ticket = await prisma.supportTicket.findFirst({
      where: { 
        id: ticketId,
        userId: req.user!.userId 
      },
      include: {
        responses: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    res.json({ ticket });

  } catch (error) {
    logger.error('Failed to fetch support ticket', error);
    res.status(500).json({ error: 'Failed to fetch support ticket' });
  }
});

// Add response to support ticket
router.post('/tickets/:ticketId/response', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = req.params.ticketId;
    const { message } = req.body;

    if (!message || message.trim().length < 1) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify ticket ownership
    const ticket = await prisma.supportTicket.findFirst({
      where: { 
        id: ticketId,
        userId: req.user!.userId 
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // Add response
    const response = await prisma.supportTicketResponse.create({
      data: {
        ticketId,
        message: message.trim(),
        isFromUser: true
      }
    });

    // Update ticket status if it was closed
    if (ticket.status === 'closed') {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'open' }
      });
    }

    logger.info('Support ticket response added', { 
      ticketId, 
      responseId: response.id,
      userId: req.user!.userId
    });

    res.status(201).json({
      message: 'Response added successfully',
      responseId: response.id
    });

  } catch (error) {
    logger.error('Failed to add support ticket response', error);
    res.status(500).json({ error: 'Failed to add response' });
  }
});

export default router;