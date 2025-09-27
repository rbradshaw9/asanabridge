// Login and authorization page for macOS app
export default async function handler(req: any, res: any) {
  const { session } = req.query;
  
  if (!session) {
    return res.status(400).send('Missing session parameter');
  }
  
  if (req.method === 'POST') {
    // Handle authorization
    const { action, email, password } = req.body;
    
    if (action === 'authorize') {
      // Mark session as authorized (simulate user approval)
      if ((global as any).authSessions?.has(session)) {
        const authSession = (global as any).authSessions.get(session);
        authSession.authorized = true;
        authSession.userId = 'demo-user-id';
        authSession.token = generateToken();
        (global as any).authSessions.set(session, authSession);
        
        return res.json({ success: true });
      }
      
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (action === 'login') {
      // Simple demo login (in production, validate against real user database)
      if (email && password) {
        return res.json({ success: true, loggedIn: true });
      }
      
      return res.status(400).json({ error: 'Invalid credentials' });
    }
  }
  
  // Show login/authorization page
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>AsanaBridge - Connect App</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
        max-width: 500px; 
        margin: 50px auto; 
        padding: 20px; 
        background: #f8f9fa;
      }
      .container {
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        text-align: center;
      }
      .step {
        background: #f1f3f4;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        display: none;
      }
      .step.active { display: block; }
      .button {
        background: #007AFF;
        color: white;
        border: none;
        padding: 16px 32px;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        margin: 10px;
        transition: all 0.3s;
        width: 100%;
      }
      .button:hover { background: #0056CC; transform: translateY(-1px); }
      .button:disabled { background: #ccc; cursor: not-allowed; transform: none; }
      .input {
        width: 100%;
        padding: 12px;
        border: 2px solid #e1e5e9;
        border-radius: 6px;
        font-size: 16px;
        margin: 8px 0;
        box-sizing: border-box;
      }
      .input:focus { border-color: #007AFF; outline: none; }
      h1 { color: #1a1a1a; margin-bottom: 10px; }
      p { color: #666; line-height: 1.5; }
      .success { color: #28a745; font-weight: bold; }
      .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #007AFF;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        display: inline-block;
        margin-right: 10px;
      }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🚀 Connect AsanaBridge</h1>
      <p>Authorize your AsanaBridge macOS app to sync tasks</p>
      
      <!-- Step 1: Login Form -->
      <div id="step-login" class="step active">
        <h3>Sign In to AsanaBridge</h3>
        <form id="loginForm">
          <input type="email" id="email" class="input" placeholder="Email" required>
          <input type="password" id="password" class="input" placeholder="Password" required>
          <button type="submit" class="button">Sign In</button>
        </form>
        <p style="font-size: 14px; color: #999;">
          Demo: Use any email/password combination
        </p>
      </div>
      
      <!-- Step 2: Authorization -->
      <div id="step-authorize" class="step">
        <h3>✅ Authorize AsanaBridge App</h3>
        <p>Your AsanaBridge macOS app is requesting permission to:</p>
        <ul style="text-align: left; color: #666; margin: 20px 0;">
          <li>Sync your Asana tasks to OmniFocus</li>
          <li>Update task completion status</li>
          <li>Run automatic background sync</li>
        </ul>
        <button id="authorizeBtn" class="button">
          Authorize AsanaBridge App
        </button>
        <button onclick="showStep('step-login')" class="button" style="background: #6c757d;">
          Cancel
        </button>
      </div>
      
      <!-- Step 3: Success -->
      <div id="step-success" class="step">
        <h3 class="success">🎉 Authorization Complete!</h3>
        <p>Your AsanaBridge app has been successfully connected.</p>
        <p><strong>You can now:</strong></p>
        <ul style="text-align: left; color: #666;">
          <li>Close this browser tab</li>
          <li>Return to your AsanaBridge app</li>
          <li>Your tasks will start syncing automatically!</li>
        </ul>
        <div style="margin: 30px 0;">
          <div class="spinner"></div>
          Notifying your app...
        </div>
      </div>
    </div>
    
    <script>
      let currentSession = '${session}';
      
      function showStep(stepId) {
        document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
        document.getElementById(stepId).classList.add('active');
      }
      
      // Handle login
      document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
          const response = await fetch(window.location.href, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', email, password })
          });
          
          const data = await response.json();
          
          if (data.success) {
            showStep('step-authorize');
          } else {
            alert('Login failed. Please try again.');
          }
        } catch (error) {
          alert('Login error. Please try again.');
        }
      });
      
      // Handle authorization
      document.getElementById('authorizeBtn').addEventListener('click', async () => {
        try {
          const response = await fetch(window.location.href, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'authorize' })
          });
          
          const data = await response.json();
          
          if (data.success) {
            showStep('step-success');
            
            // Auto-close after 5 seconds
            setTimeout(() => {
              window.close();
            }, 5000);
          } else {
            alert('Authorization failed. Please try again.');
          }
        } catch (error) {
          alert('Authorization error. Please try again.');
        }
      });
    </script>
  </body>
  </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  return res.send(html);
}

function generateToken(): string {
  return 'demo_token_' + Math.random().toString(36).substr(2, 32);
}