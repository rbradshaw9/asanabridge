import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { generateToken, authenticateToken, AuthenticatedRequest, AuthService } from '../services/auth';
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
        isAdmin: true,
        createdAt: true
      }
    });
    
    // Generate JWT token with full payload
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
      isAdmin: user.isAdmin
    });
    
    logger.info('User registered successfully', { userId: user.id, email: user.email, isAdmin: user.isAdmin });
    
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
    
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token with full payload
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
      isAdmin: user.isAdmin
    });
    
    logger.info('User logged in successfully', { userId: user.id, email: user.email, isAdmin: user.isAdmin });
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
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

// Update user password
router.patch('/password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.password) {
      return res.status(400).json({ error: 'No password set for this user' });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { password: hashedNewPassword }
    });
    
    logger.info('User password updated', { userId: user.id });
    
    res.json({
      message: 'Password updated successfully'
    });
    
  } catch (error) {
    logger.error('Password update error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// In-memory session storage for app authentication
const appSessions = new Map<string, { 
  id: string; 
  userId?: string; 
  token?: string; 
  authorized: boolean; 
  createdAt: Date 
}>();

// Clean up old sessions every hour
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [sessionId, session] of appSessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      appSessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);

// App authentication endpoints for macOS app
router.post('/app-session', async (req: Request, res: Response) => {
  try {
    // Generate a unique session ID
    const sessionId = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    
    // Store session
    appSessions.set(sessionId, {
      id: sessionId,
      authorized: false,
      createdAt: new Date()
    });
    
    // Return session info and auth URL (force HTTPS in production)
    const protocol = req.get('host')?.includes('asanabridge.com') ? 'https' : req.protocol;
    const authUrl = `${protocol}://${req.get('host')}/api/auth/app-login?session=${sessionId}`;
    
    res.json({
      sessionId,
      authUrl,
      message: 'Session created. Please complete authentication in browser.'
    });
    
  } catch (error) {
    logger.error('App session creation error', error);
    res.status(500).json({ error: 'Failed to create authentication session' });
  }
});

// Check session status (polling endpoint)
router.get('/app-session', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.session as string;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }
    
    const session = appSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    if (session.authorized && session.token) {
      // Clean up the session after successful auth
      appSessions.delete(sessionId);
      
      return res.json({
        authorized: true,
        token: session.token,
        message: 'Authentication successful!'
      });
    }
    
    res.json({
      authorized: false,
      message: 'Waiting for authorization...'
    });
    
  } catch (error) {
    logger.error('App session check error', error);
    res.status(500).json({ error: 'Failed to check session status' });
  }
});

// App login page and authorization handler
router.get('/app-login', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.session as string;
    
    if (!sessionId) {
      return res.status(400).send('Session ID required');
    }
    
    const session = appSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).send('Session not found or expired');
    }
    
    // If already authorized, show success
    if (session.authorized) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>AsanaBridge - Success</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .success { color: #4CAF50; font-size: 64px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅</div>
            <h1>Authentication Successful!</h1>
            <p>Your AsanaBridge app is now connected. You can close this window and return to the app.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Show login/authorization form
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connect AsanaBridge App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .logo { font-size: 48px; margin-bottom: 20px; }
          h1 { color: #333; margin-bottom: 20px; }
          p { color: #666; line-height: 1.5; margin-bottom: 30px; }
          .btn { background: #007AFF; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; }
          .btn:hover { background: #0056b3; }
          .step { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🔗</div>
          <h1>Connect AsanaBridge App</h1>
          <p>Authorize your macOS app to sync tasks between Asana and OmniFocus.</p>
          
          <div class="step">
            <strong>Step 1:</strong> Sign in to your AsanaBridge account
          </div>
          
          <div class="step">
            <strong>Step 2:</strong> Authorize the app connection
          </div>
          
          <div class="step">
            <strong>Step 3:</strong> Return to your app
          </div>
          
          <button class="btn" onclick="authorize()">Connect App</button>
        </div>
        
        <script>
          async function authorize() {
            try {
              // For now, we'll simulate authorization
              // In a real implementation, you'd check authentication status first
              const response = await fetch('/api/auth/app-authorize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: '${sessionId}' })
              });
              
              if (response.ok) {
                location.reload();
              } else {
                alert('Authorization failed. Please try again.');
              }
            } catch (error) {
              alert('Connection error. Please try again.');
            }
          }
        </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    logger.error('App login page error', error);
    res.status(500).send('Internal server error');
  }
});

// Handle authorization (called from the login page)
router.post('/app-authorize', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }
    
    const session = appSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    // For now, generate a demo token
    // In a real implementation, you'd verify the user's authentication
    const token = 'demo_token_' + Math.random().toString(36).substring(2, 15);
    
    // Update session with authorization
    session.authorized = true;
    session.token = token;
    session.userId = 'demo_user';
    
    appSessions.set(sessionId, session);
    
    res.json({ 
      success: true, 
      message: 'Authorization successful' 
    });
    
  } catch (error) {
    logger.error('App authorization error', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
});

export default router;