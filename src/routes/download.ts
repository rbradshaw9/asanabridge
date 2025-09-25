import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthenticatedRequest } from '../services/auth';

const router = Router();

// Download agent for authenticated users
router.get('/agent', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  
  // Determine user's platform (for now, assume macOS)
  const platform = 'macos';
  const arch = 'universal'; // We'll build universal binaries
  
  const dmgPath = path.join(__dirname, '../../omnifocus-agent/build/AsanaBridge-Installer.dmg');
  
  if (!fs.existsSync(dmgPath)) {
    return res.status(404).json({ 
      error: 'Agent download not available yet',
      message: 'The OmniFocus agent installer is being prepared. Please try again shortly.'
    });
  }
  
  // Set headers for download
  res.setHeader('Content-Disposition', 'attachment; filename="AsanaBridge-Installer.dmg"');
  res.setHeader('Content-Type', 'application/x-apple-diskimage');
  
  // Send the DMG file
  res.sendFile(dmgPath);
});

// Get download instructions
router.get('/instructions', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  
  res.json({
    instructions: [
      '1. Download the AsanaBridge installer (DMG file)',
      '2. Double-click the DMG to open it',
      '3. Drag AsanaBridge to your Applications folder',
      '4. Open AsanaBridge from Applications',
      '5. If macOS shows a security warning, go to System Preferences > Security & Privacy and click "Open Anyway"',
      '6. Copy your Agent Key from the dashboard',
      '7. Paste the key when AsanaBridge asks for it',
      '8. Grant permissions when macOS asks for OmniFocus access',
      '9. AsanaBridge will start syncing your tasks automatically!'
    ],
    apiEndpoint: process.env.NODE_ENV === 'production' ? 'https://asanabridge.com/api' : 'http://localhost:3000/api',
    userId: userId,
    setupUrl: `/agent/setup?userId=${userId}`
  });
});

// Agent setup page (returns HTML for easy setup)
router.get('/setup', (req: Request, res: Response) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }
  
  const setupHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>AsanaBridge Agent Setup</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .code { background: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; }
        .step { margin: 20px 0; padding: 15px; border-left: 3px solid #007AFF; background: #f8f9fa; }
    </style>
</head>
<body>
    <h1>🚀 AsanaBridge OmniFocus Agent Setup</h1>
    
    <div class="step">
        <h3>Step 1: Download & Install</h3>
        <p>Download the agent and move it to a convenient location like your Desktop.</p>
    </div>
    
    <div class="step">
        <h3>Step 2: Make Executable</h3>
        <p>Open Terminal and run:</p>
        <div class="code">chmod +x ./AsanaBridge-OmniFocus-Agent</div>
    </div>
    
    <div class="step">
        <h3>Step 3: Configure</h3>
        <p>Create a configuration file with your credentials:</p>
        <div class="code">
ASANABRIDGE_API_URL=${process.env.NODE_ENV === 'production' ? 'https://asanabridge.com/api' : 'http://localhost:3000/api'}<br>
ASANABRIDGE_USER_ID=${userId}<br>
SYNC_INTERVAL=*/5 * * * *
        </div>
        <p>Save this as <code>.env</code> in the same folder as the agent.</p>
    </div>
    
    <div class="step">  
        <h3>Step 4: Run</h3>
        <p>Start the agent:</p>
        <div class="code">./AsanaBridge-OmniFocus-Agent</div>
        <p>The agent will start syncing your OmniFocus tasks with Asana!</p>
    </div>
    
    <p><strong>Need help?</strong> Email support@asanabridge.com</p>
</body>
</html>
  `;
  
  res.send(setupHtml);
});

export default router;