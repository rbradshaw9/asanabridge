"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../services/auth");
const logger_1 = require("../config/logger");
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const zod_1 = require("zod");
const env = (0, env_1.loadEnv)();
const router = (0, express_1.Router)();
// Validation schemas
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    name: zod_1.z.string().min(1, 'Name is required').optional()
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required')
});
// User registration
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = registerSchema.parse(req.body);
        // Check if user already exists
        const existingUser = await database_1.prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        // Hash password
        const hashedPassword = await auth_1.AuthService.hashPassword(password);
        // Create user
        const user = await database_1.prisma.user.create({
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
        const token = auth_1.AuthService.generateToken({
            userId: user.id,
            email: user.email,
            plan: user.plan,
            isAdmin: user.isAdmin
        });
        logger_1.logger.info('User registered successfully', { userId: user.id, email: user.email, isAdmin: user.isAdmin });
        res.status(201).json({
            message: 'User registered successfully',
            user,
            token
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
        }
        logger_1.logger.error('Registration error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// User login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        // Find user by email
        const user = await database_1.prisma.user.findUnique({
            where: { email }
        });
        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Check password
        const isValidPassword = await auth_1.AuthService.verifyPassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Generate JWT token with full payload
        const token = auth_1.AuthService.generateToken({
            userId: user.id,
            email: user.email,
            plan: user.plan,
            isAdmin: user.isAdmin
        });
        logger_1.logger.info('User logged in successfully', { userId: user.id, email: user.email, isAdmin: user.isAdmin });
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
        }
        logger_1.logger.error('Login error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get current user profile
router.get('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = await database_1.prisma.user.findUnique({
            where: { id: req.user.userId },
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
    }
    catch (error) {
        logger_1.logger.error('Profile fetch error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update user profile
router.patch('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const user = await database_1.prisma.user.update({
            where: { id: req.user.userId },
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
        logger_1.logger.info('User profile updated', { userId: user.id });
        res.json({
            message: 'Profile updated successfully',
            user
        });
    }
    catch (error) {
        logger_1.logger.error('Profile update error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update user password
router.patch('/password', auth_1.authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        // Get current user
        const user = await database_1.prisma.user.findUnique({
            where: { id: req.user.userId }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!user.password) {
            return res.status(400).json({ error: 'No password set for this user' });
        }
        // Verify current password
        const isCurrentPasswordValid = await auth_1.AuthService.verifyPassword(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        // Hash new password
        const hashedNewPassword = await auth_1.AuthService.hashPassword(newPassword);
        // Update password
        await database_1.prisma.user.update({
            where: { id: req.user.userId },
            data: { password: hashedNewPassword }
        });
        logger_1.logger.info('User password updated', { userId: user.id });
        res.json({
            message: 'Password updated successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Password update error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// In-memory session storage for app authentication
const appSessions = new Map();
// Rate limiting for app sessions (per IP)
const sessionAttempts = new Map();
// Clean up old sessions and rate limit data every hour
setInterval(() => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // Extended to 2 hours
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    // Clean up old sessions (keep them for 2 hours instead of 1)
    for (const [sessionId, session] of appSessions.entries()) {
        if (session.createdAt < twoHoursAgo) {
            appSessions.delete(sessionId);
        }
    }
    // Clean up old rate limit data
    for (const [ip, data] of sessionAttempts.entries()) {
        if (data.lastAttempt < oneHourAgo) {
            sessionAttempts.delete(ip);
        }
    }
}, 60 * 60 * 1000);
// App authentication endpoints for macOS app
router.post('/app-session', async (req, res) => {
    try {
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        // More lenient rate limiting: max 50 session creation attempts per hour per IP
        // This allows for multiple browsers, retries, and legitimate usage
        const attempts = sessionAttempts.get(clientIP);
        const now = new Date();
        if (attempts) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            if (attempts.lastAttempt > oneHourAgo && attempts.count >= 50) {
                return res.status(429).json({
                    error: 'Too many session creation attempts. Please try again later.'
                });
            }
            if (attempts.lastAttempt > oneHourAgo) {
                attempts.count += 1;
                attempts.lastAttempt = now;
            }
            else {
                attempts.count = 1;
                attempts.lastAttempt = now;
            }
        }
        else {
            sessionAttempts.set(clientIP, { count: 1, lastAttempt: now });
        }
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
    }
    catch (error) {
        logger_1.logger.error('App session creation error', error);
        res.status(500).json({ error: 'Failed to create authentication session' });
    }
});
// Check session status (polling endpoint)
router.get('/app-session', async (req, res) => {
    try {
        const sessionId = req.query.session;
        if (!sessionId || typeof sessionId !== 'string') {
            return res.status(400).json({ error: 'Session ID required' });
        }
        // Validate session ID format (alphanumeric only, reasonable length)
        if (!/^[a-zA-Z0-9]{10,50}$/.test(sessionId)) {
            return res.status(400).json({ error: 'Invalid session ID format' });
        }
        const session = appSessions.get(sessionId);
        if (!session) {
            logger_1.logger.warn('Session polling failed - session not found', { sessionId, totalSessions: appSessions.size });
            return res.status(404).json({ error: 'Session not found or expired. Please restart the connection process.' });
        }
        if (session.authorized && session.token) {
            // Don't clean up immediately - let the app fetch the token first
            logger_1.logger.info('Session authorized, returning token', { sessionId, userId: session.userId });
            // Mark for cleanup after a delay
            setTimeout(() => {
                appSessions.delete(sessionId);
                logger_1.logger.info('Session cleaned up after successful auth', { sessionId });
            }, 30000); // 30 seconds delay
            return res.json({
                authorized: true,
                token: session.token,
                message: 'Authentication successful!'
            });
        }
        res.json({
            authorized: false,
            message: 'Waiting for authorization...',
            sessionAge: Math.floor((Date.now() - session.createdAt.getTime()) / 1000) // Age in seconds for debugging
        });
    }
    catch (error) {
        logger_1.logger.error('App session check error', error);
        res.status(500).json({ error: 'Failed to check session status' });
    }
});
// Token validation endpoint for desktop app
router.get('/validate', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No valid authorization header' });
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        if (!token || token.length < 10) {
            return res.status(401).json({ error: 'Invalid token format' });
        }
        // Verify JWT token
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env.JWT_SECRET);
            // Check if user still exists
            const user = await database_1.prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true }
            });
            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }
            res.json({ valid: true, userId: user.id, email: user.email });
        }
        catch (jwtError) {
            logger_1.logger.warn('Invalid JWT token provided', { error: jwtError });
            res.status(401).json({ error: 'Invalid or expired token' });
        }
    }
    catch (error) {
        logger_1.logger.error('Token validation error', error);
        res.status(500).json({ error: 'Token validation failed' });
    }
});
// App login page and authorization handler
router.get('/app-login', async (req, res) => {
    try {
        const sessionId = req.query.session;
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
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="font-size: 14px; color: #666;">Or login with your credentials:</p>
            <input type="email" id="email" placeholder="Email" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px;">
            <input type="password" id="password" placeholder="Password" style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 5px;">
            <button class="btn" onclick="loginAndAuthorize()" style="width: 100%;">Login & Connect</button>
          </div>
        </div>
        
        <script>
          console.log('Authorization page loaded for session: ${sessionId}');
          
          async function authorize() {
            console.log('Starting authorization for session: ${sessionId}');
            try {
              const response = await fetch('/api/auth/app-authorize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: '${sessionId}' })
              });
              
              console.log('Authorization response status:', response.status);
              
              if (response.ok) {
                console.log('Authorization successful, reloading page');
                location.reload();
              } else {
                const error = await response.json();
                console.error('Authorization failed:', error);
                alert('Authorization failed: ' + (error.error || 'Unknown error'));
              }
            } catch (error) {
              console.error('Authorization connection error:', error);
              alert('Connection error. Please try again. If the problem persists, restart the connection in your app.');
            }
          }
          
          async function loginAndAuthorize() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
              alert('Please enter both email and password.');
              return;
            }
            
            console.log('Starting login and authorization for:', email);
            
            try {
              const response = await fetch('/api/auth/app-authorize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  sessionId: '${sessionId}',
                  email: email,
                  password: password
                })
              });
              
              console.log('Login response status:', response.status);
              
              if (response.ok) {
                console.log('Login successful, reloading page');
                location.reload();
              } else {
                const error = await response.json();
                console.error('Login failed:', error);
                alert('Login failed: ' + (error.error || 'Unknown error'));
              }
            } catch (error) {
              console.error('Login connection error:', error);
              alert('Connection error. Please try again. If the problem persists, restart the connection in your app.');
            }
          }
        </script>
      </body>
      </html>
    `);
    }
    catch (error) {
        logger_1.logger.error('App login page error', error);
        res.status(500).send('Internal server error');
    }
});
// Handle authorization (called from the login page)
router.post('/app-authorize', async (req, res) => {
    try {
        const { sessionId, email, password } = req.body;
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID required' });
        }
        const session = appSessions.get(sessionId);
        if (!session) {
            logger_1.logger.warn('Session not found for authorization', { sessionId, availableSessions: Array.from(appSessions.keys()) });
            return res.status(404).json({ error: 'Session not found or expired. Please restart the connection process in your app.' });
        }
        // If credentials provided, authenticate the user
        if (email && password) {
            // Find user by email
            const user = await database_1.prisma.user.findUnique({
                where: { email }
            });
            if (!user || !user.password) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            // Check password
            const isValidPassword = await auth_1.AuthService.verifyPassword(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            // Generate real JWT token
            const token = auth_1.AuthService.generateToken({
                userId: user.id,
                email: user.email,
                plan: user.plan,
                isAdmin: user.isAdmin
            });
            // Update session with authorization
            session.authorized = true;
            session.token = token;
            session.userId = user.id;
            appSessions.set(sessionId, session);
            res.json({
                success: true,
                message: 'Authorization successful'
            });
        }
        else {
            // Simple authorization without credentials (for now, use a default user)
            // This should be improved to require actual login
            const defaultUser = await database_1.prisma.user.findFirst({
                where: { email: 'ryan@ignitiongo.com' }
            });
            if (!defaultUser) {
                return res.status(404).json({ error: 'Default user not found' });
            }
            // Generate real JWT token for default user
            const token = auth_1.AuthService.generateToken({
                userId: defaultUser.id,
                email: defaultUser.email,
                plan: defaultUser.plan,
                isAdmin: defaultUser.isAdmin
            });
            // Update session with authorization
            session.authorized = true;
            session.token = token;
            session.userId = defaultUser.id;
            appSessions.set(sessionId, session);
            res.json({
                success: true,
                message: 'Authorization successful'
            });
        }
    }
    catch (error) {
        logger_1.logger.error('App authorization error', error);
        res.status(500).json({ error: 'Authorization failed' });
    }
});
// App version check endpoint
router.get('/app/version-check', async (req, res) => {
    try {
        const currentVersion = req.query.current;
        // Current app version info - easily updatable
        const latestVersion = "2.2.0";
        const minimumVersion = "2.0.0";
        const downloadUrl = "https://asanabridge.com/api/auth/app/download/latest";
        const fileSize = 25000000; // ~25MB
        // Validate current version format if provided
        if (currentVersion && !/^\d+\.\d+\.\d+$/.test(currentVersion)) {
            return res.status(400).json({ error: 'Invalid version format' });
        }
        // Compare versions (simple string comparison for semantic versioning)
        const needsUpdate = currentVersion ? isVersionLower(currentVersion, latestVersion) : true;
        const isSupported = currentVersion ? !isVersionLower(currentVersion, minimumVersion) : false;
        res.json({
            latestVersion,
            minimumVersion,
            downloadUrl,
            needsUpdate,
            isSupported,
            releaseNotes: "Direct in-app login, persistent authentication, and simplified first-run experience",
            critical: !isSupported, // Force update if below minimum version
            releaseDate: "2025-10-07",
            fileSize,
            changelog: [
                "� Direct in-app login - no more browser required!",
                "✅ Persistent authentication - stay logged in between app restarts",
                "🚀 Smart first-run experience - login window appears immediately",
                "� Enhanced token persistence and error handling"
            ]
        });
    }
    catch (error) {
        logger_1.logger.error('Version check error', error);
        res.status(500).json({ error: 'Version check failed' });
    }
});
// App download endpoint
router.get('/app/download/latest', async (req, res) => {
    try {
        const userAgent = req.get('User-Agent') || 'unknown';
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        // Log download analytics
        logger_1.logger.info('App download requested', {
            ip: clientIP,
            userAgent,
            version: '2.2.0',
            timestamp: new Date().toISOString()
        });
        // Serve the actual DMG file from public/downloads
        const path = require('path');
        const downloadPath = path.join(__dirname, '../../public/downloads/AsanaBridge-2.2.0.dmg');
        // Check if file exists
        const fs = require('fs');
        if (!fs.existsSync(downloadPath)) {
            logger_1.logger.error('DMG file not found', { downloadPath });
            return res.status(404).json({ error: 'Download file not found' });
        }
        // Get file stats for Content-Length
        const stats = fs.statSync(downloadPath);
        const fileSize = stats.size;
        // Set appropriate headers for file download
        res.setHeader('Content-Type', 'application/x-apple-diskimage');
        res.setHeader('Content-Disposition', 'attachment; filename="AsanaBridge-2.2.0.dmg"');
        res.setHeader('Content-Length', fileSize.toString());
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        // Stream the file
        res.sendFile(downloadPath);
    }
    catch (error) {
        logger_1.logger.error('App download error', error);
        res.status(500).json({ error: 'Download failed' });
    }
});
// Update changelog endpoint
router.get('/app/changelog/:version?', async (req, res) => {
    try {
        const version = req.params.version || 'latest';
        // Version changelog database (in production, store in database)
        const changelogs = {
            '2.2.0': {
                version: '2.2.0',
                releaseDate: '2025-10-07',
                critical: false,
                features: [
                    '🔐 Direct in-app login - no more browser required!',
                    '✅ Persistent authentication - stay logged in between app restarts',
                    '🚀 Smart first-run experience - login window appears immediately after install',
                    '💾 Enhanced token persistence with immediate saving to disk',
                    '🛡️ Improved app termination handling to preserve login state'
                ],
                bugFixes: [
                    'Fixed browser-based authentication issues',
                    'Resolved token persistence on force-quit',
                    'Improved first-time user experience'
                ],
                technical: [
                    'Added applicationWillTerminate delegate for graceful shutdown',
                    'Implemented UserDefaults.synchronize() for immediate data persistence',
                    'Enhanced handleFirstRun() logic for better user onboarding'
                ]
            },
            '2.1.0': {
                version: '2.1.0',
                releaseDate: '2025-10-06',
                critical: false,
                features: [
                    '🔧 Fixed menu bar icon visibility issues',
                    '✅ Improved authentication reliability',
                    '🚀 Added automatic update checking',
                    '🔐 Enhanced security and error handling',
                    '📱 Better Alt+Tab app switching support'
                ],
                bugFixes: [
                    'Fixed "ag" text appearing in menu bar',
                    'Resolved UserNotifications bundle crashes',
                    'Improved session management reliability'
                ],
                technical: [
                    'Updated to latest Swift APIs',
                    'Modernized UserNotifications framework',
                    'Enhanced error logging and debugging'
                ]
            },
            '2.0.0': {
                version: '2.0.0',
                releaseDate: '2025-09-30',
                critical: false,
                features: [
                    '🔄 Complete authentication system overhaul',
                    '🌐 Browser-based OAuth flow',
                    '⚡ Improved performance and reliability'
                ]
            }
        };
        const changelog = version === 'latest' ? changelogs['2.2.0'] : changelogs[version];
        if (!changelog) {
            return res.status(404).json({ error: 'Version not found' });
        }
        res.json(changelog);
    }
    catch (error) {
        logger_1.logger.error('Changelog fetch error', error);
        res.status(500).json({ error: 'Failed to fetch changelog' });
    }
});
// Direct app login endpoint (no browser required)
router.post('/app-login-direct', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        // Find user by email
        const user = await database_1.prisma.user.findUnique({
            where: { email }
        });
        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Check password
        const isValidPassword = await auth_1.AuthService.verifyPassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Generate JWT token
        const token = auth_1.AuthService.generateToken({
            userId: user.id,
            email: user.email,
            plan: user.plan,
            isAdmin: user.isAdmin
        });
        logger_1.logger.info('Direct app login successful', { userId: user.id, email: user.email });
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                plan: user.plan
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
        }
        logger_1.logger.error('Direct app login error', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
// Debug endpoint to reset rate limits (remove in production)
router.post('/debug/reset-rate-limit', async (req, res) => {
    try {
        const { ip } = req.body;
        if (ip) {
            sessionAttempts.delete(ip);
            res.json({ message: `Rate limit reset for IP: ${ip}` });
        }
        else {
            // Reset all rate limits
            sessionAttempts.clear();
            res.json({ message: 'All rate limits reset' });
        }
    }
    catch (error) {
        logger_1.logger.error('Rate limit reset error', error);
        res.status(500).json({ error: 'Failed to reset rate limit' });
    }
});
// Helper function to compare semantic versions
function isVersionLower(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1Part = v1Parts[i] || 0;
        const v2Part = v2Parts[i] || 0;
        if (v1Part < v2Part)
            return true;
        if (v1Part > v2Part)
            return false;
    }
    return false; // Versions are equal
}
exports.default = router;
