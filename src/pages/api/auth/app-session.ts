// Simple polling-based authentication for macOS app
export default async function handler(req: any, res: any) {
  const { method } = req;
  
  if (method === 'POST') {
    // Create new auth session
    const sessionId = generateSessionId();
    
    // Store session (in production, use Redis or database)
    // For now, we'll use a simple in-memory store
    if (!(global as any).authSessions) {
      (global as any).authSessions = new Map();
    }
    
    (global as any).authSessions.set(sessionId, {
      id: sessionId,
      authorized: false,
      userId: null,
      token: null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
    
    return res.json({ 
      sessionId,
      authUrl: `${getBaseUrl(req)}/auth/app-login?session=${sessionId}`
    });
    
  } else if (method === 'GET') {
    // Check auth status
    const { session } = req.query;
    
    if (!session) {
      return res.status(400).json({ error: 'Session ID required' });
    }
    
    const authSession = (global as any).authSessions?.get(session);
    
    if (!authSession) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    // Check if expired
    if (new Date() > authSession.expiresAt) {
      (global as any).authSessions.delete(session);
      return res.status(404).json({ error: 'Session expired' });
    }
    
    return res.json({
      authorized: authSession.authorized,
      token: authSession.token,
      userId: authSession.userId
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

function generateSessionId(): string {
  return Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
}

function getBaseUrl(req: any): string {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  return `${protocol}://${host}`;
}