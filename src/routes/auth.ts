import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { generateToken, authenticateToken, AuthenticatedRequest } from '../services/auth';
import { logger } from '../config/logger';
import { prisma } from '../config/database';
import { z } from 'zod';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// User registration
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null
      },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        createdAt: true
      }
    });
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    logger.info('User registered successfully', { userId: user.id, email: user.email });
    
    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    
    logger.error('Registration error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    logger.info('User logged in successfully', { userId: user.id, email: user.email });
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        createdAt: user.createdAt
      },
      token
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    
    logger.error('Login error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
    
  } catch (error) {
    logger.error('Profile fetch error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.patch('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    logger.info('User profile updated', { userId: user.id });
    
    res.json({
      message: 'Profile updated successfully',
      user
    });
    
  } catch (error) {
    logger.error('Profile update error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;